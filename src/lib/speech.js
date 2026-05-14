export function speak(text, lang = 'ms-MY', rate = 0.85, options = {}) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  if (options.onStart) u.onstart = options.onStart;
  if (options.onEnd) u.onend = options.onEnd;
  if (options.onError) u.onerror = options.onError;
  speechSynthesis.speak(u);
}

// FSRS rating ints (mirrors ts-fsrs Rating: Again=1, Hard=2, Good=3, Easy=4).
// Duplicated here as plain ints so the parser stays a leaf module — no React /
// ts-fsrs import chain pulled into pure-function tests.
const RATING_KEYWORD_MAP = { again: 1, hard: 2, good: 3, easy: 4 };

// Pure: scans an ASR transcript for one of the four FSRS keywords and
// returns the FSRS rating int (1-4), or null. Whole-word match,
// case-insensitive, punctuation-safe.
//
// Priority when multiple keywords are spoken: again > hard > good > easy.
// Rationale: when a student self-corrects ("easy, no wait — again"), we
// take the harder grade so spacing stays conservative. Same logic if the
// recogniser hallucinates a softer keyword on top of a real harder one.
export function parseRatingKeyword(transcript) {
  if (typeof transcript !== 'string' || !transcript) return null;
  const tokens = transcript.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (!tokens.length) return null;
  for (const kw of ['again', 'hard', 'good', 'easy']) {
    if (tokens.includes(kw)) return RATING_KEYWORD_MAP[kw];
  }
  return null;
}

// Continuous keyword spotter for self-rating flashcards. Listens in `lang`
// (default en-US — the rating words are English regardless of the card's
// language), emits the first matched FSRS rating via `onMatch(rating, transcript)`,
// then auto-stops. Returns `{ stop }` for external teardown.
//
// Robustness notes:
// - Uses `continuous=true` + `interimResults=true` so we catch a keyword
//   as soon as the ASR partial fires, not only after a final endpoint.
// - Auto-restarts on benign `onend` (Chromium often ends silently after
//   ~60s or a pause). Real errors bubble through `onError`.
// - `no-speech` / `aborted` errors are not propagated — they're expected
//   when a student pauses, and we just keep listening.
export function startKeywordSpotter({ onMatch, onError, lang = 'en-US' } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (onError) onError(new Error('Speech recognition not supported'));
    return { stop: () => {} };
  }
  const recognition = new SR();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let stopped = false;

  recognition.onresult = (e) => {
    if (stopped) return;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      const rating = parseRatingKeyword(transcript);
      if (rating) {
        stopped = true;
        try { recognition.stop() } catch { /* ignore */ }
        if (onMatch) onMatch(rating, transcript);
        return;
      }
    }
  };

  recognition.onerror = (e) => {
    if (stopped) return;
    if (e?.error === 'no-speech' || e?.error === 'aborted') return;
    if (onError) onError(e);
  };

  recognition.onend = () => {
    if (stopped) return;
    try { recognition.start() } catch { /* already running, ignore */ }
  };

  try {
    recognition.start();
  } catch (err) {
    if (onError) onError(err);
    return { stop: () => {} };
  }

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      try { recognition.stop() } catch { /* ignore */ }
    },
  };
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
