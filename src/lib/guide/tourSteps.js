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
// Every body ≤ 14 words (Kheshav 2026-09-28: short steps, no walls of text —
// pinned by tourSteps.test.js, same rule as the page tours).
export const QUICK_TOUR = [
  {
    id: 'quick-intro',
    route: '/',
    title: 'Welcome! 👋',
    body: 'A 60-second tour of your IGCSE Malay & English study app. Tap Next.',
  },
  {
    id: 'quick-smart-session',
    route: '/',
    selector: '[data-tour="dashboard-cta"]',
    title: 'Start here',
    body: 'Smart Session: today’s practice, picked for you. The quickest way in.',
    side: 'bottom',
    align: 'center',
  },
  {
    id: 'quick-streak',
    route: '/',
    selector: '[data-tour="streak"]',
    title: 'Build a streak',
    body: 'Study a little every day and your streak grows.',
    side: 'bottom',
    align: 'center',
  },
  {
    id: 'quick-study',
    route: '/',
    selector: '[data-tour="nav-study"]',
    title: 'Study your cards',
    body: '7 ways to practise. Words come back just before you forget them.',
    side: 'top',
    align: 'center',
  },
  {
    id: 'quick-practice',
    route: '/',
    selector: '[data-tour="nav-practice"]',
    title: 'Everything else',
    body: 'Speaking, writing, reading, listening, grammar and tools all live in Practice.',
    side: 'top',
    align: 'center',
  },
  {
    id: 'quick-replay',
    route: '/settings',
    selector: '[data-tour="guide-card"]',
    title: 'Replay anytime',
    body: 'Re-run this tour anytime from Settings, under App guide.',
    side: 'bottom',
    align: 'center',
  },
  {
    id: 'quick-outro',
    route: '/settings',
    title: 'You’re set! 🎉',
    body: 'Start a Smart Session whenever you’re ready. Selamat belajar!',
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
    body: 'One short stop for every feature. Tap Next.',
  },
  {
    id: 'full-smart-session',
    route: '/',
    selector: '[data-tour="dashboard-cta"]',
    title: 'Smart Session',
    body: 'Today’s mixed practice: first recognise words, then use them yourself.',
    side: 'bottom',
  },
  {
    id: 'full-streak',
    route: '/',
    selector: '[data-tour="streak"]',
    title: 'Streak & stats',
    body: 'Your streak, cards due, and progress at a glance.',
    side: 'bottom',
  },
  {
    id: 'full-for-you',
    route: '/for-you',
    title: 'For You',
    body: 'Practice picked from your own history, with a reason for each.',
  },
  {
    id: 'full-study',
    route: '/study',
    title: 'Study',
    body: '7 ways to practise. Each answer decides when a card comes back.',
  },
  {
    id: 'full-smart-study',
    route: '/smart-study',
    title: 'Smart Study',
    body: 'Mixes words, grammar and speaking in short rounds.',
  },
  {
    id: 'full-grammar',
    route: '/grammar',
    title: 'Grammar drills',
    body: 'Practise the grammar rules the exam tests, with instant feedback.',
  },
  {
    id: 'full-roleplay',
    route: '/roleplay',
    title: 'Roleplay',
    body: 'Act out speaking exam scenes, then get a score and model answers.',
  },
  {
    id: 'full-speaking',
    route: '/speaking',
    title: 'Speaking practice',
    body: 'Answer exam questions out loud and get a band.',
  },
  {
    id: 'full-writing',
    route: '/writing',
    title: 'Writing',
    body: 'Write an essay, get a band, and see exactly what to fix.',
  },
  {
    id: 'full-comprehension',
    route: '/comprehension',
    title: 'Comprehension',
    body: 'Read passages and answer questions, with an explanation for each.',
  },
  {
    id: 'full-listening',
    route: '/listening',
    title: 'Listening',
    body: 'Hear a passage with limited replays, just like the real exam.',
  },
  {
    id: 'full-dictation',
    route: '/dictation',
    title: 'Dictation',
    body: 'Hear a sentence, type it, and get each word checked.',
  },
  {
    id: 'full-cloze-listening',
    route: '/cloze-listening',
    title: 'Cloze listening',
    body: 'Hear a sentence and fill in the missing words.',
  },
  {
    id: 'full-cikgu',
    route: '/cikgu',
    title: 'Cikgu Maya',
    body: 'Your tutor. Ask any grammar, word or exam question.',
  },
  {
    id: 'full-word-families',
    route: '/word-families',
    title: 'Word Families',
    body: 'See all the words built from one root, together.',
  },
  {
    id: 'full-saved-cloze',
    route: '/saved-cloze',
    title: 'Saved-word cloze',
    body: 'Fill-the-gap practice on words you saved while reading.',
  },
  {
    id: 'full-pdf-reader',
    route: '/pdf-reader',
    title: 'PDF Reader',
    body: 'Read real Malay and tap any word for its meaning.',
  },
  {
    id: 'full-import',
    route: '/import',
    title: 'Import',
    body: 'Paste text or a PDF and turn its words into flashcards.',
  },
  {
    id: 'full-mistakes',
    route: '/mistakes',
    title: 'Mistake Journal',
    body: 'Your mistakes are saved here and practised until you fix them.',
  },
  {
    id: 'full-exam-rehearsal',
    route: '/exam-rehearsal',
    title: 'Exam Rehearsal',
    body: 'A timed mock exam that scores how ready you are.',
  },
  {
    id: 'full-practice',
    route: '/practice',
    title: 'Practice hub',
    body: 'Every way to practise, in one grid.',
  },
  {
    id: 'full-replay',
    route: '/settings',
    selector: '[data-tour="guide-card"]',
    title: 'Replay anytime',
    body: 'Re-run the quick or full tour from Settings, under App guide.',
    side: 'bottom',
  },
  {
    id: 'full-outro',
    route: '/settings',
    title: 'That’s everything! 🎉',
    body: 'Selamat belajar, and good luck in your IGCSE!',
  },
]
