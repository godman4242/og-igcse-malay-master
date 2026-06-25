# IGCSE Malay Master 🇲🇾

**A free, all-in-one revision platform for IGCSE Malay (0546) and English (0500 / 0510) — built around how memory actually works.**

Flashcards that schedule themselves, a speaking examiner in your pocket, an AI grammar tutor, writing feedback against real band descriptors, and a dashboard that just tells you *what to study today*. Everything runs in the browser, works offline, and syncs across your devices when you sign in.

> 🔗 **Live app:** https://upg-igcse-malay-master.vercel.app
> 📖 **New here? Read the [User Guide](./USER_GUIDE.md).**

---

## Why it exists

Most revision tools are passive — you read a grammar table, you close the tab, you forget it. IGCSE Malay Master is built on the opposite idea: **every minute should be active recall, scheduled at the moment you're about to forget.** It combines a spaced-repetition engine (FSRS-6), real speaking and pronunciation practice, and exam-shaped tasks for *both* the Malay and English syllabuses into one place.

It's **free**, runs as an installable web app, and you can start as a guest in one tap — no sign-up wall.

---

## Features

### 🧠 Smart study (spaced repetition)
- **FSRS-6 scheduling** — the modern successor to SM-2. Cards resurface exactly when you're about to forget them, so you study less and remember more.
- **6 study modes:** flashcards, multiple-choice quiz, type-the-answer, listen-and-recall, cloze (fill-the-gap), and **speak** (say it out loud, get scored).
- **Interleaved "smart study"** sessions that mix vocab, writing, and speaking to build stronger recall.
- Build your deck from an 825-word dictionary, topic packs, a **word-family explorer**, or by importing your own Malay text and tapping unknown words.

### 🎤 Speaking & pronunciation (Paper 3 oral)
- **Turn-based AI roleplay** — the app plays the examiner; you respond by text *or* voice and get per-turn feedback. 15 Malay + 7 English scenarios.
- **Single-topic speaking practice** with live transcription, a calibrated band (1–6), and AI coaching (strengths, fixes, an improved version of your answer, vocab upgrades).
- **Word-level pronunciation scoring** with Malay-specific phonetic tips (ny, ng, trilled r, kh, sy, gh).
- **Speaking Progress** on your dashboard — a band trend, your top recurring weakness, which topics are "due for another go", and an optional **AI coach summary** of your trajectory and what to drill next.

### ✍️ Writing & grammar
- **Writing analysis for 21 IGCSE formats** (11 Malay + 10 English) with hand-curated band-6 exemplar paragraphs to model.
- **Task-aware grading (English 0510)** — pick a real IGCSE-format **task** and the grader judges whether you actually **answered it**: a "Did you answer the task?" Content / task-fulfilment band plus a per-requirement coverage checklist, *separate* from the writing-quality band. It won't over-praise a fluent-but-off-topic answer — a polished essay that ignores the prompt still scores low (verified by an over-praise eval).
- **Interactive bilingual grammar drills** — Malay *imbuhan* (meN-, ber-, di-, -kan, -an) and tense markers; English confusables, subject–verb agreement, articles, and more — all spaced with the same SRS engine.
- **Cikgu Maya**, an AI grammar/exam tutor with a free rule-based expert system plus optional LLM answers.

### 📖 Reading & listening
- **Reading comprehension** in both languages with AI-generated questions.
- **Interactive PDF reader** — open a Malay PDF, snap a photo of a past-paper page (free on-device OCR), or import a recording (on-device transcription) and read it with tap-to-reveal translation; switch to Select mode to build flashcards straight from the text. **No file? Tap "Try a sample"** to explore the reader with a built-in passage.
- **Listening practice** — passages played via text-to-speech with a replay limit, just like the exam.

### 🎯 Exam readiness
- A **30-minute spaced exam rehearsal** that blends comprehension, writing, and speaking into a single composite **Readiness %**.
- An **exam countdown planner** that adapts your daily plan as the date approaches.
- A **universal mistake journal** — every error you make anywhere is captured, clustered, and the important ones are auto-promoted into your flashcard deck so you can't keep repeating them.

### 📅 Your day, decided for you
- The **Daily Plan** on the dashboard turns eight different signals (overdue cards, fix-ups, exam readiness, weakest skill…) into one ordered, time-budgeted "do these next" list.
- **For-You now shows *why* each item was picked**, lets you **tune your focus** (constrained presets — steers selection, never your spaced-repetition schedule), and shows a **Where you stand** competence panel.

### 🔑 Bring your own AI key (optional)
- Paste a free **OpenRouter** key in Settings and **all** AI features (Cikgu, writing, speaking feedback, comprehension, the speaking coach) run on **your** key — billed to you, **stored only in your browser, never sent to our servers**. Add nothing and the app's built-in AI just works as normal.

### 📱 Works like an app
- **Installable PWA** — add it to your home screen and use it offline. Reviews and most modes work with no connection; it syncs when you're back online.
- **Guided app tour** — a spotlight walkthrough (Quick or Full) you can replay anytime from Settings → App guide. You can **pause it** to get it fully out of the way: click the dimmed area (or the ⏸ Pause button) and the whole guide tucks away — the page lights up and is fully interactive, with a single **▶ Resume tour** pill to drop back in at the same step. (If the box is already **minimized**, pausing instead just hides the step explanation and leaves the compact icon strip + step jumper parked on the margin, so you can keep stepping or resume from there.) Tap the "N of M" counter to **jump to any step**. **Drag the guide out of your way**: grab the ⠿ handle and drag — green dashed drop zones glow on every edge and corner, and dropping on one **docks** the box as a compact bar that **shrinks its controls to icons only** (←  →  ⏸) so it barely takes up space — the icons stay put (they don't jitter back to full size under your pointer), and every control keeps a screen-reader name. Minimizing also **lights the whole page back up** — the dark spotlight lifts so you can freely click and scroll anywhere (explore at your own pace, not step-by-step) while the box and its explanation stay visible; un-minimizing brings the spotlight back. The **step's explanation stays readable in its own box** beneath the icons, and the **"N of M" jumper still works while docked** so you can skip ahead without un-docking. You can **slide the docked box anywhere along that edge** — drop it where you like and it stays parked there as you step Next/Back. **Resize the box like a PowerPoint shape** — drag the ⤡ grip in its bottom-right corner (or focus it and press the arrow keys) to make it bigger or smaller, and the size holds as you step Next/Back. **Double-click the box to bring it back** to the centre with full labels and the default size. Drag it back to the middle to detach. Keyboard: focus the handle and press an arrow to dock to that edge (same arrow again floats it). _(Position and size are per-session.)_
- **Tour this page (▶)** — on the Dashboard, the **PDF reader**, the **Study page**, **Smart Study**, the **Practice hub**, the **Roleplay picker**, **Grammar drills**, the **Writing Analyzer**, **Comprehension**, **Listening**, **Speaking**, **Import**, the **Mistake Journal**, **Exam Rehearsal**, the **For You** home, **Word Families**, **Cikgu Maya**, **Dictation**, **Cloze Listening**, **Saved-word cloze**, and **Settings** — now **every page** — tap the ▶ "Tour this page" button in the header for a deep dive: each control is spotlighted with an animated arrow and a plain-English "what it does + example" (the PDF reader walk-through covers tap-to-reveal, Translate vs Select, Individual/Group, Sentences, Full translation, Reflow/Layout, and importing a PDF/photo/recording; the Study walk-through covers switching decks, the seven practice modes — Flashcard, Quiz, Type, Listen, Cloze, Speak and Produce — the DUE/LEARNING/KNOWN counts, flipping and grading yourself honestly so spaced repetition schedules each word, and skipping; the Smart Study walk-through covers the Public Mode / Mic Enabled speaking toggle, what one adaptive ~20-minute session does — recognition → recall → production around the words you owe today — and the Manual Study Mode shortcut; the Practice hub walk-through covers how every surface is grouped by exam skill, that each tile is a one-tap launcher, and the live cues — "due", "to fix", "% ready", "saved" — that show where to focus; the Roleplay walk-through covers choosing the Malay (0546 Paper 3) or English (0500/0510) oral, the Scenarios/History tabs, and picking a scenario to run in adaptive AI Practice or offline Static Mode; the Grammar walk-through covers the SRS vs Cram scheduling pill, the Malay/English toggle, the skill tabs with their red due-counts, and the drill card's type-or-tap answering with instant feedback that feeds the spaced schedule; the Writing walk-through covers loading a sample draft, the English/Malay/Templates toggle, choosing one of 21 IGCSE formats, picking a task so the grader also judges whether you answered it (a "Did you answer the task?" band plus a requirement checklist, separate from writing quality), the composer, and the Analyze button that returns your band /6 plus specific corrections and tips; the Comprehension walk-through covers picking a passage from the list that leads with your study language, reading the difficulty/topic/question-count badges to choose one at the right level, and what happens inside a passage — read it, tap any Malay word to look it up, Read along for audio, answer the multiple-choice questions with an instant explanation, and finish for a score; the Listening walk-through covers picking a passage from the list that leads with your study language, reading the EN/MY · difficulty · question-count badges to pick the right level, and what happens inside — you hear the passage (the text stays hidden, like the real exam), replay it once slightly slower, then the questions unlock for an instant verdict, a score, and the transcript to review; the Speaking walk-through covers choosing the Malay (0546 Paper 3) or English (0500/0510) oral, picking a topic from the list (each shows its English meaning and a target answer length, plus your last band once you've tried it), and what happens inside — plan with the prompt and cues, answer by speaking or typing, then get an instant band /6 with a breakdown and tips, Listen back to compare yourself with a model, and an optional detailed AI grade; the Import walk-through covers the Paste-text / Upload-PDF tabs, the text box that reads your study language, naming the deck the words join, Process to scan the text into colour-coded chips, the Word-by-Word translation grid, and what happens after Process — pick the chips you want and Add them to your deck, with a ten-second Undo; the Mistake Journal walk-through covers running the Fix-your-mistakes review pass over the slips that matter most (a memory jog kept separate from your spaced flashcards), filtering the list by category and reading the Most Frequent / Weak Patterns / Performance Trends panels to spot your weak areas, and turning a slip into a flashcard — mark it fixed, promote a Malay slip with ＋, or study the auto-built "Mistakes" deck; the Exam Rehearsal walk-through covers the four-skill overview — comprehension, listening, directed writing and spoken defense, each softly timed — choosing one syllabus to drill with the Bahasa Melayu / English toggle, starting the back-to-back run, and what you get at the end: each skill scored (percentages and bands /6) and blended into one "Exam Readiness %" that comes back on a spaced schedule, with the listening stage skipped and the score fairly re-worked when your browser can't play audio; the For You walk-through covers your personalized home — the "Keep going" cards that pick up today's plan, the "Picked for you" session shaped around your weak spots, the no-stakes "Still remember these?" memory check that never touches your spaced schedule, the saved-words and goal shortcuts, and the optional AI custom-deck panel; the Word Families walk-through covers searching the 41 roots by root, derived form or English meaning, tapping a root to open its visual family tree, and what is inside that tree — forms branching off the root, colour-coded by part of speech (verbs/Kata Kerja, nouns/Kata Nama, adjectives/Kata Sifat), tap any node to hear it in Malay, the + to add a form to your deck, the node itself for a detail card, and a "Related to Your Mistakes" panel that surfaces the roots behind words you recently got wrong; the Cikgu Maya walk-through covers the Expert (rule-based, instant, always free) vs AI (language-model, free via Gemini/OpenRouter or a small daily quota) answer modes, asking by typing or by mic/Voice mode (Cikgu reads the answer back, say "stop" to halt), and the fresh-chat helpers — suggested questions shaped by your recent mistakes and a Browse Topics library covering imbuhan, grammar, vocabulary, writing, speaking, peribahasa and exam tips; the Dictation walk-through covers choosing the Bahasa Melayu or English language, starting a five-sentence set, and what happens inside — hear a sentence with the text hidden, replay it once slightly slower, type exactly what you heard, then get a word-by-word right/wrong check with the full sentence revealed, an average score, and missed words saved to your Mistake Journal; the Cloze Listening walk-through covers choosing the Bahasa Melayu or English language, starting a five-sentence set, and what happens inside — hear a sentence while you read its transcript with one or two words blanked out (the visible scaffold makes it a rung easier than dictation), replay it once slightly slower, fill the gap boxes that unlock after the first play, then get a per-gap right/wrong check, an average score, and missed words saved to your Mistake Journal; the Saved-word cloze walk-through covers what the page does — turning the words you saved while reading into produce-it-from-memory drills built only from your personal "Saved" deck — filling the blank in a word's own example sentence (or writing it from the English meaning when there's no sentence) and checking it, and rating yourself afterwards (Got it / Needed the answer) so your honest grade tunes when each word comes back, with a GOT IT / REVEALED tally at the end; and the Settings walk-through covers picking your study language (Malay 0546 or English 0510, which switches your deck and the listening/speaking voice), the appearance and accessibility preferences (theme, dyslexia-friendly font, high contrast, Word Pictures, daily goal), keeping your progress safe with Backup / Restore / Share and Export to CSV/Anki/PDF, the optional extras lower down — signing in to sync across devices and pasting your own free AI key, both with a built-in free fallback so neither is ever required — and replaying any tour from the App-guide card). On a focused study session the header hides, so the ▶ floats beside the "Lights On" pill to stay reachable. Uses the same Next/Back/Pause/drag controls as the main tour. There's also a **▶ "go deeper" button right inside the guide box**: tap it from the main Quick/Full tour to drop straight into the deep dive for whatever page you're on (it appears only on pages that have a deep dive, so it's never a dead button).

---

## Accounts & what they unlock

You can do almost everything as a **guest** — sign up only to keep your progress.

| Tier | How you get it | What you get |
|---|---|---|
| **Guest** | Just open the site | All learning modes; progress saved in that browser only. |
| **Enhanced** | Sign up (automatic for everyone) | Everything + **cloud sync across devices**, AI roleplay & feedback, XP, streak freezes, app install, translation cache. |
| **Admin** | Manual promotion | Enhanced + a panel to view anonymous usage analytics. |
| **Owner** | Site owner | Admin + invite/manage users. |

Signing up is open to anyone and free.

---

## Tech stack

| Area | Choice |
|---|---|
| UI | React 19, React Router v7 |
| State | Zustand 5 (persisted to localStorage) |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`), CSS custom-property theming (dark/light) |
| Build | Vite 8 |
| Spaced repetition | `ts-fsrs` (FSRS-6) |
| Speech | Web Speech API (native browser TTS/STT) |
| Cloud (optional) | Supabase 2 — auth, Postgres sync, edge functions |
| AI (optional) | Expert system → OpenRouter free models → Claude/Gemini proxy |

All vocabulary, grammar, and exam content is bundled client-side; the database stores only *your* progress.

---

## Getting started (developers)

```bash
git clone https://github.com/godman4242/og-igcse-malay-master.git
cd og-igcse-malay-master
npm install
npm run dev        # → http://localhost:5173
```

### Scripts

```bash
npm run dev        # dev server with hot reload
npm run build      # production build → /dist
npm run preview    # preview the production build
npm run lint       # ESLint
npm run test:run   # Vitest unit suite
npm run test:e2e   # Playwright end-to-end (chromium)
```

### Environment (all optional)

The app runs fully offline with no configuration. To enable cloud sync and AI:

```bash
# .env.local
VITE_SUPABASE_URL=...           # enables accounts + cross-device sync
VITE_SUPABASE_ANON_KEY=...
VITE_OPENROUTER_KEY=...         # optional: free LLM models for AI features
VITE_AI_MOCK=true               # optional: canned AI responses for local dev
```

Without these, you still get the full learning experience locally (guest mode, expert-system tutor, static roleplay).

---

## Project layout

```
src/
  pages/        one file per route (Dashboard, Study, Roleplay, Speaking, …)
  components/   shared UI + dashboard widgets
  store/        single Zustand store (useStore.js)
  lib/          pure logic: fsrs, speech, grading, patterns, sync
  data/         bundled content: dictionary, topics, grammar, scenarios, exemplars
```

For architecture and contribution conventions, see [`CLAUDE.md`](./CLAUDE.md).

---

## License

Free to use for IGCSE revision. See the repository for details.
