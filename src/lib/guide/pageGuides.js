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
    // Centered, NOT anchored: the "Today's Loop" tile carrying
    // [data-guide="dashboard-mistakes"] auto-hides until something is caught/drilled
    // (`{showLoop && …}` in Dashboard.jsx), so on a fresh dashboard the node is
    // absent — an arrow there would stall 800ms then silently skip (the
    // GOAL-backlog-#5 / Bug-A class, caught by guide-empty-state-chaos.spec.js).
    // A centered card teaches the Mistake Journal in any state.
    {
      arrow: 'none',
      title: 'Mistake Journal',
      body: 'Every slip you make is logged, and the important ones come back as targeted re-drills until you fix them — your Dashboard surfaces today’s progress on them once you’ve caught a few.',
      example: 'Miss a “ber-” word twice and it queues a drill on exactly that.',
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

  // /study is ENTIRELY centered cards. Study has TWO mutually-exclusive render
  // states with NO shared anchor: the "No cards to study!" EmptyState (the state a
  // fresh-store student lands in, since the deck is empty until they load a pack or
  // import) and the active session (deck selector, mode pills, stats, the card, the
  // skip row — all gated behind `if (!sorted.length) return <EmptyState>` in
  // Study.jsx, so NONE mount on an empty deck). Any ANCHORED step would stall 800ms
  // then silently skip on the empty deck — five of them = a ~4s hang + a tour that
  // teaches nothing (the GOAL-backlog-#5 / Bug-A class, caught by
  // guide-empty-state-chaos.spec.js). So every step is a centered arrow:'none' card
  // that renders identically in BOTH states — zero JSX anchors, lowest regression
  // risk (mirrors /mistakes + /saved-cloze + /for-you). An active session enters
  // theater mode, but on the EMPTY landing — where the tour is launched — theater
  // mode is off, so the header ▶ is the entry.
  // MICRO-GUIDE STYLE (2026-06-24, UDL + ADD — spec: docs/superpowers/specs/
  // 2026-06-24-micro-guide-udl-style.md): one idea per step, ≤~14 words, action/
  // benefit first, NO separate `example:` line (fold a tiny cue inline only where
  // a control isn't self-evident), ≤5 steps. /study is the worked-example pilot.
  // Still entirely centered arrow:'none' cards (empty-state-safe — Study.jsx:48
  // returns <EmptyState> on a fresh deck, so anchors would skip-hang).
  '/study': [
    {
      arrow: 'none',
      title: 'Tour: study 🎓',
      body: 'Turn words into long-term memory — pick a deck, practise, grade honestly. Tap Next.',
    },
    {
      arrow: 'none',
      title: 'Pick your deck',
      body: 'The top row switches decks. Malay and English never mix in one session.',
    },
    {
      arrow: 'none',
      title: '7 ways to practise',
      body: 'Same word, 7 ways: flip, quiz, type, listen, cloze, speak — or write it from memory (Produce).',
    },
    {
      arrow: 'none',
      title: 'Your deck at a glance',
      body: 'Three counts — DUE (clear today), LEARNING (bedding in), KNOWN (solid).',
    },
    {
      arrow: 'none',
      title: 'Grade honestly, or skip',
      body: 'Recall, reveal, then tap Again/Hard/Good/Easy. Next Card skips. (Space flips; 1–4 grade.)',
    },
  ],

  // MICRO-GUIDE STYLE (2026-06-24, UDL + ADD — spec: docs/superpowers/specs/
  // 2026-06-24-micro-guide-udl-style.md): one idea per step, ≤~14 words, action/
  // benefit first, NO separate `example:` line, ≤5 steps. Already 4 steps — bodies
  // shortened, example lines dropped. The 3 config-screen controls stay ANCHORED
  // (they all render on the landing/config screen, before "Begin" enters the
  // theater-mode session). Intro keeps "Smart Session" + the speaking step keeps
  // "mic" (guide-smart-study.spec.js asserts both).
  '/smart-study': [
    {
      arrow: 'none',
      title: 'Tour: your daily Smart Session 🧠',
      body: 'Your daily adaptive loop — recognise each word, then produce it from memory. Tap Next.',
    },
    {
      selector: '[data-guide="smartstudy-speaking"]',
      title: 'Mic on, or mic off?',
      body: 'Public Mode is tap-and-type only. Mic Enabled adds a short spoken task.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="smartstudy-begin"]',
      title: 'Begin the cycle',
      body: 'Starts ~20 minutes of short cycles, leading with what’s due and recently wrong.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="smartstudy-manual"]',
      title: 'Prefer to choose your own mode?',
      body: 'Jumps to plain Study, where you pick the deck and one practice mode.',
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

  // MICRO-GUIDE STYLE (2026-06-24, UDL + ADD — spec: docs/superpowers/specs/
  // 2026-06-24-micro-guide-udl-style.md): one idea per step, ≤~14 words, action/
  // benefit first, NO separate `example:` line, ≤5 steps. The flow setup → write →
  // analyze → improve maps to 5 tight steps.
  // Always-mounted controls (lang/compose/analyze render whenever lang!=='templates',
  // the default) ARE anchored. The format selector is folded into the setup step's
  // body (its [data-guide="writing-format"] attribute stays in Writing.jsx for a
  // future arrow / cross-check). The CONDITIONAL controls are taught via centered
  // arrow:'none' cards that render in ANY state, so the tour never skip-hangs:
  //   • the "Try a sample" CTA (showSampleCta = lang!=='templates' && !text &&
  //     !results) — folded inline into the centered-safe compose step's cue, never
  //     anchored to the conditional node;
  //   • the task picker (writing-task: only when the format has tasks) + the
  //     "Improve your answer" ReattemptPanel (only after a graded task misses a
  //     requirement) — both taught by the final centered card.
  '/writing': [
    {
      arrow: 'none',
      title: 'Tour: writing ✍️',
      body: 'Write an essay, get an IGCSE band, then fix exactly what’s flagged. Tap Next.',
    },
    {
      selector: '[data-guide="writing-lang"]',
      title: 'Tell it what you’re writing',
      body: 'Pick your exam, then the essay format — marking follows both.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="writing-compose"]',
      title: 'Write or paste your essay',
      body: 'Type or paste your draft here. No essay? Tap “Try a sample”.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="writing-analyze"]',
      title: 'Get your band + fixes',
      body: 'Tap Analyze for an instant band and the exact words to fix.',
      side: 'top', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Answer a task, then improve it',
      body: 'Pick a task and it grades whether you answered it — then guides a rewrite.',
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

  '/for-you': [
    {
      arrow: 'none',
      title: 'Tour: your For-You home ✨',
      body: 'A personalized home, built entirely from what you have already been doing in the app — no AI needed. Each time you open it, it hands you a ready-made queue: words to review, your weak topics, saved words, and shortcuts toward your goal — so you never have to decide what to study next. A quick walk through the shelves — tap Next.',
    },
    {
      arrow: 'none',
      title: 'Keep going — today’s plan, as quick-starts',
      body: 'The first shelf turns today’s unfinished plan into tap-to-start cards — the very same plan as your Dashboard. Each card names a task and how much is left, with a Start link; tap one to jump straight into it. Swipe sideways to see them all.',
      example: 'Tap a card to pick up exactly where your daily plan left off — no deciding required.',
    },
    {
      arrow: 'none',
      title: 'Picked for you — shaped around your weak spots',
      body: 'This shelf builds one focused session around the topics you have been getting wrong, shown as little chips, with a single “Start session” button. It is the fastest way to revise what actually needs work — not a random pile. (You will see chips only once the app knows your weak spots; before then it just pulls what you owe for review.)',
      example: 'See chips for the topics you keep missing, then tap “Start session” to drill exactly those.',
    },
    {
      arrow: 'none',
      title: 'Still remember these? — a no-stakes memory check',
      body: 'A quick self-test on words you learned a while ago but have not seen recently. Each card hides its meaning — try to recall it, then tap “Show meaning” to check (and 🔊 to hear it). This is a low-stakes jog, so it never changes your spaced-repetition schedule — getting one wrong here costs you nothing.',
      example: 'Glance at a few between sessions to keep older words from slipping away.',
    },
    {
      arrow: 'none',
      title: 'Saved words & shortcuts to your goal',
      body: 'Two more shelves help you steer. “From your saved words” gathers the words you captured while reading, with a “Practise saved words” button to drill just those. “Toward your goal” shows shortcut buttons to the surfaces that move you toward the goal you set in Settings — so the right practice is one tap away.',
      example: 'Aiming to lift your speaking? The goal shelf can put speaking practice right on your home screen.',
    },
    {
      arrow: 'none',
      title: 'Make a custom deck (optional) — and a fresh start',
      body: 'At the bottom is a “Make me a deck” panel: add your own free AI key (OpenRouter, Gemini or Ollama) in Settings and you can generate a brand-new deck on any topic — handy for a subject the built-in words do not cover; with no key it just shows a quick link to add one. It is entirely optional — every shelf above works with no AI. And if you are brand new, this page first shows a friendly “Your home fills up as you learn” card with two quick starts (Learn new words · Import your own text), so do one session and the shelves light up.',
      example: 'No key set? Ignore this panel — the personalized shelves above still do all the work.',
    },
  ],

  '/word-families': [
    {
      arrow: 'none',
      title: 'Tour: Word Families 🌳',
      body: 'Malay builds many words from one root by adding imbuhan (prefixes and suffixes). This page shows each root and ALL its derived forms as a visual family tree, so you can learn a whole set of related words at once — and see the pattern — instead of memorising each word cold. A quick walk through how it works — tap Next.',
    },
    {
      selector: '[data-guide="wordfamilies-search"]',
      title: 'Find a root word',
      body: 'Type here to search the 41 root words. It matches three ways — the root itself, any derived form, or an English meaning — so you can come at it from whichever you remember. The list below filters as you type.',
      example: 'Type tulis, menulis, or write — all three land on the same family.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="wordfamilies-roots"]',
      title: 'Tap a root to open its family',
      body: 'Each row is one root — its English meaning sits beside it, and the small number badge tells you how many derived forms it has. Tap any row to expand it into its visual family tree (tap again to close).',
      example: 'A root like tulis (write) carries 7 forms — menulis, penulis, tulisan and more.',
      side: 'bottom', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Inside a family tree',
      body: 'When you open a root, the root sits in the middle and its forms branch around it. They are colour-coded by part of speech — verbs (Kata Kerja), nouns (Kata Nama) and adjectives (Kata Sifat) — with a legend on top counting each, so you can see at a glance what kinds of words the root makes. Tap any node to HEAR it spoken in Malay; tap the small + on a form to add that word to your flashcard deck (it turns into a green ✓ — tap again to remove); or tap the node itself for a detail card with its meaning and imbuhan type. Below the tree, every form is also listed as plain text. And if you have logged mistakes, a “Related to Your Mistakes” panel up top surfaces the roots behind the words you recently got wrong — so you can drill the whole family.',
      example: 'See menulis, penulis and tulisan all grow from tulis — learn the pattern once and you unlock the set.',
    },
  ],

  '/cikgu': [
    {
      arrow: 'none',
      title: 'Tour: Cikgu Maya 🧑‍🏫',
      body: 'Cikgu Maya is your built-in Malay tutor — ask anything about grammar, imbuhan (affixes), vocabulary, writing or IGCSE exam technique and get an instant answer, any time. A quick walk through how to ask — tap Next.',
    },
    {
      selector: '[data-guide="cikgu-mode"]',
      title: 'Two ways to get answers',
      body: '**Expert** is rule-based, instant and always free — it answers from a built-in knowledge bank, so it works offline and never uses a quota. **AI** uses a language model (free via Gemini or OpenRouter if you add a key, otherwise a small daily quota — the number shows how many calls are left today) for open-ended questions in your own words. Start with Expert; switch to AI when you want a more tailored explanation.',
      example: 'Want a quick rule? Stay on Expert. Want to ask “why is my sentence wrong?” in your own words? Tap AI.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="cikgu-input"]',
      title: 'Ask your question here',
      body: 'Type any question and press Enter (or tap Send). If your device supports speech, a mic button lets you dictate instead of typing — and a Voice mode (top-right) lets you hold a full spoken conversation: tap the mic, ask out loud, and Cikgu reads the answer back word-by-word (say “stop” to halt).',
      example: 'Try: “Explain the meN- prefix” or “Give me 3 formal connectors for an essay”.',
      side: 'top', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Suggested questions, topics & answers',
      body: 'On a fresh chat you also get suggested questions (shaped by your recent mistakes) and a Browse Topics library — Imbuhan, Tatabahasa (grammar), Kosa Kata (vocabulary), Penulisan (writing), Lisan (speaking), Peribahasa (proverbs) and Exam Tips — tap any topic to read a focused lesson, with example words you can hear and links to related topics. Every answer is tagged Expert or AI so you always know its source, and you can clear the whole conversation any time with the 🗑 button.',
      example: 'New and not sure what to ask? Tap a Browse Topics entry like “Imbuhan (Affixes)” to learn a whole area in one go.',
    },
  ],

  // /dictation mirrors the Listening/Speaking shape: the SETUP screen is the
  // landing state (the language toggle + Start button always render there), so
  // those two are anchored; the listen-and-type loop (player, typing box,
  // word-by-word diff, score) only mounts after Start, so it is taught in a
  // centered arrow:'none' summary that renders in any state (no missing-anchor
  // skip). Dictation never enters theater mode → the header ▶ is the entry.
  '/dictation': [
    {
      arrow: 'none',
      title: 'Tour: dictation ⌨️',
      body: 'Dictation trains three skills at once: you HEAR a sentence — you never see it — type exactly what you heard, then get a word-by-word check. It sharpens listening, spelling and vocabulary together. A quick walk through how to start — tap Next.',
    },
    {
      selector: '[data-guide="dictation-lang"]',
      title: 'Malay or English?',
      body: 'Pick which language to take dictation in — Bahasa Melayu or English. The sentences and the playback voice both match your choice, so practise in the language you’re studying.',
      example: 'Studying English? Tap English and you’ll hear and type English sentences.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="dictation-start"]',
      title: 'Start a set',
      body: 'Tap to begin — each set is five short sentences drawn from the listening passages. You can only start if your device can read text aloud; if it can’t, a note tells you and the button stays greyed out.',
      example: 'Got a few minutes? One set is five sentences — a quick, focused burst.',
      side: 'top', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Inside a set',
      body: 'Once you start: tap Play to hear the sentence — the text stays hidden, so you’re tested purely on listening. You can replay it once, and that second play is a little slower to help you catch what you missed; the typing box unlocks after the first play. Type exactly what you heard, then tap Check for a word-by-word result — each word is marked right (green ✓) or wrong (red ✗), with the full sentence revealed underneath. Work through all five for an average score; content words you missed are saved to your Mistake Journal so they come back later.',
      example: 'Missed a word on the first listen? Use your one slower replay, then type your best guess — a wrong word is queued in your Mistakes to revisit.',
    },
  ],

  // /cloze-listening shares /dictation's SETUP-screen shape: the language toggle
  // + Start button render on the landing/setup screen, so those two are anchored;
  // the listen-and-FILL loop (player, gap boxes, per-gap ✓/✗ diff, score) only
  // mounts after Start, so it is taught in a centered arrow:'none' summary that
  // renders in any state (no missing-anchor skip). The page's whole point: the
  // transcript stays VISIBLE with 1–2 gaps (a scaffold), making it one rung easier
  // than dictation. Never enters theater mode → the header ▶ is the entry.
  '/cloze-listening': [
    {
      arrow: 'none',
      title: 'Tour: cloze listening 👂',
      body: 'Cloze listening trains your ear and your vocabulary together: you HEAR a sentence while you read its transcript with one or two words blanked out, and you fill in just the missing words. Because the rest of the sentence stays visible to scaffold you, it’s a gentler rung than full dictation (where the whole sentence is hidden). A quick walk through how to start — tap Next.',
    },
    {
      selector: '[data-guide="clozelistening-lang"]',
      title: 'Malay or English?',
      body: 'Pick which language to practise in — Bahasa Melayu or English. The sentences and the playback voice both match your choice, so you train in the language you’re studying.',
      example: 'Studying English? Tap English and you’ll hear and fill English sentences.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="clozelistening-start"]',
      title: 'Start a set',
      body: 'Tap to begin — each set is five short sentences drawn from the listening passages. You can only start if your device can read text aloud; if it can’t, a note tells you and the button stays greyed out.',
      example: 'A few minutes free? One set is five sentences — a short, focused burst.',
      side: 'top', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Inside a set',
      body: 'Once you start: tap Play to hear the sentence — its transcript is shown with one or two gaps to fill (that visible scaffold is what makes this easier than dictation). You get one replay, and that second play is a little slower; the gap boxes unlock after the first play. Type each missing word, then tap Check — every gap is marked right (green ✓) or wrong (red ✗), and a wrong gap shows your answer next to the correct word. Work through all five for an average score; words you missed are saved to your Mistake Journal so they come back later.',
      example: 'Caught most of the sentence but missed one word? Use your slower replay, fill your best guess — a wrong gap is queued in your Mistakes to revisit.',
    },
  ],

  // /saved-cloze is ENTIRELY centered cards. SavedWordCloze.jsx has two
  // mutually-exclusive render states with NO shared anchor — a "No saved words
  // yet" EmptyState (the state a fresh-store student lands in, since the session
  // is built from the personal 'Saved' deck) and the active cloze session (the
  // sentence-with-a-blank, the typing box, Check / Show answer, the Got-it /
  // Needed-the-answer rating). An anchored step would fast-skip on the empty
  // state (the GOAL-backlog-#5 / Bug-A class), so every step is a centered
  // arrow:'none' card that teaches the same in BOTH states — zero JSX anchors,
  // lowest regression risk (mirrors /mistakes + /for-you). No "Try a sample":
  // the session is by definition over the learner's OWN saved words, so there is
  // no generic sample to inject. Never enters theater mode → the header ▶ is the
  // entry.
  '/saved-cloze': [
    {
      arrow: 'none',
      title: 'Tour: practise your saved words 📝',
      body: 'This turns the words YOU saved while reading into quick fill-the-blank (and write-from-memory) drills. The point is to *produce* each word from memory — the hardest, most lasting kind of recall — instead of just recognising it on a flashcard. A quick walk through how it works — tap Next.',
    },
    {
      arrow: 'none',
      title: 'Built from the words you saved',
      body: 'This session draws only on your “Saved” deck — the words you personally captured while reading (tap-select a Malay word in the PDF Reader or a passage to translate and keep it). If you haven’t saved any yet, you’ll see a “No saved words yet” prompt with a shortcut to Import; once you’ve saved a few, they show up here as drills.',
      example: 'Saved “penduduk” while reading? It comes back here for you to produce in a sentence.',
    },
    {
      arrow: 'none',
      title: 'Fill the blank — or write it from memory',
      body: 'Each word appears blanked inside its own example sentence: you read the sentence and type the missing Malay word, with its English meaning shown as a clue. If a word has no example sentence, you simply get the meaning and write the word from memory. Type your answer and tap Check — or tap “Show answer” if you’re stuck. Producing it yourself (the generation effect) builds far stronger memory than picking from options.',
      example: 'Sentence with a “_____” and the clue “resident / inhabitant”? Type penduduk and tap Check.',
    },
    {
      arrow: 'none',
      title: 'Rate yourself — it tunes your spacing',
      body: 'These are real flashcards, so your honest rating decides when each word comes back. After you check, tap “Got it” if you recalled it cleanly, or “Needed the answer” if you had to reveal it — that brings the word back sooner, but it’s NOT logged as a mistake, because revealing isn’t failing. Work through the set for a quick GOT IT / REVEALED tally at the end, which also counts toward your streak and daily goal.',
      example: 'Had to peek? Tap “Needed the answer” so the app shows that word again soon — no penalty.',
    },
  ],

  // /settings is the LAST page in the rollout (T25 → Phase 3c complete, R1
  // satisfied). Every control lives on ONE scrollable landing, so the meaningful
  // sections are ANCHORED on always-mounted wrapper divs: the App-guide card
  // (reusing its existing [data-tour="guide-card"]), the Study-language card, the
  // Preferences card, and the Backup & Share card. The two OPTIONAL clusters —
  // cloud sign-in (Account) and the BYOK AI-provider keys + translator engine
  // (some English-only / provider-gated) — are taught in a final centered
  // arrow:'none' summary so a partly-conditional section never skip-hangs.
  // Settings never enters theater mode → the header ▶ is the entry. Every line is
  // grounded against Settings.jsx (no confident-wrong): the card copy itself says
  // "Malay (IGCSE 0546)" / "English (IGCSE 0510)", "sync across devices", and the
  // free-fallback rule for AI keys.
  '/settings': [
    {
      arrow: 'none',
      title: 'Tour: settings & tools ⚙️',
      body: 'This is where you set the app up the way YOU study — your language, the look and feel, your daily goal, and where your data lives. Nothing here is required to start learning; the defaults already work. A quick walk through what each section does — tap Next.',
    },
    {
      selector: '[data-tour="guide-card"]',
      title: 'Replay any tour from here',
      body: 'This card is your home for the guided tours. Tap “Quick tour” for a 60-second overview or “Full tour” to visit every page — and you can re-run any single page’s ▶ deep dive on that page too. If you ever feel lost, come back here.',
      example: 'Forgot how a page works? Open it and tap ▶, or start the Full tour from this card.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="settings-language"]',
      title: 'Pick your language — the key switch',
      body: 'The most important setting: are you revising Malay (IGCSE 0546) or English (IGCSE 0510)? Switching here changes which deck you study and the voice used for listening and speaking. Your Malay and English decks stay completely separate, so progress in one never leaks into the other.',
      example: 'Sitting the English paper? Switch to English and every study mode follows.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="settings-preferences"]',
      title: 'Make it comfortable to study',
      body: 'Appearance and accessibility live here: Dark/Light theme, a dyslexia-friendly font, High contrast, emoji “Word Pictures” on cards, and underlining the words you’re learning while you read. You also set your Daily Goal (10–50 cards) and a few learning aids like adaptive feedback. Turn on whatever lowers the effort for you.',
      example: 'Find text hard to read? Turn on the dyslexia-friendly font and High contrast.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="settings-data"]',
      title: 'Keep your progress safe',
      body: 'Your work is saved on this device by default. “Backup All Data” downloads a file you can keep or move to another device; “Restore from Backup” loads one back; “Share Deck via Link” sends a deck to a friend. Just above, Export sends your cards out to CSV, Anki or PDF.',
      example: 'New phone? Tap Backup All Data here, then Restore from Backup on the new device.',
      side: 'top', align: 'center',
    },
    {
      arrow: 'none',
      title: 'Optional: cloud sync & AI extras',
      body: 'Two optional power-ups sit lower on this page — both fully optional. Under “Account”, sign in to sync your cards, writing history and streaks across devices (everything still works offline if you don’t). Under “AI providers”, you can paste your own free API key (OpenRouter, Gemini or Ollama) to unlock richer roleplay scoring, the “Sharper read” photo OCR, and quality translation — but every AI feature already has a free, built-in fallback, so a key is never required. The same area picks your translator and writing-tutor model.',
      example: 'Want your progress on two devices? Sign in under Account — no payment, ever.',
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
