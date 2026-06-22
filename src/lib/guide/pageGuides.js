// pageGuides.js — Full Page Guide content (LAZY: loaded only when ▶ is tapped).
// PURE data + buildPageSteps. Structure (selectors/order) is hand-derived from
// the live page; prose is hand-authored + verified against the code (no AI,
// no confident-wrong — the load-bearing learning-tool rule). Anchors are
// [data-guide="{page}-{control}"] added to the page component (or a reused
// [data-tour="…"]). A missing anchor is skipped by the engine — never dead-ends.
//
// Step shape: { selector, title, body, example?, side?, align?, arrow? }
//   arrow:'none' → a centered intro/outro step with no pointer.

export const PAGE_GUIDES = {
  '/': [
    {
      arrow: 'none',
      title: 'Tour: your home base 🏠',
      body: 'A 30-second look at everything on your dashboard and what each part is for. Tap Next.',
    },
    {
      selector: '[data-tour="dashboard-cta"]',
      title: 'Smart Session',
      body: 'Your daily adaptive cycle — short thematic rounds that move you from recognising a word to producing it, focused on what you owe today.',
      example: 'Tap it each morning for a ~10-minute mixed round.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-stats"]',
      title: 'Your deck at a glance',
      body: 'Your key numbers at a glance — due cards, your streak, and words mastered.',
      example: 'Due Now: 12 → tap it to start clearing them right now.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-quick-actions"]',
      title: 'Jump straight in',
      body: 'Three one-tap shortcuts: Review your due cards, Mix an interleaved round, or Speak with a roleplay.',
      example: 'Tap Mix for one round blending vocab, grammar and speaking.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-exam"]',
      title: 'Exam Rehearsal',
      body: 'A timed run across reading, writing and speaking that scores your overall Readiness %.',
      example: 'Do one a week and watch your readiness climb before the real paper.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-mistakes"]',
      title: 'Mistake Journal',
      body: 'Every slip is logged, and the important ones come back as targeted re-drills until you fix them.',
      example: 'Miss a “ber-” word twice and it queues a drill on exactly that.',
      side: 'bottom', align: 'center',
    },
  ],

  '/pdf-reader': [
    {
      arrow: 'none',
      title: 'Tour: the reading lab 📖',
      body: 'Turn any Malay text into a study session: read it, tap words you don’t know, and pull the ones worth keeping straight into your flashcards. A quick walk through every control — tap Next.',
    },
    {
      selector: '[data-guide="pdf-sample"]',
      title: 'No file? Start with a sample',
      body: 'Don’t have a passage yet? Tap this to load a built-in, exam-style passage so you can try everything here right now — no upload needed.',
      example: 'New to the reader? Tap it, then come back and hit Next to see the rest in action.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="pdf-reading"]',
      title: 'Tap any word to check it',
      body: 'Read the Malay first, then tap a word to reveal its English — tap again to hide it. Revealing is never “failing”; it’s how you check yourself. On a page that’s too hard, a gentle banner offers to show the English as you read.',
      example: 'Stuck on “penduduk”? Tap it → “resident / inhabitant”. Got it from context? Don’t tap — that’s the win.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="pdf-mode"]',
      title: 'Two modes: Translate vs Select',
      body: 'Translate mode = tap a word to reveal its meaning. Select mode = drag across words to send them straight to your flashcards. In Select you also choose Individual (one word) or Group (a whole phrase).',
      example: 'Group two words like “jam tangan” into one card = “watch” — not “clock” + “hand”.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="pdf-translate"]',
      title: 'Translate page',
      body: 'Glosses every unknown word on the page in one go — but each one stays hidden until you tap it, so you still read the Malay first.',
      example: 'Tap it on a dense paragraph, then reveal only the few words you actually got stuck on.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="pdf-sentences"]',
      title: 'Sentences',
      body: 'When a single word isn’t enough, reveal a whole sentence’s meaning on demand — read the Malay sentence first, then tap its cue to check. (Reflow view only.)',
      example: 'A long sentence with tricky word order? Reveal it once to confirm you read it right.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="pdf-fulltranslation"]',
      title: 'Full translation',
      body: 'Opens a dedicated page that maps each paragraph to its English — a reveal-gated way to check your understanding of the whole document after you’ve read it.',
      example: 'Finished a passage? Open this to confirm you got the gist before moving on.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="pdf-view"]',
      title: 'Reflow vs Layout',
      body: 'Reflow = clean, simple reading text (best for studying). Layout = the page exactly as it looks — columns, tables and diagrams kept — which matters for real past-paper scans.',
      example: 'Studying a comprehension passage? Stay on Reflow. Checking a chart on a scan? Switch to Layout.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="pdf-replace"]',
      title: 'Bring your own material',
      body: 'Load a PDF, snap a photo of a printed page (free, on-device OCR — the image never leaves your device), or upload/record audio (on-device transcription). It all becomes a passage you study the same way. A messy photo can get an optional “Sharper read” with your own AI key.',
      example: 'Photograph a past-paper page, then tap words to build cards from it.',
      side: 'bottom', align: 'center',
    },
  ],

  '/study': [
    {
      arrow: 'none',
      title: 'Tour: your study session 🎓',
      body: 'This is where you turn words into long-term memory. Pick a deck, choose how you want to practise, and grade yourself honestly so the app knows when to bring each word back. A quick walk through every control — tap Next.',
    },
    {
      selector: '[data-guide="study-deck"]',
      title: 'Pick your deck',
      body: 'Switch between your decks — the topic packs you’ve loaded, your Mistakes deck, and any words you’ve imported. Malay and English decks stay separate, so a session never mixes the two.',
      example: 'On the bus? Switch to your Mistakes deck and clear just the words you keep getting wrong.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="study-modes"]',
      title: 'Seven ways to practise',
      body: 'The same word, retrieved seven different ways: Flashcard (flip and self-grade), Quiz (multiple choice), Type (type the answer), Listen (hear it, then type), Cloze (fill the blank in a sentence), Speak (say it aloud), and Produce — the hardest — where you’re shown only the meaning and write the word from memory.',
      example: 'Know a word by sight but freeze when writing it? Switch to Produce or Type to force real recall.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="study-stats"]',
      title: 'Your deck at a glance',
      body: 'Three counts for this deck: DUE = owed for review right now, LEARNING = still bedding in, KNOWN = solid in long-term memory. Clearing your DUE pile each day is what keeps the spacing schedule working.',
      example: 'DUE: 12 → those are the cards to clear today before they slip.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="study-card"]',
      title: 'Flip, then grade yourself honestly',
      body: 'Try to recall the answer first, then reveal it. On a flashcard you then tap Again / Hard / Good / Easy — and your honest rating decides when the word comes back (that’s spaced repetition). The little time under each button is exactly when you’ll next see the card.',
      example: 'Only just scraped it back? Tap Hard, not Good — being honest is what makes the schedule work for you.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="study-skip"]',
      title: 'Skip, or fly with the keyboard',
      body: 'Tap Next Card to move on without grading — it won’t change that card’s schedule. In Flashcard mode you can also run the whole session from the keyboard: Space flips, 1–4 grade, S plays the sound, N or → goes next.',
      example: 'Total blank on one word? Skip it with Next Card and it’ll come round again later, unchanged.',
      side: 'top', align: 'center',
    },
  ],

  '/smart-study': [
    {
      arrow: 'none',
      title: 'Tour: your daily Smart Session 🧠',
      body: 'Smart Session is the app’s adaptive daily loop — short thematic cycles that take each word from just recognising it all the way to producing it from memory, leading with what you owe today and the words you keep getting wrong. A quick walk through the setup — tap Next.',
    },
    {
      selector: '[data-guide="smartstudy-speaking"]',
      title: 'Mic on, or mic off?',
      body: 'Choose how you’ll practise. Public Mode uses no microphone — every task is tap or type, so you can study on a bus or in a quiet library. Mic Enabled adds a short spoken task at the end of some cycles.',
      example: 'On the train? Pick Public Mode and you still get the full mixed session — just without the speaking turns.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="smartstudy-begin"]',
      title: 'Begin the cycle',
      body: 'Starts a ~20-minute session of about five short cycles. Each cycle takes one word and walks it from recognition (flip a flashcard) → recall (a quiz or fill-the-blank) → production (write a sentence using it). It leads with the words due today and the ones you’ve recently got wrong, so your time goes where it counts.',
      example: 'Tap it each morning for one focused, mixed round.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="smartstudy-manual"]',
      title: 'Prefer to choose your own mode?',
      body: 'Jumps to plain Study, where YOU pick the deck and a single practice mode (Flashcard, Quiz, Type, Listen, Cloze, Speak or Produce). Smart Session picks the mix for you; Manual Study puts you in control.',
      example: 'Want to drill only Type mode on one deck? Use Manual Study.',
      side: 'top', align: 'center',
    },
  ],
}

// Map page content → the engine's step shape (tourSteps), stamping the route so
// the controller treats them as same-route steps (no navigation). Pure.
export function buildPageSteps(route) {
  const steps = PAGE_GUIDES[route]
  if (!Array.isArray(steps)) return []
  return steps.map((s, i) => ({
    id: `page-${route}-${i}`,
    route,
    title: s.title,
    body: s.body + (s.example ? `\n\n${s.example}` : ''),
    ...(s.selector ? { selector: s.selector } : {}),
    ...(s.side ? { side: s.side } : {}),
    ...(s.align ? { align: s.align } : {}),
  }))
}
