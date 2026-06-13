// GOLD SET — English writing feedback eval (IGCSE 0500 / 0510).
//
// The English sibling of goldWriting.mjs. 10 synthetic IGCSE-English learner
// essays, each with a HAND-PLANTED, catalogued error list = the ground truth.
// Synthetic + planted (not scraped + annotated) because the eval is only as
// trustworthy as its labels: authoring the essays means we KNOW every error and
// there is zero annotation ambiguity.
//
// DESIGN — construct-relevant items. The English free detector (writingErrors.js)
// is already MUCH richer than the Malay one (confusables, a/an articles, comma
// splices, some subject-verb agreement, preposition collocations), so the gap is
// narrower and lives in specific classes. Each essay deliberately mixes:
//   • regexExpected: true  — an error the FREE detector CAN hit (a curated
//     misspelling, a missing apostrophe, an its/it's/their/there confusable, a
//     "would of", an "everyone do", a caught comma splice).
//   • regexExpected: false — an error it structurally MISSES at baseline:
//     a "he/she + bare verb" agreement slip, an uncountable noun pluralised
//     ("informations"), a preposition-collocation gap ("interested about"),
//     a noun-subject agreement error, a tense shift, a lowercase comma splice,
//     an omitted article.
// The free-vs-BYOK gap lives in the `false` rows — that is the number this eval
// exists to produce.
//
// regexExpected is a PREDICTION; the throwaway runner verifies it empirically by
// running findIssues and recording actual span overlap (it also QA's this gold
// set — an unexpected free finding on the control essay flags a planted typo).
//
// Class coverage (per the brief): subject-verb agreement, articles (a/an/the),
// tense consistency, prepositions, run-ons / comma splices, its/it's &
// confusables, plurals / countability.
//
// `intendedBand` (1–6) is the author's design label.
// category enum: sva | article | tense | preposition | comma-splice |
//                confusable | countability | spelling | word-choice |
//                comparison | verb-form
//   • comparison — double comparative/superlative ("more better"/"most happiest")
//   • verb-form  — do-support + past tense ("didn't went" → "didn't go")
//
// Every `span` MUST be an exact, unique substring of its essay `text`.

export const WRITING_GOLD_EN = [
  // ───────────────────────────── WEAK (band 2–3) ─────────────────────────────
  {
    id: 'e-phones',
    level: 'weak',
    format: 'eng-article',
    intendedBand: 2,
    text: `Nowadays, almost every teenager have a smartphone. Many of them copy informations from the internet into their schoolwork without checking it. My cousin dont know how to tell fake news from the truth. He think that everything online is correct, so he spend hours reading rubbish. He wastes much hours on silly videos every night. We must teach young people to be more careful.`,
    errors: [
      { span: 'teenager have', category: 'sva', correct: 'teenager has', note: 'Determiner-anchored: "every" forces a singular verb ("has") — now caught by the free determiner-agreement rule (was BYOK-only).', regexExpected: false },
      { span: 'informations', category: 'countability', correct: 'information', note: '"Information" is uncountable — no plural.', regexExpected: false },
      { span: 'dont', category: 'spelling', correct: "doesn't", note: 'Missing apostrophe (and should be "doesn\'t" — singular). Free tier catches the apostrophe.', regexExpected: true },
      { span: 'He think', category: 'sva', correct: 'He thinks', note: 'Third-person singular "he" takes "thinks".', regexExpected: false },
      { span: 'he spend', category: 'sva', correct: 'he spends', note: 'Third-person singular "he" takes "spends".', regexExpected: false },
      { span: 'much hours', category: 'countability', correct: 'many hours', note: '"Hours" is a countable plural — use "many", not "much". Now caught by the free much-countable rule (was BYOK-only).', regexExpected: false },
    ],
  },
  {
    id: 'e-library',
    level: 'weak',
    format: 'eng-letter-formal',
    intendedBand: 3,
    text: `Dear Sir, I am writing to complain about the poor condition of the public library in our town. The chairs are broken and the shelves are covered in dust. Last week, I recieve a damaged book that nobody had repaired. The librarian was extremely rude. She refuse to apologise for the mistake. She did not gave me a replacement copy. I would of expected better service from a public institution.`,
    errors: [
      { span: 'recieve', category: 'spelling', correct: 'received', note: 'Misspelling of "receive" (and should be past "received").', regexExpected: true },
      { span: 'She refuse', category: 'sva', correct: 'She refuses', note: 'Third-person singular "she" takes "refuses".', regexExpected: false },
      { span: 'did not gave', category: 'verb-form', correct: 'did not give', note: 'Do-support + past tense — after "did not" use the base form "give". Caught by the free do-support rule.', regexExpected: false },
      { span: 'would of', category: 'confusable', correct: 'would have', note: '"would of" → "would have".', regexExpected: true },
    ],
  },
  {
    id: 'e-uniforms',
    level: 'weak',
    format: 'eng-article',
    intendedBand: 4,
    text: `School uniforms are a topic that many students argue about. Some say that uniforms remove their freedom, while others believe they bring equality. Each pupil have a different view on this matter. In my school, the teachers gives us many homeworks every weekend. My best friend dont like wearing a tie, but she follow the rules anyway. Personally, I think a smart appearance helps us to focus on our studies.`,
    errors: [
      { span: 'pupil have', category: 'sva', correct: 'pupil has', note: 'Determiner-anchored: "each" forces a singular verb ("has"). Caught by the free determiner-agreement rule.', regexExpected: false },
      { span: 'teachers gives', category: 'sva', correct: 'teachers give', note: 'Plural subject "teachers" takes "give". Plural-noun-subject (no determiner) — left to BYOK.', regexExpected: false },
      { span: 'homeworks', category: 'countability', correct: 'homework', note: '"Homework" is uncountable — no plural.', regexExpected: false },
      { span: 'dont', category: 'spelling', correct: "doesn't", note: 'Missing apostrophe ("doesn\'t").', regexExpected: true },
      { span: 'she follow', category: 'sva', correct: 'she follows', note: 'Third-person singular "she" takes "follows".', regexExpected: false },
    ],
  },
  // ───────────────────────────── MID (band 4–5) ─────────────────────────────
  {
    id: 'e-environment',
    level: 'mid',
    format: 'eng-discursive',
    intendedBand: 4,
    text: `Climate change is one of the biggest problem that our planet faces today. Many scientists have warned us, but governments still depend of fossil fuels. People throw plastic into the ocean, this harms the fish and the coral reefs. Sadly, many countries is still ignoring these warnings. We should recycle more and waste less. If everyone do their part, the future will be brighter for the next generation.`,
    errors: [
      { span: 'biggest problem', category: 'countability', correct: 'biggest problems', note: '"One of the biggest" needs a plural noun: "problems". Left to BYOK.', regexExpected: false },
      { span: 'depend of', category: 'preposition', correct: 'depend on', note: '"Depend on", not "depend of".', regexExpected: false },
      { span: 'ocean, this harms', category: 'comma-splice', correct: 'ocean. This harms', note: 'Comma splice with a lowercase subject — the free splice rule only fires on capitalised subjects. Left to BYOK.', regexExpected: false },
      { span: 'countries is', category: 'sva', correct: 'countries are', note: 'Determiner-anchored: "many" forces a plural verb ("are"). Caught by the free determiner-agreement rule.', regexExpected: false },
      { span: 'everyone do', category: 'sva', correct: 'everyone does', note: '"Everyone" takes a singular verb: "does".', regexExpected: true },
    ],
  },
  {
    id: 'e-storm',
    level: 'mid',
    format: 'eng-narrative',
    intendedBand: 5,
    text: `The storm arrived without warning on a quiet afternoon. I had been walking home from school for nearly twenty minutes, I felt the first cold drops of rain. Within seconds, the sky turned black and thunder roared above me. I ran towards a small shelter near the bus stop. Their was an old man already waiting there. At first I didn't knew if he was friendly. He smiled at me kindly and we wait there together until the rain finally stopped.`,
    errors: [
      { span: 'minutes, I felt', category: 'comma-splice', correct: 'minutes. I felt', note: 'Comma splice — two independent clauses joined by a comma.', regexExpected: true },
      { span: 'Their was', category: 'confusable', correct: 'There was', note: '"There was", not "Their was".', regexExpected: true },
      { span: "didn't knew", category: 'verb-form', correct: "didn't know", note: 'Do-support + past tense — after "didn\'t" use the base form "know". Now caught by the free do-support rule (was BYOK-only).', regexExpected: false },
      { span: 'we wait there', category: 'tense', correct: 'we waited there', note: 'Tense shift — present "wait" inside past narration. The tense-shift detector is deliberately disabled (FP risk). Left to BYOK.', regexExpected: false },
    ],
  },
  {
    id: 'e-health',
    level: 'mid',
    format: 'eng-article',
    intendedBand: 4,
    text: `Good health is something that we often take for granted until we lose it. Doctors always advice us to eat well and to exercise regularly. However, many teenagers are interested about junk food rather than fruit and vegetables. They also sleep extremely late because they keep watching there phones in bed. The most healthiest people make exercise a daily habit. If we want to live longer, we must learn to look after our bodies.`,
    errors: [
      { span: 'advice us', category: 'confusable', correct: 'advise us', note: '"Advise" is the verb ("advice" is the noun). The free rule only catches "advice" after to/would/can/should — "always advice" is missed. Left to BYOK.', regexExpected: false },
      { span: 'interested about', category: 'preposition', correct: 'interested in', note: '"Interested in", not "interested about".', regexExpected: false },
      { span: 'there phones', category: 'confusable', correct: 'their phones', note: '"Their phones", not "there phones".', regexExpected: true },
      { span: 'most healthiest', category: 'comparison', correct: 'healthiest', note: 'Double superlative — "healthiest" is already superlative, so "most" is wrong. Caught by the free double-comparative rule.', regexExpected: false },
    ],
  },
  {
    id: 'e-technology',
    level: 'mid',
    format: 'eng-report',
    intendedBand: 5,
    text: `This report examines how technology has changed the way we study. Most students now use laptops and tablets instead of books. The school recently bought new equipments for the computer lab. There are not much computers for everyone to use. Several teachers is unsure about the new system. Technology is definately a useful tool, and the survey show that students learn faster with videos. According with these findings, the school should invest in more devices. Although technology brings many benefits, it cannot replace a dedicated teacher.`,
    errors: [
      { span: 'equipments', category: 'countability', correct: 'equipment', note: '"Equipment" is uncountable — no plural.', regexExpected: false },
      { span: 'much computers', category: 'countability', correct: 'many computers', note: '"Computers" is a countable plural — use "many", not "much". Caught by the free much-countable rule.', regexExpected: false },
      { span: 'teachers is', category: 'sva', correct: 'teachers are', note: 'Determiner-anchored: "several" forces a plural verb ("are"). Caught by the free determiner-agreement rule.', regexExpected: false },
      { span: 'definately', category: 'spelling', correct: 'definitely', note: 'Misspelling of "definitely".', regexExpected: true },
      { span: 'survey show', category: 'sva', correct: 'survey shows', note: 'Singular subject "survey" takes "shows". Noun-subject agreement — left to BYOK.', regexExpected: false },
      { span: 'According with', category: 'preposition', correct: 'According to', note: '"According to", not "according with".', regexExpected: false },
    ],
  },
  // ───────────────────────────── STRONG (band 5–6) ─────────────────────────────
  {
    id: 'e-reading',
    level: 'strong',
    format: 'eng-speech',
    intendedBand: 5,
    text: `Good morning, teachers and fellow students. Today I want to talk about the importance of reading. Books are cheap and easy to find, I take one home every week. Sadly, fewer young people read for pleasure these days. Reading teaches us alot about life and the world around us. My brother reads every night, but he go to the library only once a month. Let us all promise to pick up a book today.`,
    errors: [
      { span: 'find, I take', category: 'comma-splice', correct: 'find. I take', note: 'Comma splice — two independent clauses joined by a comma.', regexExpected: true },
      { span: 'alot', category: 'spelling', correct: 'a lot', note: '"a lot" is two words.', regexExpected: true },
      { span: 'he go', category: 'sva', correct: 'he goes', note: 'Third-person singular "he" takes "goes".', regexExpected: false },
    ],
  },
  {
    id: 'e-social',
    level: 'mid',
    format: 'eng-discursive',
    intendedBand: 4,
    text: `Social media has become a huge part of modern life. It allows us to share advices and to stay in touch with friends far away. On the other hand, it can be addictive and it will effect our concentration. A teenager spend hours scrolling instead of studying. Some people compare there lives to others and feel unhappy as a result. This habit only makes their mood more worse over time. We should use these platforms wisely.`,
    errors: [
      { span: 'advices', category: 'countability', correct: 'advice', note: '"Advice" is uncountable — no plural.', regexExpected: false },
      { span: 'will effect', category: 'confusable', correct: 'will affect', note: '"Affect" is the verb here.', regexExpected: true },
      { span: 'teenager spend', category: 'sva', correct: 'teenager spends', note: 'Singular subject "teenager" takes "spends". Noun-subject agreement — left to BYOK.', regexExpected: false },
      { span: 'there lives', category: 'confusable', correct: 'their lives', note: '"Their lives", not "there lives".', regexExpected: true },
      { span: 'more worse', category: 'comparison', correct: 'worse', note: 'Double comparative — "worse" is already comparative, so "more" is wrong. Now caught by the free double-comparative rule (was BYOK-only).', regexExpected: false },
    ],
  },
  // ───────────────────── CONTROL — zero planted errors ─────────────────────
  {
    id: 'e-perfect',
    level: 'strong',
    format: 'eng-article',
    intendedBand: 6,
    // ZERO planted errors — a pure false-positive control. Any flag from EITHER
    // tier is, by construction, a false positive (or an accidental real error
    // the dry run will surface for me to fix).
    text: `Kindness is a quality that costs nothing yet means a great deal to those who receive it. A simple act, such as helping a classmate carry heavy bags, can brighten an entire day. When we treat others with respect, we build a community where everyone feels valued and safe. Schools should encourage pupils to volunteer, because service teaches patience and gratitude. In the end, a society grows stronger when its members care for one another.`,
    errors: [],
  },
]
