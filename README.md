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
- **Interactive bilingual grammar drills** — Malay *imbuhan* (meN-, ber-, di-, -kan, -an) and tense markers; English confusables, subject–verb agreement, articles, and more — all spaced with the same SRS engine.
- **Cikgu Maya**, an AI grammar/exam tutor with a free rule-based expert system plus optional LLM answers.

### 📖 Reading & listening
- **Reading comprehension** in both languages with AI-generated questions.
- **Paper 4 listening practice** — passages played via text-to-speech with a replay limit, just like the exam.

### 🎯 Exam readiness
- A **30-minute spaced exam rehearsal** that blends comprehension, writing, and speaking into a single composite **Readiness %**.
- An **exam countdown planner** that adapts your daily plan as the date approaches.
- A **universal mistake journal** — every error you make anywhere is captured, clustered, and the important ones are auto-promoted into your flashcard deck so you can't keep repeating them.

### 📅 Your day, decided for you
- The **Daily Plan** on the dashboard turns eight different signals (overdue cards, fix-ups, exam readiness, weakest skill…) into one ordered, time-budgeted "do these next" list.

### 🔑 Bring your own AI key (optional)
- Paste a free **OpenRouter** key in Settings and **all** AI features (Cikgu, writing, speaking feedback, comprehension, the speaking coach) run on **your** key — billed to you, **stored only in your browser, never sent to our servers**. Add nothing and the app's built-in AI just works as normal.

### 📱 Works like an app
- **Installable PWA** — add it to your home screen and use it offline. Reviews and most modes work with no connection; it syncs when you're back online.
- **Guided app tour** — a spotlight walkthrough (Quick or Full) you can replay anytime from Settings → App guide. You can **pause it**: click the dimmed area (or the ⏸ Pause button) to light up the whole page and explore freely, then ▶ Resume to drop back into the tour at the same step. Tap the "N of M" counter to **jump to any step**.

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
