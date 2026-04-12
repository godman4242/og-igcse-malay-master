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
  return 'speechSynthesis' in window;
}
