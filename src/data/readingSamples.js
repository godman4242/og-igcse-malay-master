// readingSamples.js — built-in passages for the PDF reader's first-visit
// "Try a sample" affordance, so a blank-page student can explore the reveal-
// gated reader (tap-to-translate, Select-mode deck building, sentence reveal)
// WITHOUT first finding and importing their own PDF/photo/recording.
//
// CONTENT PROVENANCE (axis-1, no confident-wrong): both passages are reused
// VERBATIM from the app's already-shipped, exam-vetted `comprehensionPassages.js`
// (Malay 'gotong-royong', English 'first-day') — original IGCSE-format prose,
// NOT copyrighted past-papers. Reusing vetted content (vs authoring fresh Malay)
// keeps the sample free of new, unverified language.
//
// Shape: each sample exposes `pages` in the EXACT form the reader consumes —
// `{ pageNum, paragraphs: [string] }` (PDFReader.jsx tokenizes the paragraph
// strings itself via splitParagraph). The reader auto-detects the document
// language from the text (detectDocLanguage), so no per-sample lang flag is
// needed for rendering; `lang` here only selects which passage to load.

const MALAY_TEXT = `Pada hari Sabtu yang lalu, penduduk Kampung Seri Mawar telah mengadakan aktiviti gotong-royong. Aktiviti ini diadakan untuk membersihkan kawasan kampung sebelum musim hujan tiba. Seramai lima puluh orang penduduk telah menyertai aktiviti tersebut.

Ketua kampung, Encik Ahmad, telah memulakan ucapan pada pukul lapan pagi. Beliau menggalakkan semua penduduk supaya bekerjasama untuk menjaga kebersihan kampung. Selepas itu, penduduk dibahagikan kepada beberapa kumpulan. Ada yang membersihkan longkang, ada yang memotong rumput, dan ada yang mengutip sampah sarap.

Menjelang tengah hari, kawasan kampung sudah kelihatan bersih dan kemas. Semua penduduk berasa gembira kerana usaha mereka berjaya. Pihak MPKK juga menyediakan makanan dan minuman untuk semua peserta. Semangat kerjasama dalam kalangan penduduk amat membanggakan.`

const ENGLISH_TEXT = `Aisha clutched the strap of her bag a little tighter as she stepped through the gates. The school looked larger than she remembered from the open day, and the corridors echoed with voices she did not know. Somewhere along the line, the cheerful map her mother had printed for her had folded itself into a hopeless square in her pocket.

She found Room 7B by accident. The door was already half-open, and inside, twenty-eight strangers were busy pretending not to look at her. Aisha hovered in the doorway, suddenly aware of how loud her heart sounded. The teacher waved her in with a tired smile and pointed at the only empty seat — by the window, beside a girl with a mountain of textbooks and headphones in.

"You can sit there," said the girl, sliding the books across without looking up. Aisha sat. The girl reached over, paused her music, and offered half a granola bar. "I'm Mei. The maths teacher pretends to take attendance, but he doesn't actually check, so don't worry if your name's not on the list yet."

Aisha laughed, more out of relief than because anything was funny. The granola bar was stale and slightly squashed. It was, she decided, the best welcome she had received all week.`

// Split a multi-paragraph passage into the reader's paragraph-string array:
// trim, drop blank lines, one entry per \n\n block.
function toPages(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
  return [{ pageNum: 1, paragraphs }]
}

export const READING_SAMPLES = {
  ms: { id: 'sample-gotong-royong', title: 'Gotong-Royong di Kampung', lang: 'ms', pages: toPages(MALAY_TEXT) },
  en: { id: 'sample-empty-seat', title: 'The Empty Seat', lang: 'en', pages: toPages(ENGLISH_TEXT) },
}

// Returns the reader-ready sample for the given material language ('ms' | 'en').
// Anything else (or missing) falls back to Malay — the app's primary path.
export function getReadingSample(lang) {
  return READING_SAMPLES[lang === 'en' ? 'en' : 'ms']
}

export default READING_SAMPLES
