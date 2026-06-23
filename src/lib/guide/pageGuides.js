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
    // ── The controls below live in the TOOLBAR / reading area, which mount only
    // after a doc loads. On the empty landing (where a new student launches ▶)
    // they don't exist, so anchoring an arrow at them would silently skip the
    // step. Taught as centered arrow:'none' cards instead — they render in ANY
    // state, so the tour skips nothing on a blank reader (mirrors the
    // Comprehension/Listening in-session summary pattern). pageGuides.test.js
    // pins that only pdf-sample stays anchored.
    {
      arrow: 'none',
      title: 'Tap any word to check it',
      body: 'Read the Malay first, then tap a word to reveal its English — tap again to hide it. Revealing is never “failing”; it’s how you check yourself. On a page that’s too hard, a gentle banner offers to show the English as you read.',
      example: 'Stuck on “penduduk”? Tap it → “resident / inhabitant”. Got it from context? Don’t tap — that’s the win.',
    },
    {
      arrow: 'none',
      title: 'Two modes: Translate vs Select',
      body: 'Translate mode = tap a word to reveal its meaning. Select mode = drag across words to send them straight to your flashcards. In Select you also choose Individual (one word) or Group (a whole phrase).',
      example: 'Group two words like “jam tangan” into one card = “watch” — not “clock” + “hand”.',
    },
    {
      arrow: 'none',
      title: 'Translate page',
      body: 'Glosses every unknown word on the page in one go — but each one stays hidden until you tap it, so you still read the Malay first.',
      example: 'Tap it on a dense paragraph, then reveal only the few words you actually got stuck on.',
    },
    {
      arrow: 'none',
      title: 'Sentences',
      body: 'When a single word isn’t enough, reveal a whole sentence’s meaning on demand — read the Malay sentence first, then tap its cue to check. (Reflow view only.)',
      example: 'A long sentence with tricky word order? Reveal it once to confirm you read it right.',
    },
    {
      arrow: 'none',
      title: 'Full translation',
      body: 'Opens a dedicated page that maps each paragraph to its English — a reveal-gated way to check your understanding of the whole document after you’ve read it.',
      example: 'Finished a passage? Open this to confirm you got the gist before moving on.',
    },
    {
      arrow: 'none',
      title: 'Reflow vs Layout',
      body: 'Reflow = clean, simple reading text (best for studying). Layout = the page exactly as it looks — columns, tables and diagrams kept — which matters for real past-paper scans.',
      example: 'Studying a comprehension passage? Stay on Reflow. Checking a chart on a scan? Switch to Layout.',
    },
    {
      arrow: 'none',
      title: 'Bring your own material',
      body: 'Load a PDF, snap a photo of a printed page (free, on-device OCR — the image never leaves your device), or upload/record audio (on-device transcription). It all becomes a passage you study the same way. A messy photo can get an optional “Sharper read” with your own AI key.',
      example: 'Photograph a past-paper page, then tap words to build cards from it.',
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
    // The "Try a sample" CTA renders ONLY while the composer is empty
    // (showSampleCta = lang!=='templates' && !text && !results in Writing.jsx),
    // so a returning user with a draft or visible results has no such node — an
    // arrow anchored at it would silently fast-skip (guideController.js). Taught
    // as a centered arrow:'none' card instead: it renders in ANY composer state,
    // so the tour skips nothing whether the composer is empty or holds a draft
    // (mirrors the /pdf-reader + Comprehension/Listening centered-card pattern).
    {
      arrow: 'none',
      title: 'No essay yet? Try a sample',
      body: 'When the composer is empty, a “Try a sample” link shows near the top of the page — tap it to drop a realistic mid-band draft in, so you can hit Analyze and watch the tool work end-to-end before writing your own.',
      example: 'Starting from a blank page? Load the sample, tap Analyze, and see the band plus the exact slips it flags.',
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
      body: 'Practise the reading skill: read a short, IGCSE-style passage, then answer multiple-choice questions on it — with an instant explanation after every answer so you learn from each miss. A quick walk through how to start — tap Next.',
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
      body: 'Practise the listening skill: you HEAR a short, IGCSE-style passage — you don’t see the text — then answer multiple-choice questions on what you caught. It’s the closest thing to the real listening exam. A quick walk through how to start — tap Next.',
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

  '/speaking': [
    {
      arrow: 'none',
      title: 'Tour: speaking practice 🎤',
      body: 'Rehearse the oral exam on your own: pick a topic, take a moment to plan, then answer out loud (or by typing) and get an instant band with specific things to fix. A quick walk through how to start — tap Next.',
    },
    {
      selector: '[data-guide="speaking-lang"]',
      title: 'Malay or English oral?',
      body: 'Choose which speaking exam you’re practising. Bahasa Melayu mirrors the IGCSE Malay (0546) Paper 3 oral; English gives topics for the IGCSE English (0500 / 0510) speaking test. It starts on whichever language you study, but you can switch any time.',
      example: 'Sitting English as a Second Language? Tap English for topics pitched at the 0510 oral.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="speaking-topics"]',
      title: 'Pick a topic to talk about',
      body: 'These are your exam-style speaking prompts — tap any one to open it. Each shows its English meaning underneath so you know what it’s asking before you commit.',
      example: 'Tap “Keluarga Saya” (My Family) to practise talking about the people you live with.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="speaking-badges"]',
      title: 'How long to talk, and your last score',
      body: 'The small tag shows a target length for your answer (in seconds) — a guide to how much to say, not a hard limit. Once you’ve tried a topic, a “Last: B…” badge also appears with your most recent band (out of 6) on it, so you can see yourself improving.',
      example: 'See “~90s”? Aim for about a minute and a half of talking to cover the topic well.',
      side: 'bottom', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Inside a topic',
      body: 'Once you open one: you get the prompt plus a few suggested cues to plan your answer (tap the speaker to hear the prompt read aloud). Then answer by speaking — the app transcribes you live — or by typing, which is a full option here because Malay speech recognition isn’t reliable everywhere; either way you’re graded on the words. You get an instant band out of 6 with a breakdown (discourse markers, formal vocabulary, variety, fillers, cues covered) and specific tips, you can “Listen back” to replay your own recording against a model read aloud, and a weak answer’s tips are saved to your Mistake Journal. A more detailed AI examiner grade is available too if you’ve set up AI grading.',
      example: 'No quiet place to speak? Tap “Type my answer instead” and you still get the full band and fixes.',
    },
  ],

  '/import': [
    {
      arrow: 'none',
      title: 'Tour: build your own deck 📥',
      body: 'Turn text you already have — a paste, or a PDF — into flashcards. The app finds the words worth learning, you pick the keepers, and they go straight into a deck you name. A quick walk through every control — tap Next.',
    },
    {
      selector: '[data-guide="import-tabs"]',
      title: 'Paste text, or upload a PDF',
      body: 'Two ways to bring material in. “Paste text” drops any passage straight into the box below. “Upload PDF” pulls the words out of a PDF file for you, into that same box, where you can tidy them up before scanning. (For tap-to-reveal reading, the PDF Reader does more — this page is for quickly mining a text for vocabulary.)',
      example: 'Got a chapter in a PDF? Tap “Upload PDF”, pick the file, and its text appears ready to scan.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="import-text"]',
      title: 'Your text goes here',
      body: 'Paste a passage here, or edit the text pulled from a PDF. It reads the language you study — Malay if you’re on the Malay course, English if you’re on the English one — so paste that language’s text and the meanings come out the right way round.',
      example: 'The more text you paste, the more words it can surface — a few paragraphs works well.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="import-deck"]',
      title: 'Name the deck first',
      body: 'Type a name for the deck these words will join, so you can keep one set apart from another. Leave it and everything goes into a deck called “Imported”.',
      example: 'Name it after your source — like “Chapter 3” or “News article” — so it’s easy to find in Study later.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="import-process"]',
      title: 'Process: find the words worth keeping',
      body: 'Tap Process and the app scans your text, recognising known words and common phrases and laying them out as tappable chips. You then pick only the ones you want — you’re never forced to take every word.',
      example: 'Pasted a long article? Process turns it into a tidy grid; tap just the handful you don’t already know.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="import-wordbyword"]',
      title: 'Or translate it word by word',
      body: 'Want the meaning of everything, in order? “Word-by-Word Translation” glosses every word in your text as a grid, each with a small coloured dot showing where its meaning came from — the built-in dictionary, a stemmed root, or machine translation. It’s a fast way to read a whole passage, not just mine it for new cards.',
      example: 'Reading a dense paragraph? Run Word-by-Word to see every word’s meaning at a glance.',
      side: 'top', align: 'center',
    },
    {
      arrow: 'none',
      title: 'After you Process',
      body: 'Once you’ve processed, the chips are colour-coded: green was found in the dictionary, purple is a known phrase, and grey is a word it didn’t recognise (tap a grey one and it tries to translate it for you). Tap chips to select them — each selected word shows its meaning with a speaker button to hear it — then tap “Add N cards to …” to send them into your deck. Grabbed one by mistake? An Undo button appears for ten seconds to take that batch back out.',
      example: 'Selected 8 words? Tap “Add 8 cards”, and if you grabbed one you didn’t mean to, tap Undo before it vanishes.',
    },
  ],

  // /mistakes is ENTIRELY centered cards. The journal has two mutually-exclusive
  // render states with no shared anchor — a celebratory EmptyState (the state a
  // brand-new student, with zero mistakes, launches ▶ in) and the populated
  // journal (the Fix button, filter pills, charts, per-mistake cards). Anchoring
  // to a populated-only control would fast-skip on the empty state, so every step
  // is a centered arrow:'none' card that teaches the same in BOTH states.
  '/mistakes': [
    {
      arrow: 'none',
      title: 'Tour: your Mistake Journal 📓',
      body: 'Every slip you make anywhere in the app — a missed word, a wrong affix (imbuhan), a weak essay or speaking answer — is collected here so you can turn it into a strength. A quick walk through what this page does — tap Next.',
    },
    {
      arrow: 'none',
      title: 'Fix your mistakes — a quick review pass',
      body: 'The button at the top runs a short recall-and-correction pass over the slips that matter most. For each one you try to remember the fix, reveal the answer, then mark it “Got it” (it leaves your queue) or “Still shaky” (it comes back next time). It’s a memory jog — kept separate from your spaced flashcards, so it never changes your study schedule.',
      example: 'Tap “Fix your mistakes” for a few focused minutes on exactly the things you keep getting wrong.',
    },
    {
      arrow: 'none',
      title: 'See where you slip most',
      body: 'Below the button, the journal helps you spot weak areas. The filter pills narrow the list by category — vocab, imbuhan, tense, spelling and more — each with a count. “Most Frequent Mistakes” charts the items you fail most often, “Weak Patterns” groups slips that share a grammar rule, and “Performance Trends” shows your weakest writing formats and speaking topics with a one-tap link to go practise them.',
      example: 'Imbuhan keeps topping the chart? That’s your signal to drill affixes next.',
    },
    {
      arrow: 'none',
      title: 'Turn a slip into a flashcard',
      body: 'Each mistake shows what you wrote versus the correct answer, how many times you’ve missed it, and where it came from. Tap ✓ to mark one fixed, or ＋ to promote a Malay slip into a real flashcard. Important misses are also added automatically to a “Mistakes” deck — and the “Mistakes deck” button at the bottom drops just those into a normal spaced-repetition study session.',
      example: 'Tap “Mistakes deck” to study only the words you’ve gotten wrong, scheduled like any other card.',
    },
  ],

  '/exam-rehearsal': [
    {
      arrow: 'none',
      title: 'Tour: a full exam dry-run 🏆',
      body: 'Sit a complete IGCSE mock in one go — reading, listening, writing and speaking, back to back, softly timed — and get one “Exam Readiness %” at the end. A quick walk through how to start — tap Next.',
    },
    {
      selector: '[data-guide="exam-stages"]',
      title: 'The four skills, one sitting',
      body: 'This is the run you’re about to sit, in order: read a passage and answer comprehension questions (8 min), listen to a short audio clip and answer on what you hear (6 min, when your browser can play audio), write a directed task tied to the passage (12 min), then defend your view aloud (10 min). The timers are soft nudges — they warn when you go over but never lock you out.',
      example: 'Pushed past a stage’s clock? It just shows “(over)” — you can keep going and still finish.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="exam-lang"]',
      title: 'Pick one syllabus to drill',
      body: 'Choose Bahasa Melayu or English so the whole rehearsal — passage, audio, writing and speaking — stays in one language. Bahasa Melayu draws on the IGCSE Malay (0546) catalogue; English uses the IGCSE English (0500 / 0510) one. It starts on whichever language you study, and your choice is remembered.',
      example: 'Sitting English? Tap English so every stage is in English, matching your real paper.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="exam-start"]',
      title: 'Start the clock',
      body: 'Tap to begin. The four stages run one after another — there’s no pause — so start when you’ve got a clear block of time (around 30 minutes). Finish the spoken defense and the app scores every skill and logs your readiness automatically.',
      example: 'Set aside half an hour, tap Start rehearsal, and treat it like the real thing.',
      side: 'top', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Your readiness score, on a schedule',
      body: 'When you finish, each skill is scored — comprehension and listening as a percentage, writing and speaking as a band out of 6 — and blended into one “Exam Readiness %”. Like a flashcard, the rehearsal then comes back on a spaced schedule (it tells you the next one is due in N days), and your recent attempts are listed here so you can watch the number climb. If your browser can’t play audio, the listening stage is skipped and your score is fairly worked out from the other three skills.',
      example: 'Do one each week and watch your readiness % rise as the real exam approaches.',
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
