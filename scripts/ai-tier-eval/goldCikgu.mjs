// GOLD SET — Cikgu (Malay tutor) answer eval.
//
// 12 IGCSE-Malay questions, each with a keyFacts[] checklist = the specific,
// independently-checkable correct facts a GOOD answer must contain. keyFacts are
// pedagogical ground truth (what is correct), NOT "what the knowledge base says"
// — the KB is the contestant being measured, so it can't define the answer key.
//
// Coverage spread (the free tier's main weakness is breadth): the FREE detector
// searchKnowledge() NEVER returns "no match" — it always surfaces SOME canned
// entry by fuzzy keyword score, even an irrelevant one. So the failure mode to
// measure is "confidently off-topic", caught by low fact-recall + wrong-fact rate.
// `coverageHint` is the author's guess; the harness records the real top-match
// score per question so we can correlate score with fact-recall.
//
// SCORING (objective): fact-recall = keyFacts present / total; wrong-fact rate =
// incorrect claims / total claims. The LLM judge ONLY checks checklist presence
// + flags wrong claims against this key — it never renders a free-form opinion.

export const CIKGU_GOLD = [
  {
    id: 'men-p',
    coverageHint: 'in',
    question: 'How does the meN- prefix change a verb whose root starts with the letter "p"? Give an example.',
    keyFacts: [
      'The initial "p" of the root is dropped (nasal assimilation).',
      'meN- takes the form "mem-" before p.',
      'A correct worked example, e.g. pukul → memukul (or pakai → memakai, pilih → memilih).',
      'The same elision applies to other soft consonants (t, k, s).',
    ],
  },
  {
    id: 'ber-allomorph',
    coverageHint: 'partial',
    question: 'When does the prefix ber- change form to "be-" or "bel-" instead of "ber-"? Give examples.',
    keyFacts: [
      'ber- → be- when the root begins with "r" (the r is dropped to avoid rr), e.g. ber + renang → berenang.',
      'ber- → be- also when the first syllable of the root ends in -er, e.g. ber + kerja → bekerja.',
      'bel- is an irregular form used with the root "ajar" → belajar.',
      'Otherwise the default form ber- is kept, e.g. ber + lari → berlari.',
    ],
  },
  {
    id: 'di-passive',
    coverageHint: 'in',
    question: 'In a Malay passive sentence using di-, how do you show WHO performed the action? Give an example.',
    keyFacts: [
      'Use the preposition "oleh" before the agent (the doer).',
      'The di- prefix attaches to the verb.',
      'A correct example, e.g. "Surat itu ditulis oleh Ali."',
      '"oleh" may be omitted when the agent is clear/unimportant.',
    ],
  },
  {
    id: 'tense-markers',
    coverageHint: 'in',
    question: 'What is the difference between "sudah", "sedang", and "akan"? Use each in a short example.',
    keyFacts: [
      'sudah = a completed/past action ("already").',
      'sedang = an ongoing action in progress ("currently / -ing").',
      'akan = a future action ("will").',
      'A correct example for each, e.g. sudah makan / sedang makan / akan makan.',
    ],
  },
  {
    id: 'dari-daripada',
    coverageHint: 'in',
    question: 'What is the difference between "dari" and "daripada", and when do I use each?',
    keyFacts: [
      '"dari" is used for places, directions, and time (from a place/time).',
      '"daripada" is used for people, things/materials, and comparisons.',
      'Comparison specifically takes "daripada", e.g. "lebih tinggi daripada".',
      'A correct contrasting example, e.g. "dari sekolah" (place) vs "daripada ibu" (person).',
    ],
  },
  {
    id: 'kata-hubung-contrast',
    coverageHint: 'partial',
    question: 'Which connector (kata hubung) should I use to show CONTRAST in a formal essay, and how do I position it in a sentence?',
    keyFacts: [
      'Contrast connectors include walaupun / namun / tetapi / walau bagaimanapun.',
      '"walaupun" introduces a subordinate clause; the main clause follows (walaupun + clause, …).',
      '"namun" / "walau bagaimanapun" begin a NEW sentence (sentence-linking), not a clause-joiner like "tetapi".',
      'A correct example sentence using one of them.',
    ],
  },
  {
    id: 'penjodoh-bilangan',
    coverageHint: 'in',
    question: 'What are penjodoh bilangan, and which one do I use for people, for animals, and for flat/sheet objects?',
    keyFacts: [
      'They are classifiers placed between a number and a noun.',
      'People → "orang", e.g. tiga orang murid.',
      'Animals → "ekor", e.g. dua ekor kucing.',
      'Flat/sheet objects → "helai", e.g. sehelai kertas.',
    ],
  },
  {
    id: 'ke-an',
    coverageHint: 'partial',
    question: 'What does the circumfix ke-…-an do to a word? Give two examples.',
    keyFacts: [
      'It forms abstract nouns from adjectives/roots.',
      'Example: adil → keadilan (justice).',
      'A second example, e.g. bersih → kebersihan (cleanliness) or selamat → keselamatan.',
      'It can also form "accidental/affected" forms, e.g. hujan → kehujanan (caught in the rain).',
    ],
  },
  {
    id: 'peribahasa-aur',
    // RECLASSIFIED out→in 2026-06-14: the peribahasa BANK now covers this proverb.
    coverageHint: 'in',
    question: 'What does the peribahasa "bagai aur dengan tebing" mean, and for which essay themes would I use it?',
    keyFacts: [
      'It means mutual help / interdependence / close cooperation between two parties.',
      'Literal image: like the bamboo (aur) and the riverbank (tebing) supporting each other.',
      'Use it for themes of unity, cooperation, teamwork, or mutual support.',
      'It fits topics such as community spirit, family, or working together.',
    ],
  },
  {
    id: 'paper3-tips',
    coverageHint: 'partial',
    question: 'In the IGCSE Paper 3 (speaking) roleplay, give two concrete techniques to score a higher band.',
    keyFacts: [
      'Use a range of connectors / penanda wacana, not just "dan" / "lepas tu".',
      'Use varied and more formal vocabulary instead of basic high-frequency words.',
      'Give extended answers — elaborate with reasons/examples rather than one-word replies.',
      'Match the register (formal vs informal) to the roleplay situation.',
    ],
  },
  {
    id: 'rencana-structure',
    // RECLASSIFIED out→in 2026-06-14: a dedicated rencana-structure entry now exists.
    coverageHint: 'in',
    question: 'How should I structure an IGCSE Malay "rencana" (article) for Paper 2, paragraph by paragraph?',
    keyFacts: [
      'A title plus an introduction (pendahuluan) that states the issue/topic.',
      'Body paragraphs (isi), each with ONE main idea + elaboration (huraian) + an example.',
      'Use penanda wacana to link ideas and paragraphs cohesively.',
      'A conclusion (kesimpulan/penutup) that summarises and gives a stand or hope.',
    ],
  },
  {
    id: 'vocab-upgrade',
    // RECLASSIFIED out→in 2026-06-14: a "Formal Word Upgrades" vocab entry now exists.
    coverageHint: 'in',
    question: 'Give me three more formal alternatives to the common word "banyak" for an IGCSE essay, each with an example.',
    keyFacts: [
      'Three genuinely formal alternatives, e.g. pelbagai / berbagai-bagai / sebilangan besar / segala / banyaknya.',
      'Each alternative is paired with a correct example phrase or sentence.',
      'The suggestions are register-appropriate for formal writing (not slang).',
      'The meanings are accurate (e.g. "pelbagai" = various, "sebilangan besar" = a large number of).',
    ],
  },

  // ── FRESH out-of-scope (added 2026-06-14 when peribahasa/rencana/vocab moved
  // out→in) — genuinely beyond the free KB's coverage, so the confidence gate
  // SHOULD still hedge. Keeps the [Cikgu · FREE confidence gate] 'out' bucket
  // non-empty at 0 confident, the safety-net metric. These are independent ground
  // truth (what a correct answer contains), NOT what the KB happens to say.
  {
    id: 'peribahasa-pagar',
    coverageHint: 'out',
    question: 'What does the peribahasa "harapkan pagar, pagar makan padi" mean, and for which essay theme is it suitable?',
    keyFacts: [
      'It means being betrayed by the very person who was trusted to protect/guard something.',
      'Literal image: you relied on the fence (pagar) to protect the rice crop, but the fence itself ate the padi.',
      'Use it for themes of betrayal, broken trust, or abuse of responsibility.',
      'It fits topics such as corruption, disappointment, or being let down by someone close.',
    ],
  },
  {
    id: 'kata-nama-am-khas',
    // RECLASSIFIED out→in 2026-06-14: a golongan-kata (word classes) entry now covers this.
    coverageHint: 'in',
    question: 'What is the difference between "kata nama am" and "kata nama khas"? Give an example of each.',
    keyFacts: [
      'kata nama am = a common/general noun (refers to things in general).',
      'kata nama khas = a proper noun (a specific, particular name).',
      'kata nama khas begins with a capital letter, e.g. Ali, Kuala Lumpur, Sungai Pahang.',
      'A correct contrasting example, e.g. "budak"/"bandar" (am) vs "Ali"/"Kuala Lumpur" (khas).',
    ],
  },
  {
    id: 'surat-rasmi-format',
    coverageHint: 'out',
    question: 'How do I structure a formal letter (surat kiriman rasmi) for IGCSE, section by section?',
    keyFacts: [
      "The sender's address goes at the top, with the recipient's address/title below a dividing line.",
      'Include the date, a subject line (perkara/tajuk surat), and a salutation (e.g. "Tuan").',
      'Body: an opening that states the purpose, content paragraphs, then a closing paragraph.',
      'A formal sign-off, e.g. "Yang benar," followed by the writer\'s name (and role).',
    ],
  },
  {
    id: 'e-taling-pepet',
    // FRESH out-of-scope (added 2026-06-14 when kata-nama-am-khas moved out→in) — a
    // phonology topic the free KB does not cover, so the gate should still hedge.
    coverageHint: 'out',
    question: 'What is the difference between "e taling" and "e pepet" in Malay pronunciation?',
    keyFacts: [
      'e taling is the open/front "e" sound, as in "meja", "sate", "leher".',
      'e pepet is the schwa (a short, neutral "e"), as in "emak", "beli", "kereta".',
      'They are written with the same letter "e" but pronounced differently.',
      'Mispronouncing them can change meaning, e.g. "perang" (war, e taling) vs "perang" (brown, e pepet).',
    ],
  },
]
