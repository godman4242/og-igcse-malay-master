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
- **One-tap beginner starter** — brand new to the language? On an empty deck the Dashboard offers a curated ~45-word **Malay survival starter** (greetings, numbers, question words, everyday verbs and nouns), or the English starter set, with a single tap — so you're never stranded on zero cards with no "start here". Always optional (import or pick your own words instead), never auto-added.
- Build your deck from an 825-word dictionary, topic packs, a **word-family explorer**, or by importing your own Malay text and tapping unknown words.

### 🎤 Speaking & pronunciation (Paper 3 oral)
- **Turn-based AI roleplay** — the app plays the examiner; you respond by text *or* voice and get per-turn feedback. 15 Malay + 7 English scenarios.
- **Single-topic speaking practice** with live transcription, a calibrated band (1–6), and AI coaching (strengths, fixes, an improved version of your answer, vocab upgrades).
- **Word-level pronunciation scoring** with Malay-specific phonetic tips (ny, ng, trilled r, kh, sy, gh).
- **Speaking Progress** on your dashboard — a band trend, your top recurring weakness, which topics are "due for another go", and an optional **AI coach summary** of your trajectory and what to drill next.

### ✍️ Writing & grammar
- **Writing analysis for 21 IGCSE formats** (11 Malay + 10 English) with hand-curated band-6 exemplar paragraphs to model.
- **Task-aware grading (English 0510 + Malay 0546)** — pick a real IGCSE-format **task** in English *or* Malay and the grader judges whether you actually **answered it**: a "Did you answer the task?" / "Adakah anda menjawab tugasan?" Content / task-fulfilment band plus a per-requirement coverage checklist, *separate* from the writing-quality band. It won't over-praise a fluent-but-off-topic answer — a polished essay that ignores the prompt still scores low (each language gated by its own over-praise eval before shipping on).
- **"Improve your answer" re-attempt (English 0510 + Malay 0546)** — when you miss a requirement, the analyzer surfaces the *specific* points you missed, each with a one-line how-to-fix tip, and a button to rewrite ("Perbaiki jawapan anda" in Malay). Resubmit the same task and it shows an honest **before→after** — your Content band then and now, and which requirements flipped to ✓. It only says you improved on a *real* change, never as encouragement (the improvement claim is itself eval-pinned against cosmetic edits).
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
- **Share a deck with a friend** — from Settings, **"Share My Deck"** copies a link for a small deck or saves a `.deck.json` file for a big one. The recipient opens the link (or uses **"Import a Shared Deck"**) and **picks which words to add** before anything touches their decks — perfect for a teacher handing a beginner a ready-made starter pack. Nothing is uploaded to a server: the words travel inside the link or file itself.
- **Guided app tour** — a spotlight walkthrough (Quick or Full) you can replay anytime from Settings → App guide. The page goes dark except the one control the step is about, which gets a bright pulsing ring — and you can click that control to try it. Clicking the dark area never closes or hides the box (it just gives it a little shake); **only the red ✕ closes the tour**. **Pause** (⏸) tucks the whole guide away so the page is fully usable, with a single **▶ Resume tour** pill to drop back in at the same step. Progress shows as dots (or a slim bar on long tours) — tap one to **jump to any step**. **Drag the guide out of your way**: grab the handle and drag — green drop zones glow on every edge and corner, and dropping on one **docks** the box as a compact icon strip (←  →  ⏸). Docking also **lights the whole page back up** so you can click around freely while the tour waits (the ring stays on the current control); slide the docked box anywhere along its edge. **Resize** it with the ⤡ corner grip, and **double-click the box** to bring it back to the centre at its default size. Keyboard: focus the handle and press an arrow to dock to that edge (same arrow again floats it); Esc closes. _(Position and size are per-session.)_
- **Tour this page (▶)** — every page has a deep-dive tour in the header ▶. It is built like a TV series, not a film: many tiny steps, each lighting up **one** real button with one short line (≤14 words, no examples) — you learn by clicking: **do what the step asks (tap the lit button, pick from the lit list) and the tour moves on by itself** — as fast as pressing Next (typing in a lit text box waits for Next; paused or docked, it always waits for Next; a reflex Next right after it never skips a step; if the lit button disappears because the page changed, the tour moves on to what's there). The highlight follows its button if the page shifts (e.g. the Translation panel popping in). It only shows the buttons that are on screen right now — judged live, so tapping the lit "Try a sample" on the empty PDF reader carries the tour straight on into the reader's toolbar (Replace file, tap a word, Translate/Select, Translate page, List unknowns, Sentences, Reflow/Layout, Full translation); before a file is open it covers sample, open a file, photo, record and language. On a focused study session the header hides, so the ▶ floats beside the "Lights On" pill to stay reachable. From the Quick/Full tour, the **▶ "Tour this page in depth" button** inside the guide box drops you straight into the current page's tour.

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
| SEO | Build-time per-route `<head>` prerender (custom Vite plugin) — a static `dist/<route>/index.html` per route carrying its own title/description/canonical/OG, plus generated `robots.txt`/`sitemap.xml` |
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

Deploy-time SEO variables (set per hosting project, **not** in `.env.local` — they only affect `npm run build`):

```bash
VITE_BASE_URL=https://your-domain   # host for canonical/OG/sitemap URLs (defaults to the primary deployment)
VITE_NOINDEX=true                   # mark a duplicate mirror deployment noindex (robots Disallow + per-page noindex)
```

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
