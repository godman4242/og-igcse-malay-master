// Smart Session micro-prompts. KEEP THESE ALL MALAY (Issue 4b): the app has no
// English vocabulary, so the Smart Session is a Malay-vocab engine — a stray
// English template (previously one per list, fired at random by getRandomPrompt)
// would surface an English instruction mid-Malay-session. A true English study
// mode is a separate epic (needs an English vocab corpus + a card language tag).
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

export function getRandomPrompt(category, headword) {
  const list = TEMPLATES[category] || TEMPLATES.writing
  const tmpl = list[Math.floor(Math.random() * list.length)]
  return tmpl(headword)
}
