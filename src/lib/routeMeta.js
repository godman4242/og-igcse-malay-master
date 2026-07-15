// Single crawler-facing source of truth for per-route <head> meta.
// Consumed at BUILD time by the seoPrerender Vite plugin (raw HTML the crawler
// sees) and at RUNTIME by Layout.jsx (the sr-only per-page <h1>).
// Titles/descriptions mirror what each page passes to <Meta> — keep them in
// sync when a page's <Meta> copy changes. Two deliberate divergences:
//   - '/' uses the marketing title (a logged-in user's tab still shows
//     "Dashboard | …" via the client <Meta>).
//   - dynamic pages (/study, /comprehension) carry a stable BASE title here;
//     the client <Meta> refines it at runtime (deck / passage name).
export const SITE = {
  name: 'IGCSE Malay Master',
  defaultBaseUrl: 'https://upg-igcse-malay-master.vercel.app',
  ogImage: '/og-image.png',
}

export const ROUTE_META = {
  '/':                { name: 'Home',           index: true,  title: 'IGCSE Malay Master — Flashcards, AI Roleplay & Exam Revision', description: 'IGCSE Malay revision with spaced-repetition flashcards, AI roleplay and writing feedback, grammar drills, pronunciation practice and exam rehearsal. Supports IGCSE English too.' },
  '/study':           { name: 'Study',          index: true,  title: 'Study | IGCSE Malay Master', description: 'Master IGCSE Malay vocabulary with spaced repetition and multiple interactive study modes.' },
  '/smart-study':     { name: 'Smart Study',     index: true,  title: 'Smart Study | IGCSE Malay Master', description: 'An adaptive interleaved IGCSE session that mixes vocabulary, grammar and speaking around the words you owe today.' },
  '/practice':        { name: 'Practice',        index: true,  title: 'Practice — IGCSE Malay Master', description: 'Every learning surface in one place: speaking, writing, reading, listening, grammar, review and tools.' },
  '/for-you':         { name: 'For You',         index: true,  title: 'For You | IGCSE Malay Master', description: "Your personalized IGCSE study home — today's plan, a session picked for your weak spots, and where you stand." },
  '/word-families':   { name: 'Word Families',   index: true,  title: 'Word Families | IGCSE Malay Master', description: 'Explore Malay root words and their derived forms (imbuhan). Visual family trees to help you master vocabulary.' },
  '/comprehension':   { name: 'Comprehension',   index: true,  title: 'Comprehension | IGCSE Malay Master', description: 'Practice IGCSE reading skills with bilingual passages, interactive dictionary lookups, and AI-generated questions.' },
  '/writing':         { name: 'Writing',         index: true,  title: 'Writing Analyzer | IGCSE Malay Master', description: 'Analyze your IGCSE writing across 21 formats with band-6 exemplars and per-paragraph feedback in Malay or English.' },
  '/speaking':        { name: 'Speaking',        index: true,  title: 'Speaking Practice | IGCSE Malay Master', description: 'IGCSE speaking practice — speak on a topic, get a calibrated band and AI coaching in Malay or English.' },
  '/listening':       { name: 'Listening',       index: true,  title: 'Listening Practice | IGCSE Malay Master', description: 'IGCSE listening practice — hear a passage, then answer comprehension questions with instant feedback.' },
  '/dictation':       { name: 'Dictation',       index: true,  title: 'Dictation — IGCSE Malay Master', description: 'Listen to a sentence and type what you hear — spelling, listening and vocabulary in one exercise.' },
  '/cloze-listening': { name: 'Cloze Listening', index: true,  title: 'Cloze Listening — IGCSE Malay Master', description: 'Listen to a sentence and fill the missing words in its transcript — listening and vocabulary retrieval in one drill.' },
  '/grammar':         { name: 'Grammar',         index: true,  title: 'Grammar Drills | IGCSE Malay Master', description: 'Interactive spaced IGCSE grammar drills — Malay imbuhan and tense markers, English confusables and agreement.' },
  '/roleplay':        { name: 'Roleplay',        index: true,  title: 'Oral Practice | IGCSE Malay Master', description: 'Simulate IGCSE Paper 3 speaking exams. Interactive roleplay scenarios with real-time feedback on your Malay pronunciation and grammar.' },
  '/cikgu':           { name: 'Cikgu Maya',      index: true,  title: 'Cikgu Maya AI Tutor | IGCSE Malay Master', description: 'Ask Cikgu Maya, the AI grammar tutor, about IGCSE Malay and English — imbuhan, tenses, vocabulary, writing and exam tips.' },
  '/exam-rehearsal':  { name: 'Exam Rehearsal',  index: true,  title: 'Exam Rehearsal | IGCSE Malay Master', description: 'A timed IGCSE exam rehearsal across comprehension, listening, writing and speaking with a composite Readiness score.' },
  '/pdf-reader':      { name: 'PDF Reader',      index: true,  title: 'PDF Reader | IGCSE Malay Master', description: 'Read a Malay PDF, past-paper photo or recording with tap-to-reveal translation and build flashcards from the text.' },
  '/saved-cloze':     { name: 'Saved Words',     index: true,  title: 'Practise saved words | IGCSE Malay Master', description: 'Produce your saved Malay words in context — a generative retrieval session that feeds your spaced-repetition schedule.' },
  '/settings':        { name: 'Settings',        index: false, title: 'Settings | IGCSE Malay Master', description: 'Choose your study language, appearance and accessibility options, back up your progress, and connect an AI key.' },
  '/import':          { name: 'Import',          index: false, title: 'Import Words | IGCSE Malay Master', description: 'Paste text or upload a PDF and turn unknown words into spaced-repetition flashcards for IGCSE Malay or English.' },
  '/mistakes':        { name: 'Mistake Journal', index: false, title: 'Mistake Journal | IGCSE Malay Master', description: 'Every mistake you make is logged, clustered and re-drilled — turn your slips into targeted IGCSE revision.' },
}

export function metaForPath(path) {
  return ROUTE_META[path] ?? ROUTE_META['/']
}
