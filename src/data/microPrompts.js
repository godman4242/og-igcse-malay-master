const TEMPLATES = {
  writing: [
    (w) => `Tulis satu ayat lengkap menggunakan perkataan "${w}".`,
    (w) => `Bina ayat yang menerangkan situasi harian dengan perkataan "${w}".`,
    (w) => `Gunakan "${w}" dalam ayat majmuk yang menunjukkan sebab atau akibat.`,
    (w) => `Write one sentence that uses "${w}" naturally in context.`,
  ],
  speaking: [
    (w) => `Cakap satu ayat menggunakan "${w}" — sebut dengan jelas.`,
    (w) => `Beri contoh lisan tentang "${w}" dalam kehidupan seharian.`,
    (w) => `Say a short spoken sentence using the word "${w}".`,
  ],
}

export function getRandomPrompt(category, headword) {
  const list = TEMPLATES[category] || TEMPLATES.writing
  const tmpl = list[Math.floor(Math.random() * list.length)]
  return tmpl(headword)
}
