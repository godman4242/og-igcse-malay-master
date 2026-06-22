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

  '/practice': [
    {
      arrow: 'none',
      title: 'Tour: the practice hub 🗂️',
      body: 'Every way to practise, in one scannable place — nothing buried behind a menu. Tiles are organised by exam skill, and a few show a quick live cue so you can see where to focus. A 20-second walk through how it works — tap Next.',
    },
    {
      selector: '[data-guide="practice-groups"]',
      title: 'Grouped by exam skill',
      body: 'Surfaces are sorted into six areas — Speaking, Writing, Reading & Listening, Grammar & Vocab, Review, and Tools — so you scan straight to the skill you want to work on instead of hunting through a list.',
      example: 'Want to practise talking? Everything spoken — Roleplay, Speaking, Cikgu Maya — sits under Speaking.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="practice-tile"]',
      title: 'Each tile is a one-tap launcher',
      body: 'Tap any tile to jump straight into that activity — Study, Roleplay, Writing, Listening and the rest all open from here. This hub is just the front door; the real practice is one tap away.',
      example: 'Tap Study to start clearing the cards you owe for review right now.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="practice-cue"]',
      title: 'Live cues show where to focus',
      body: 'A few tiles carry a small badge with an already-computed number, so you can spot what needs attention without opening anything: Study shows cards “due”, Mistakes shows how many are left “to fix”, Exam Rehearsal shows your “% ready”, and Saved Words shows how many you’ve banked.',
      example: 'See “3 to fix” on Mistakes? Tap it and clear those three before they stick.',
      side: 'top', align: 'center',
    },
  ],

  '/roleplay': [
    {
      arrow: 'none',
      title: 'Tour: the speaking room 🎙️',
      body: 'Rehearse the oral exam with the app as your examiner. You pick a scenario, answer it turn by turn, and get instant feedback and a score — exactly the kind of back-and-forth the real speaking test asks for. A quick walk through the picker — tap Next.',
    },
    {
      selector: '[data-guide="roleplay-lang"]',
      title: 'Malay or English oral?',
      body: 'Choose which speaking exam you’re practising. Bahasa Melayu mirrors the IGCSE Malay (0546) Paper 3 speaking test — a role-play plus topic conversations. English gives oral scenarios for the IGCSE English exams (0500 / 0510). It starts on whichever language you study, but you can switch any time.',
      example: 'Sitting English as a Second Language? Tap English for scenarios pitched at the 0510 speaking test.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="roleplay-tabs"]',
      title: 'Scenarios, and your track record',
      body: 'Scenarios lists every roleplay you can start right now. History keeps every session you’ve finished with its score out of 6, so you can watch your speaking band climb over the weeks instead of guessing whether you’re improving.',
      example: 'Done a few rounds? Tap History to check your scores are trending up before the real exam.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="roleplay-scenario"]',
      title: 'Pick a scenario — two ways to run it',
      body: 'Each card is a short, multi-turn exam scene; the little badges show how many turns it has and the key words it drills. AI Practice puts you with an adaptive AI examiner that reacts to what you actually say and scores you (it uses your free daily AI calls). Static Mode is a rule-based version that always works offline, with no quota — Malay scenarios only.',
      example: 'Out of AI calls for today? Run a Malay scenario in Static Mode and keep practising offline.',
      side: 'top', align: 'center',
    },
  ],

  '/grammar': [
    {
      arrow: 'none',
      title: 'Tour: grammar drills 📝',
      body: 'Short, focused drills on the exact grammar rules examiners test — Malay affixes (imbuhan), tense markers, error-spotting and more. Answer one, get instant feedback, and the app spaces the ones you miss so they actually stick. A quick walk through the controls — tap Next.',
    },
    {
      selector: '[data-guide="grammar-mode"]',
      title: 'SRS or Cram?',
      body: 'This pill switches how drills are scheduled. SRS (the default) shows what’s due first and spaces each drill out for long-term memory — best for day-to-day practice. Cram shuffles every drill into one quick blast and ignores the schedule — handy the night before a paper.',
      example: 'Exam tomorrow? Tap it to Cram and blitz everything once. Otherwise leave it on SRS.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="grammar-lang"]',
      title: 'Malay or English grammar',
      body: 'Pick which language’s grammar you’re drilling. Bahasa Melayu covers Malay affixes, tense markers and passive forms; English covers confusables, subject–verb agreement, articles and tenses. It starts on whichever language you study, and you can switch any time.',
      example: 'Sitting English (0500 / 0510)? Tap English for SVA, articles and the words people mix up.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="grammar-tabs"]',
      title: 'Pick a grammar skill',
      body: 'Each tab is a different drill type — for Malay: Imbuhan (affixes), Tense, Find Error, Transform, plus a Rules reference you can read any time. A red number on a tab means that many of its drills are due for review right now.',
      example: 'See a red “5” on Imbuhan? Those five are due — clear them before they slip.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="grammar-drill"]',
      title: 'Answer, then learn from it',
      body: 'Here’s the drill itself. Some tabs ask you to type the answer (like building an imbuhan word); others give you options to tap. Either way you get instant feedback — the correct answer plus the rule — and every answer feeds the spaced schedule, so the ones you miss come back sooner.',
      example: 'Imbuhan: meN- + tulis → menulis (the “t” drops). Type it, and a miss is re-queued for you.',
      side: 'top', align: 'center',
    },
  ],

  '/writing': [
    {
      arrow: 'none',
      title: 'Tour: the writing analyzer ✍️',
      body: 'Paste or write an essay and get an instant IGCSE band plus specific, fixable feedback — the kind of marking that tells you exactly what to change to score higher. A quick walk through every control — tap Next.',
    },
    {
      selector: '[data-guide="writing-sample"]',
      title: 'No essay yet? Try a sample',
      body: 'Don’t have an essay to hand? Tap this to drop a realistic mid-band draft into the composer, so you can hit Analyze and watch the tool work end-to-end before writing your own.',
      example: 'New here? Load the sample, tap Analyze, and see the band plus the exact slips it flags.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="writing-lang"]',
      title: 'English, Malay, or Templates',
      body: 'Pick which exam you’re writing for — English (0500 / 0510) or Bahasa Melayu (0546) — and the marking uses that exam’s band rules. For Malay you’ll also choose Paper 2 or Paper 4. The Templates tab is a separate library of model structures to study instead of an essay to mark.',
      example: 'Sitting Malay Paper 4? Tap Bahasa Melayu, then Paper 4, before you analyze.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="writing-format"]',
      title: 'Tell it the format',
      body: 'Choose the essay format so the marking checks the right conventions — there are 21 IGCSE formats (article, formal letter, report, speech and more), each with its own checklist. Leave it on Auto-detect and it guesses the format from what you’ve written. Once a format is set, a band-6 exemplar model appears so you can see the standard you’re aiming for.',
      example: 'Writing a formal letter? Pick it, and the analyzer looks for the greeting, sign-off and register a letter needs.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="writing-compose"]',
      title: 'Write or paste your essay',
      body: 'Type a fresh essay or paste an existing draft here. It can auto-detect the format as you write, so you can just start. Give it at least a few sentences before analyzing, so there’s enough to mark.',
      example: 'Got a draft in your notes app? Paste it straight in and let the analyzer mark it.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="writing-analyze"]',
      title: 'Get your band + exactly what to fix',
      body: 'Tap this for an instant, free, on-device mark: your band out of 6, the techniques and structure it found, and — most useful — specific corrections pointing at the exact words to fix, plus tips to raise your band. A deeper AI review is available too — it uses your free daily AI allowance, or your own AI key if you’ve added one in Settings.',
      example: 'Band 3 with a tense slip flagged on three sentences? Fix those, re-analyze, and watch the band climb.',
      side: 'top', align: 'center',
    },
  ],

  '/comprehension': [
    {
      arrow: 'none',
      title: 'Tour: reading comprehension 📚',
      body: 'Practise the Paper 1 reading skill: read a short, IGCSE-style passage, then answer multiple-choice questions on it — with an instant explanation after every answer so you learn from each miss. A quick walk through how to start — tap Next.',
    },
    {
      selector: '[data-guide="comprehension-passages"]',
      title: 'Pick a passage to read',
      body: 'These are your reading passages — tap any one to open it, read the text, and answer its questions. The list leads with the language you study, so a Malay learner sees Malay passages on top and an English learner sees English ones first; the rest stay just below, so you can always reach them.',
      example: 'Studying Malay? Your Malay passages are on top — tap one to start reading and answering.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="comprehension-badges"]',
      title: 'Choose one at the right level',
      body: 'Each passage is labelled so you can pick well: EN or MY for the language, the topic, a difficulty (beginner, intermediate or advanced), and how many questions it has. A “Your interest” star marks topics you chose in Settings, and those float to the top of the list.',
      example: 'New to a topic? Start on a beginner passage, then work up to intermediate and advanced as it feels easier.',
      side: 'bottom', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Inside a passage',
      body: 'Once you open one: read the text, then answer each multiple-choice question — you get an instant verdict, a short explanation, and a supporting quote from the passage, so a wrong answer still teaches you. On a Malay passage you can tap any word to look it up, and “Read along” plays the passage aloud with each word highlighted as it’s spoken. Finish for a score out of the question count, and any wrong answers are saved to your Mistake Journal to re-drill.',
      example: 'Miss an inference question? Read the explanation and the quote it points to, then it’s queued in your Mistakes to revisit.',
    },
  ],

  '/listening': [
    {
      arrow: 'none',
      title: 'Tour: listening practice 🎧',
      body: 'Practise the Paper 4 listening skill: you HEAR a short, IGCSE-style passage — you don’t see the text — then answer multiple-choice questions on what you caught. It’s the closest thing to the real listening exam. A quick walk through how to start — tap Next.',
    },
    {
      selector: '[data-guide="listening-passages"]',
      title: 'Pick something to listen to',
      body: 'These are your listening passages — tap any one to open it and start. The list leads with the language you study, so a Malay learner sees Malay passages on top and an English learner sees English ones first; the rest stay just below. Each card also gives a short hint about the speaker and setting, so you know what kind of audio to expect.',
      example: 'Studying English? Your English passages are on top — tap one like “Flight Announcement” to begin.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="listening-badges"]',
      title: 'Pick one at the right level',
      body: 'Each passage is labelled so you can choose well: EN or MY for the language, a difficulty (beginner, intermediate or advanced), and how many questions follow it.',
      example: 'New to listening? Start on a beginner passage, then work up to intermediate and advanced as your ear gets sharper.',
      side: 'bottom', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Inside a passage',
      body: 'Once you open one: tap Play to hear it — the text stays hidden, just like the real exam, so you’re tested purely on listening. You can replay it once, and that second play is a little slower to help you catch missed phrases. The questions unlock only after you’ve listened at least once. Answer each one for an instant verdict and explanation, finish for a score, and at the end you can reveal the full transcript to review what you missed; any wrong answers are saved to your Mistake Journal. (You’ll need a device that can read text aloud — if yours can’t, a note tells you.)',
      example: 'Missed a detail on the first play? Use your one replay — it’s slower — then answer; a wrong answer is queued in your Mistakes to revisit.',
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
