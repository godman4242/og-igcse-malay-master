const cache = new Map();

export async function translateWord(word, from = 'ms', to = 'en') {
  const key = `${word}:${from}:${to}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(word)}`;
    const res = await fetch(url);
    const data = await res.json();
    const text = data?.[0]?.map(s => s[0]).join('') || word;
    const result = { text, source: 'Google' };
    cache.set(key, result);
    return result;
  } catch {
    return { text: word, source: 'error' };
  }
}

export async function translateSentence(text, from = 'ms', to = 'en') {
  return translateWord(text, from, to);
}

export function getFromCache(word) {
  return cache.get(`${word}:ms:en`);
}
