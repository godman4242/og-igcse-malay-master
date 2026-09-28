// pageGuides.js — Full Page Guide content (LAZY: loaded only when ▶ is tapped).
// PURE data + buildPageSteps. Prose is hand-authored + checked against the page
// code (no AI, no confident-wrong — the load-bearing learning-tool rule).
//
// STYLE (Kheshav 2026-09-28 — "the Netflix rule": 20 short episodes beat one
// 10-hour film). A tour is MANY tiny steps, each lighting up ONE control:
//   • one control per step, highlighted on the real page (the rest is dimmed);
//   • `body` ≤ 14 words, plain words a grandparent would get — no jargon;
//   • no examples. Let the learner find the use cases by clicking.
// Pinned by pageGuides.test.js. Supersedes the 2026-06-24 "≤5 steps" cap.
//
// Anchors are [data-guide="{page}-{control}"] (or a reused [data-tour="…"]) on the
// page component. A page has different controls in different states (the reader
// before vs after a file loads, an empty deck vs a full one), so an anchored step
// whose control is NOT on screen when the tour starts is left out — the tour only
// ever highlights what the learner can actually see. A step with no selector is a
// centred card that always shows (use it only for what has no control to point at).
//
// Step shape: { selector?, title, body, side?, align? }

export const PAGE_GUIDES = {
  '/': [
    { title: 'Your home page 🏠', body: 'A quick look at each part. Tap Next.' },
    { selector: '[data-guide="dashboard-starter"]', title: 'Start here', body: 'New? Tap to add about 45 starter words.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="dashboard-lang"]', title: 'Malay or English?', body: 'Pick the language you are studying right now.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="dashboard-goal"]', title: 'Daily goal', body: 'Cards you reviewed today. Try to fill the ring.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="dashboard-stats"]', title: 'Your numbers', body: 'Cards due now, your streak, and words you know well.', side: 'top', align: 'center' },
    { selector: '[data-guide="dashboard-mistakes"]', title: 'Today’s mistakes', body: 'Mistakes caught today, and how many you have practised again.', side: 'top', align: 'center' },
    { selector: '[data-tour="dashboard-cta"]', title: 'Smart Session', body: 'Today’s mixed practice, picked for you. The best place to start.', side: 'top', align: 'center' },
    { selector: '[data-guide="dashboard-quick-actions"]', title: 'Quick buttons', body: 'Review your cards, mix a round, or practise speaking.', side: 'top', align: 'center' },
    { selector: '[data-guide="dashboard-exam"]', title: 'Practice exam', body: 'A timed mock exam that scores how ready you are.', side: 'top', align: 'center' },
  ],

  // The reader shows DIFFERENT controls before and after a file is open. Empty:
  // sample / choose / photo / record / language. Open: the toolbar + the text.
  // Each state gets its own tour from the same list; ▶ again after opening a file.
  '/pdf-reader': [
    { title: 'Reading lab 📖', body: 'Read Malay, tap words you don’t know, keep the useful ones.' },
    { selector: '[data-guide="pdf-sample"]', title: 'Try a sample', body: 'No file? Tap here to open a practice passage.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-choose"]', title: 'Open your file', body: 'Tap here to open a PDF, photo or recording.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-photo"]', title: 'Take a photo', body: 'Snap a printed page. It is read on your device.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-record"]', title: 'Record', body: 'Record someone speaking. It becomes text you can read.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-lang"]', title: 'Malay or English?', body: 'Tell the app which language your file is in.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-replace"]', title: 'Replace file', body: 'Tap to open a different PDF, photo or recording.', side: 'bottom', align: 'start' },
    { selector: '[data-guide="pdf-reading"]', title: 'Tap a word', body: 'Tap any word to see what it means in English.', side: 'top', align: 'center' },
    { selector: '[data-guide="pdf-mode"]', title: 'Translate or Select', body: 'Translate: tap for meanings. Select: drag across words to make flashcards.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-translate"]', title: 'Translate page', body: 'Gets meanings for new words. Each stays hidden until you tap it.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-unknowns"]', title: 'List unknowns', body: 'Lists every word the dictionary doesn’t know, with its meaning.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-sentences"]', title: 'Sentences', body: 'Show a whole sentence in English when one word isn’t enough.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-fulltranslation"]', title: 'Full translation', body: 'Read the whole text in English, paragraph by paragraph.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="pdf-view"]', title: 'Reading view', body: 'Reflow: easy-to-read text. A PDF also has Layout: the page as printed.', side: 'bottom', align: 'center' },
  ],

  '/study': [
    { title: 'Study 🎓', body: 'Practise your words until they stick. Tap Next.' },
    { selector: '[data-guide="study-empty"]', title: 'No cards yet?', body: 'Tap here to add some words, then come back.', side: 'top', align: 'center' },
    { selector: '[data-guide="study-deck"]', title: 'Pick a deck', body: 'Choose which set of words to practise.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="study-modes"]', title: '7 ways to practise', body: 'Flip, quiz, type, listen, fill the gap, speak, or write it.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="study-stats"]', title: 'Your counts', body: 'Due: practise today. Learning: still new. Known: you’ve got it.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="study-card"]', title: 'Answer and grade', body: 'Answer the card, then tap how well you knew it.', side: 'top', align: 'center' },
    { selector: '[data-guide="study-skip"]', title: 'Skip a card', body: 'Tap Next Card to skip this one for now.', side: 'top', align: 'center' },
  ],

  '/smart-study': [
    { title: 'Smart Session 🧠', body: 'Your daily mixed practice, picked for you. Tap Next.' },
    { selector: '[data-guide="smartstudy-speaking"]', title: 'Mic on or off?', body: 'Public Mode: tap and type only. Mic Enabled adds speaking.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="smartstudy-begin"]', title: 'Begin', body: 'Starts about 20 minutes of short practice rounds.', side: 'top', align: 'center' },
    { selector: '[data-guide="smartstudy-manual"]', title: 'Choose your own', body: 'Rather pick yourself? This opens plain Study instead.', side: 'top', align: 'center' },
  ],

  '/practice': [
    { title: 'Practice hub 🗂️', body: 'Every way to practise, grouped by exam skill. Tap Next.' },
    { selector: '[data-guide="practice-speaking"]', title: 'Speaking', body: 'Roleplay, speaking practice, and Cikgu Maya, your tutor.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="practice-writing"]', title: 'Writing', body: 'Get essays marked, and fix your mistakes.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="practice-reading"]', title: 'Reading & listening', body: 'Passages, audio, dictation, and the PDF reader.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="practice-grammar"]', title: 'Grammar & words', body: 'Grammar drills, word families, and your saved words.', side: 'top', align: 'center' },
    { selector: '[data-guide="practice-review"]', title: 'Review', body: 'Flashcards, and the full practice exam.', side: 'top', align: 'center' },
    { selector: '[data-guide="practice-tools"]', title: 'Tools', body: 'Import your own text, or change settings.', side: 'top', align: 'center' },
    { selector: '[data-guide="practice-cue"]', title: 'Live badges', body: 'A small badge appears on a tile when something there needs you.', side: 'top', align: 'center' },
  ],

  '/roleplay': [
    { title: 'Speaking room 🎙️', body: 'Practise the speaking exam. The app plays the examiner. Tap Next.' },
    { selector: '[data-guide="roleplay-lang"]', title: 'Malay or English?', body: 'Pick which speaking exam you are practising.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="roleplay-tabs"]', title: 'Scenarios or History', body: 'Scenarios: start one now. History: see your past scores.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="roleplay-scenario"]', title: 'Pick a scenario', body: 'Each card is one speaking scene. Tap its button to start.', side: 'top', align: 'center' },
  ],

  '/grammar': [
    { title: 'Grammar drills 📝', body: 'Practise the grammar rules the exam tests. Tap Next.' },
    { selector: '[data-guide="grammar-mode"]', title: 'SRS or Cram', body: 'SRS: practise what’s due. Cram: everything once, before an exam.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="grammar-lang"]', title: 'Malay or English?', body: 'Pick which language’s grammar to practise.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="grammar-tabs"]', title: 'Pick a skill', body: 'Each tab is a kind of drill. Red numbers show what’s due.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="grammar-drill"]', title: 'Answer here', body: 'Type or tap your answer. You’ll see the rule after.', side: 'top', align: 'center' },
  ],

  '/writing': [
    { title: 'Writing ✍️', body: 'Write an essay and get an exam band, with fixes. Tap Next.' },
    { selector: '[data-guide="writing-sample"]', title: 'Try a sample', body: 'No essay yet? Tap to load a sample one.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="writing-lang"]', title: 'Which exam?', body: 'Pick English, Bahasa Melayu, or ready-made Templates.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="writing-format"]', title: 'Essay type', body: 'Pick the kind of essay, or leave it on Auto-detect.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="writing-task"]', title: 'Pick a question', body: 'Optional: choose a task, and it checks you answered it.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="writing-compose"]', title: 'Write here', body: 'Type or paste your essay in this box.', side: 'top', align: 'center' },
    { selector: '[data-guide="writing-analyze"]', title: 'Get your mark', body: 'Tap for your band and the exact words to fix.', side: 'top', align: 'center' },
  ],

  '/comprehension': [
    { title: 'Reading 📚', body: 'Read a short passage, then answer questions. Tap Next.' },
    { selector: '[data-guide="comprehension-passages"]', title: 'Pick a passage', body: 'Tap one to start reading.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="comprehension-badges"]', title: 'Pick your level', body: 'Labels show language, topic, difficulty and how many questions.', side: 'bottom', align: 'center' },
    { title: 'Answering', body: 'Each answer is marked and explained. Misses are saved for review.' },
  ],

  '/listening': [
    { title: 'Listening 🎧', body: 'Hear a passage, then answer questions. Tap Next.' },
    { selector: '[data-guide="listening-passages"]', title: 'Pick a passage', body: 'Tap one to open it.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="listening-badges"]', title: 'Pick your level', body: 'Labels show language, difficulty and how many questions.', side: 'bottom', align: 'center' },
    { title: 'Listening', body: 'Tap Play. The words stay hidden, just like the real exam.' },
  ],

  '/speaking': [
    { title: 'Speaking 🎤', body: 'Answer exam questions out loud and get a band. Tap Next.' },
    { selector: '[data-guide="speaking-lang"]', title: 'Malay or English?', body: 'Pick which speaking exam you are practising.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="speaking-topics"]', title: 'Pick a topic', body: 'Tap a topic to open it. Its English meaning is underneath.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="speaking-badges"]', title: 'Time and last score', body: 'How long to talk, and your last band once you’ve tried.', side: 'bottom', align: 'center' },
    { title: 'Answering', body: 'Speak or type your answer. You get a band out of 6.' },
  ],

  '/import': [
    { title: 'Make your own cards 📥', body: 'Turn any text into flashcards. Tap Next.' },
    { selector: '[data-guide="import-tabs"]', title: 'Paste or PDF', body: 'Paste text, or pull the text out of a PDF.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="import-text"]', title: 'Your text', body: 'Paste text in the language you’re studying.', side: 'top', align: 'center' },
    { selector: '[data-guide="import-deck"]', title: 'Name the deck', body: 'Where these cards go. Left as is, they go to “Imported”.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="import-process"]', title: 'Process', body: 'Finds useful words. Tap the ones you want to keep.', side: 'top', align: 'center' },
    { selector: '[data-guide="import-wordbyword"]', title: 'Word by word', body: 'Shows the meaning of every word in your text.', side: 'top', align: 'center' },
    { title: 'Add your cards', body: 'After Process, tap words to pick them, then tap “Add cards”.' },
  ],

  '/mistakes': [
    { title: 'Mistake Journal 📓', body: 'Mistakes from the whole app, saved here so you can fix them.' },
    { selector: '[data-guide="mistakes-empty"]', title: 'No mistakes yet', body: 'Keep studying. Any mistakes you make will show up here.', side: 'top', align: 'center' },
    { selector: '[data-guide="mistakes-fix"]', title: 'Fix your mistakes', body: 'A quick practice round on the mistakes that matter most.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="mistakes-filters"]', title: 'Filter by type', body: 'Show just one kind, like vocab or spelling.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="mistakes-frequent"]', title: 'Most frequent', body: 'The words you get wrong most often.', side: 'top', align: 'center' },
    { selector: '[data-guide="mistakes-trends"]', title: 'Weakest areas', body: 'Your weakest essay types and speaking topics, with a practise link.', side: 'top', align: 'center' },
    { selector: '[data-guide="mistakes-patterns"]', title: 'Weak patterns', body: 'Mistakes grouped by the grammar rule behind them.', side: 'top', align: 'center' },
    { selector: '[data-guide="mistakes-list"]', title: 'Each mistake', body: 'Tap ✓ once it’s fixed, or ＋ to make it a flashcard.', side: 'top', align: 'center' },
    { selector: '[data-guide="mistakes-decks"]', title: 'Practise them', body: 'Study all your cards, or just your Mistakes deck.', side: 'top', align: 'center' },
  ],

  '/exam-rehearsal': [
    { title: 'Practice exam 🏆', body: 'A full mock exam in one go, with one readiness score. Tap Next.' },
    { selector: '[data-guide="exam-stages"]', title: 'Four parts', body: 'Reading, listening, writing, then speaking. Timers never lock you out.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="exam-lang"]', title: 'Malay or English?', body: 'Pick one language for the whole exam.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="exam-start"]', title: 'Start', body: 'Allow about 30 minutes. The parts run back to back.', side: 'top', align: 'center' },
    { title: 'Your score', body: 'You get a Readiness %, and it tells you when to try again.' },
  ],

  '/for-you': [
    { title: 'For You ✨', body: 'Practice picked from what you’ve been doing. Tap Next.' },
    { selector: '[data-guide="foryou-start"]', title: 'Just starting?', body: 'Learn some words or import text. Then this page fills up.', side: 'top', align: 'center' },
    { selector: '[data-guide="foryou-focus"]', title: 'Tune your focus', body: 'Lean your next plan toward speaking, writing, or grammar.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="foryou-stand"]', title: 'Where you stand', body: 'How far along you are in each skill.', side: 'top', align: 'center' },
    { selector: '[data-guide="foryou-keep-going"]', title: 'Keep going', body: 'Today’s plan. Tap a card to jump straight in.', side: 'top', align: 'center' },
    { selector: '[data-guide="foryou-picked"]', title: 'Picked for you', body: 'One session built around what you most need to review.', side: 'top', align: 'center' },
    { selector: '[data-guide="foryou-still-remember"]', title: 'Still remember these?', body: 'Older words to test yourself on. Getting one wrong costs nothing.', side: 'top', align: 'center' },
    { selector: '[data-guide="foryou-saved"]', title: 'Your saved words', body: 'Words you saved while reading. Practise them from here.', side: 'top', align: 'center' },
    { selector: '[data-guide="foryou-goal"]', title: 'Toward your goal', body: 'Shortcuts to the practice that fits the goal you set.', side: 'top', align: 'center' },
    { selector: '[data-guide="foryou-makedeck"]', title: 'Make me a deck', body: 'Optional: add a free AI key to make a deck on any topic.', side: 'top', align: 'center' },
  ],

  '/word-families': [
    { title: 'Word families 🌳', body: 'One Malay root makes many words. Learn them together. Tap Next.' },
    { selector: '[data-guide="wordfamilies-search"]', title: 'Search', body: 'Type a root word, a longer word, or an English meaning.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="wordfamilies-roots"]', title: 'Open a family', body: 'Tap a root to see every word made from it.', side: 'bottom', align: 'center' },
    { title: 'Inside a family', body: 'Tap a word to hear it. Tap + to add it to your cards.' },
  ],

  '/cikgu': [
    { title: 'Cikgu Maya 🧑‍🏫', body: 'Your tutor. Ask any grammar, word or exam question. Tap Next.' },
    { selector: '[data-guide="cikgu-mode"]', title: 'Expert or AI', body: 'Expert: instant and always free. AI: questions in your own words.', side: 'bottom', align: 'end' },
    { selector: '[data-guide="cikgu-voice"]', title: 'Voice', body: 'Talk to Cikgu out loud. Answers are read back to you.', side: 'bottom', align: 'end' },
    { selector: '[data-guide="cikgu-topics"]', title: 'Browse topics', body: 'Tap a topic for a short lesson.', side: 'top', align: 'center' },
    { selector: '[data-guide="cikgu-input"]', title: 'Ask here', body: 'Type your question, then press Send.', side: 'top', align: 'center' },
  ],

  '/dictation': [
    { title: 'Dictation ⌨️', body: 'Hear a sentence, then type what you heard. Tap Next.' },
    { selector: '[data-guide="dictation-lang"]', title: 'Malay or English?', body: 'Pick the language you want to hear.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="dictation-start"]', title: 'Start a set', body: 'Five short sentences. Your device must be able to read aloud.', side: 'top', align: 'center' },
    { title: 'How it works', body: 'Tap Play, type what you heard, tap Check. Each word is marked.' },
  ],

  '/cloze-listening': [
    { title: 'Cloze listening 👂', body: 'Hear a sentence and fill in the missing words. Tap Next.' },
    { selector: '[data-guide="clozelistening-lang"]', title: 'Malay or English?', body: 'Pick the language you want to hear.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="clozelistening-start"]', title: 'Start a set', body: 'Five short sentences. Your device must be able to read aloud.', side: 'top', align: 'center' },
    { title: 'How it works', body: 'Tap Play, fill the gaps, tap Check. Each gap is marked.' },
  ],

  '/saved-cloze': [
    { title: 'Your saved words 📝', body: 'Practise the words you saved while reading. Tap Next.' },
    { selector: '[data-guide="savedcloze-empty"]', title: 'Nothing saved yet', body: 'Save words while reading, or tap here to import some.', side: 'top', align: 'center' },
    { selector: '[data-guide="savedcloze-card"]', title: 'Fill the gap', body: 'Type the missing word, then tap Check or Show answer.', side: 'top', align: 'center' },
    { title: 'Rate yourself', body: 'Tap Got it, or Needed the answer. Peeking is never a mistake.' },
  ],

  '/settings': [
    { title: 'Settings ⚙️', body: 'Set the app up your way. Nothing here is required. Tap Next.' },
    { selector: '[data-tour="guide-card"]', title: 'Tours', body: 'Replay the quick tour or the full tour from here.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="settings-language"]', title: 'Malay or English?', body: 'Switch the language you study. Each has its own cards.', side: 'bottom', align: 'center' },
    { selector: '[data-guide="settings-preferences"]', title: 'Make it comfortable', body: 'Theme, easier fonts, contrast, and your daily goal.', side: 'top', align: 'center' },
    { selector: '[data-guide="settings-data"]', title: 'Keep your work safe', body: 'Back up your data, restore it, or share a deck.', side: 'top', align: 'center' },
    { title: 'Optional extras', body: 'Sign in to sync your devices. Add a free AI key for extras.' },
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
    body: s.body,
    ...(s.selector ? { selector: s.selector } : {}),
    ...(s.side ? { side: s.side } : {}),
    ...(s.align ? { align: s.align } : {}),
  }))
}
