// Smart Session micro-prompts — bilingual production scaffolding (v34).
//
// ORIGINALLY (pre-v34, Issue 4b) the app had no English vocabulary, so the Smart
// Session was a Malay-vocab engine and every prompt had to be Malay — a stray
// English template fired by getRandomPrompt would surface an English instruction
// mid-Malay-session. v34 shipped True English study mode (a per-card `lang` tag +
// a global `studyLang`), so the Smart Session now scopes to the active language
// (useInterleavedSession → cardsForLang). The invariant became PER-LANGUAGE
// PURITY: a Malay session shows only Malay prompts, an English session shows only
// English prompts. The same immersion rationale that keeps the Malay set all-Malay
// keeps the English set all-English — and it matches the rest of the English study
// modes (TypeMode/QuizMode/ProduceMode), which already address an English card in
// English. `lang` defaults to 'ms', so the Malay path is byte-identical to before.
export const TEMPLATES = {
  writing: [
    (w) => `Tulis satu ayat lengkap menggunakan perkataan "${w}".`,
    (w) => `Bina ayat yang menerangkan situasi harian dengan perkataan "${w}".`,
    (w) => `Gunakan "${w}" dalam ayat majmuk yang menunjukkan sebab atau akibat.`,
  ],
  speaking: [
    (w) => `Cakap satu ayat menggunakan "${w}" — sebut dengan jelas.`,
    (w) => `Beri contoh lisan tentang "${w}" dalam kehidupan seharian.`,
  ],
}

// English equivalents (v34) — used when studyLang === 'en'. Mirror the Malay
// prompts' intent (full sentence / everyday situation / cause–effect; speak a
// sentence / spoken everyday example), in natural IGCSE 0510 English.
export const TEMPLATES_EN = {
  writing: [
    (w) => `Write one complete sentence using the word "${w}".`,
    (w) => `Build a sentence that describes an everyday situation using "${w}".`,
    (w) => `Use "${w}" in a complex sentence that shows cause or effect.`,
  ],
  speaking: [
    (w) => `Say one sentence using "${w}" — speak clearly.`,
    (w) => `Give a spoken example about "${w}" from everyday life.`,
  ],
}

const SETS = { ms: TEMPLATES, en: TEMPLATES_EN }

export function getRandomPrompt(category, headword, lang = 'ms') {
  const set = SETS[lang] || TEMPLATES
  const list = set[category] || set.writing
  const tmpl = list[Math.floor(Math.random() * list.length)]
  return tmpl(headword)
}
