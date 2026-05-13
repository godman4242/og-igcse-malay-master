export function speak(text, lang = 'ms-MY', rate = 0.85) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function startRecognition(lang = 'ms-MY') {
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { reject(new Error('Speech recognition not supported')); return; }
    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognition.onresult = (e) => {
      const results = [];
      for (let i = 0; i < e.results[0].length; i++) {
        results.push({
          transcript: e.results[0][i].transcript.toLowerCase().trim(),
          confidence: e.results[0][i].confidence,
        });
      }
      resolve(results);
    };
    recognition.onerror = (e) => reject(e);
    recognition.onend = () => {};
    recognition.start();
  });
}

export function hasSpeechRecognition() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function hasSpeechSynthesis() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// Pure: returns [{ word, start, end, index }] for the same word stream the
// Comprehension renderer produces via `text.split(/\s+/)`. Using the same
// tokenisation in both render and boundary-mapping is what keeps the
// highlight aligned with the visible word boundaries.
export function tokenizeWithOffsets(text) {
  if (typeof text !== 'string' || !text) return [];
  const tokens = [];
  const re = /\S+/g;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ word: m[0], start: m.index, end: m.index + m[0].length, index: i });
    i++;
  }
  return tokens;
}

// Maps a SpeechSynthesis `charIndex` back to a word index by linear scan.
// Linear is fine — passages are <500 words and we only look up once per
// boundary event (a few per second).
function charIndexToWordIndex(tokens, charIndex) {
  if (!tokens.length) return -1;
  for (let i = 0; i < tokens.length; i++) {
    if (charIndex < tokens[i].end) return i;
  }
  return tokens.length - 1;
}

// Speak `text` and emit `onWordChange(wordIndex)` as each word is reached.
// Three-tier fidelity ladder, auto-selected per platform:
//   1. Real word boundaries (Chromium / good voices)
//   2. Sentence boundaries (Safari / non-English voices — coarser)
//   3. Time-estimated fallback (no boundary events arrive within
//      BOUNDARY_WATCHDOG_MS of onstart)
//
// Returns { cancel } so the caller can stop early; cancel() is safe to
// call multiple times.
const BOUNDARY_WATCHDOG_MS = 600;
const DEFAULT_WPM_AT_RATE_1 = 160;

export function speakWithBoundaries({
  text,
  lang = 'ms-MY',
  rate = 0.85,
  onWordChange,
  onStart,
  onEnd,
  onError,
  wordsPerMinute,
}) {
  if (!hasSpeechSynthesis() || !text) {
    if (onError) onError(new Error('Speech synthesis not available'));
    return { cancel: () => {} };
  }

  const tokens = tokenizeWithOffsets(text);
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;

  let cancelled = false;
  let receivedBoundary = false;
  let watchdogId = null;
  let fallbackId = null;
  let lastWordIdx = -1;

  const cleanup = () => {
    if (watchdogId) { clearTimeout(watchdogId); watchdogId = null; }
    if (fallbackId) { clearTimeout(fallbackId); fallbackId = null; }
  };

  const emit = (idx) => {
    if (cancelled) return;
    if (idx === lastWordIdx) return;
    if (idx < 0 || idx >= tokens.length) return;
    lastWordIdx = idx;
    if (onWordChange) onWordChange(idx);
  };

  u.onstart = () => {
    if (cancelled) return;
    if (onStart) onStart();
    watchdogId = setTimeout(() => {
      if (cancelled || receivedBoundary) return;
      const baseWpm = wordsPerMinute || DEFAULT_WPM_AT_RATE_1;
      const msPerWord = 60000 / Math.max(40, baseWpm * rate);
      let i = 0;
      const tick = () => {
        if (cancelled || i >= tokens.length) return;
        emit(i);
        i++;
        fallbackId = setTimeout(tick, msPerWord);
      };
      tick();
    }, BOUNDARY_WATCHDOG_MS);
  };

  u.onboundary = (e) => {
    if (cancelled) return;
    receivedBoundary = true;
    if (watchdogId) { clearTimeout(watchdogId); watchdogId = null; }
    // Treat undefined `name` as word — some engines omit it.
    const name = e.name === undefined ? 'word' : e.name;
    if (name === 'word' || name === 'sentence') {
      emit(charIndexToWordIndex(tokens, e.charIndex));
    }
  };

  u.onend = () => {
    if (cancelled) return;
    cleanup();
    if (onEnd) onEnd();
  };

  u.onerror = (e) => {
    if (cancelled) return;
    cleanup();
    if (onError) onError(e);
  };

  window.speechSynthesis.speak(u);

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      cleanup();
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    },
  };
}
