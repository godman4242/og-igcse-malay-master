// Tour step data for the in-app guide ("App tour"). PURE data — no DOM, no
// React, no store. Unit-tested in __tests__/tourSteps.test.js.
//
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md
//
// Step shape:
//   { id, title, body, route?, selector?, side?, align? }
//   - route    : the app route this step belongs on. The controller navigates
//                there before showing the step (see guideController.js).
//   - selector : a stable `[data-tour="…"]` anchor to spotlight. Omitted → the
//                step renders as a centered modal (intro / outro / a route the
//                tour visits without a dedicated anchor). A spotlight whose
//                target is missing is skipped gracefully (never dead-ends).
//   - side/align: driver.js popover placement hints (optional).
//
// NOTE on routes: APP_ROUTES mirrors the <Route> table in src/App.jsx. Kept
// here (App.jsx defines them inline in JSX, not as an export) so the tour data
// is self-validating; if a route is renamed, update both.

export const APP_ROUTES = [
  '/', '/study', '/roleplay', '/grammar', '/writing', '/import', '/settings',
  '/mistakes', '/word-families', '/cikgu', '/comprehension', '/pdf-reader',
  '/speaking', '/exam-rehearsal', '/listening', '/smart-study', '/practice',
  '/saved-cloze', '/for-you', '/dictation', '/cloze-listening',
]

// ── Quick tour — the ~60-second "what is this / how do I study / where's my
// streak" walkthrough. Hand-a-teacher-the-phone friendly. 7 steps.
export const QUICK_TOUR = [
  {
    id: 'quick-intro',
    route: '/',
    title: 'Welcome! 👋',
    body: 'This is a 60-second tour of ooga da boogadamalay — your IGCSE Malay & English study tool. Tap Next to begin.',
  },
  {
    id: 'quick-smart-session',
    route: '/',
    selector: '[data-tour="dashboard-cta"]',
    title: 'Start here',
    body: 'Your Smart Session is the quickest way in — an adaptive cycle that drills exactly what you owe today.',
    side: 'bottom',
    align: 'center',
  },
  {
    id: 'quick-streak',
    route: '/',
    selector: '[data-tour="streak"]',
    title: 'Build a streak',
    body: 'Study a little every day and your streak grows. Miss a day and a streak freeze quietly protects it.',
    side: 'bottom',
    align: 'center',
  },
  {
    id: 'quick-study',
    route: '/',
    selector: '[data-tour="nav-study"]',
    title: 'Six ways to study',
    body: 'Tap Study for flashcards, quiz, type-answer, listen, cloze and speaking — all spaced for memory.',
    side: 'top',
    align: 'center',
  },
  {
    id: 'quick-practice',
    route: '/',
    selector: '[data-tour="nav-practice"]',
    title: 'Everything else lives here',
    body: 'Practice opens the full grid: speaking, writing, reading, listening, grammar, roleplay and your tools.',
    side: 'top',
    align: 'center',
  },
  {
    id: 'quick-replay',
    route: '/settings',
    selector: '[data-tour="guide-card"]',
    title: 'Replay anytime',
    body: 'You can re-run this tour — or take the full feature tour — anytime from Settings → App guide.',
    side: 'bottom',
    align: 'center',
  },
  {
    id: 'quick-outro',
    route: '/settings',
    title: "You're set! 🎉",
    body: 'That\'s the tour. Selamat belajar — start with a Smart Session whenever you\'re ready.',
  },
]

// ── Full tour — power-learner superset. Visits every primary route in nav
// order with one orienting step each. Anchored where a stable target exists;
// otherwise a centered modal introduces the route the tour just navigated to.
export const FULL_TOUR = [
  {
    id: 'full-intro',
    route: '/',
    title: 'The full tour 🧭',
    body: 'A guided walk through every feature, so you can squeeze the most out of the app. About 20 short stops — tap Next.',
  },
  {
    id: 'full-smart-session',
    route: '/',
    selector: '[data-tour="dashboard-cta"]',
    title: 'Smart Session',
    body: 'Your daily adaptive cycle: thematic micro-rounds that move you from recognition to production.',
    side: 'bottom',
  },
  {
    id: 'full-streak',
    route: '/',
    selector: '[data-tour="streak"]',
    title: 'Streak & stats',
    body: 'Your home dashboard tracks streak, cards due, and your weekly study rhythm at a glance.',
    side: 'bottom',
  },
  {
    id: 'full-for-you',
    route: '/for-you',
    title: 'For You',
    body: 'A personalised shelf — words and drills picked from your own history and interests. Each item shows a one-line reason why it was picked. Use "Tune your focus" to lean your next plan toward speaking, writing, or grammar (steers selection only — never your spaced-repetition schedule). "Where you stand" shows a quick skill-by-skill competence panel built from your own history.',
  },
  {
    id: 'full-study',
    route: '/study',
    title: 'Study — six modes',
    body: 'Flashcards, quiz, type-answer, listen, cloze and speaking. Each rating reschedules the card with FSRS.',
  },
  {
    id: 'full-smart-study',
    route: '/smart-study',
    title: 'Smart Study',
    body: 'Mixes vocab, grammar and speaking in short, spaced rounds — variety keeps each rep effortful, and spacing is what makes it stick.',
  },
  {
    id: 'full-grammar',
    route: '/grammar',
    title: 'Grammar drills',
    body: 'Interactive imbuhan, tense and usage drills — spaced like vocab, with instant feedback.',
  },
  {
    id: 'full-roleplay',
    route: '/roleplay',
    title: 'Roleplay',
    body: 'Act out IGCSE speaking scenarios turn-by-turn and get a scored report with model answers.',
  },
  {
    id: 'full-speaking',
    route: '/speaking',
    title: 'Speaking practice',
    body: 'Record spoken answers to exam-style prompts and get banded feedback on fluency and vocabulary.',
  },
  {
    id: 'full-writing',
    route: '/writing',
    title: 'Writing',
    body: '21 IGCSE formats with band-6 exemplars and per-paragraph analysis of your own writing.',
  },
  {
    id: 'full-comprehension',
    route: '/comprehension',
    title: 'Comprehension',
    body: 'Read graded passages and answer questions — bilingual, with explanations for every answer.',
  },
  {
    id: 'full-listening',
    route: '/listening',
    title: 'Listening',
    body: 'Audio passages played with a replay limit, just like the real listening exam.',
  },
  {
    id: 'full-dictation',
    route: '/dictation',
    title: 'Dictation',
    body: 'Hear a sentence, type exactly what you heard, and get a word-by-word check — listening, spelling and vocabulary in one drill.',
  },
  {
    id: 'full-cloze-listening',
    route: '/cloze-listening',
    title: 'Cloze listening',
    body: 'Hear a sentence while you read its transcript with a word or two blanked out, and fill the gaps — listening and vocabulary retrieval together, one rung easier than dictation.',
  },
  {
    id: 'full-cikgu',
    route: '/cikgu',
    title: 'Cikgu Maya',
    body: 'Ask the built-in tutor any grammar, vocabulary or exam question — free, with optional AI.',
  },
  {
    id: 'full-word-families',
    route: '/word-families',
    title: 'Word Families',
    body: 'Explore related words around a root to build vocabulary in connected clusters, not in isolation.',
  },
  {
    id: 'full-saved-cloze',
    route: '/saved-cloze',
    title: 'Saved-word cloze',
    body: 'Turns the words you saved into fill-the-blank drills — retrieval practice on your own vocabulary.',
  },
  {
    id: 'full-pdf-reader',
    route: '/pdf-reader',
    title: 'PDF Reader',
    body: 'Read real Malay text; tap any word to translate it, and save it straight into your review deck. New here and have no file? Tap "Try a sample" to explore with a built-in passage.',
  },
  {
    id: 'full-import',
    route: '/import',
    title: 'Import',
    body: 'Paste text or a PDF to mine new vocabulary and build flashcards from content you actually read.',
  },
  {
    id: 'full-mistakes',
    route: '/mistakes',
    title: 'Mistake Journal',
    body: 'Every slip is logged and the important ones become targeted re-drills until you fix them.',
  },
  {
    id: 'full-exam-rehearsal',
    route: '/exam-rehearsal',
    title: 'Exam Rehearsal',
    body: 'A timed, spaced run across reading, writing and speaking that scores your overall Readiness %.',
  },
  {
    id: 'full-practice',
    route: '/practice',
    title: 'Practice hub',
    body: 'Every learning surface in one scannable grid — nothing buried, with quick status cues.',
  },
  {
    id: 'full-replay',
    route: '/settings',
    selector: '[data-tour="guide-card"]',
    title: 'Replay anytime',
    body: 'Re-run the quick or full tour whenever you like from Settings → App guide.',
    side: 'bottom',
  },
  {
    id: 'full-outro',
    route: '/settings',
    title: 'That\'s everything! 🎉',
    body: 'You\'ve seen the whole toolkit. Selamat belajar — and good luck in your IGCSE.',
  },
]
