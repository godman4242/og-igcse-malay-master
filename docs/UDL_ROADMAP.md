# Universal Design for Learning (UDL) Roadmap

Universal Design for Learning is the framework that ensures our app is accessible, engaging, and effective for *every* learner—including those with ADHD, dyslexia, or different learning styles.

## Principle 1: Multiple Means of Engagement (The "Why")
**Goal:** Optimize individual choice and autonomy.

*   [x] **Choice of Effort Level**: Allow users to set "Casual", "Standard", or "Intensive" goals. (Implemented in `useStore.js`)
*   [x] **Theme Choice**: Allow users to toggle between "High Contrast", "Dark Mode", and "Dyslexic Friendly" fonts. (Commit `7778132`, 2026-05-14 — Lexend body font + WCAG-AAA high-contrast overlay, both opt-in from Settings.)
*   [x] **Personal Interests**: Settings carries an "Your Interests" section with 10 starrable IGCSE topics (Environment, Travel, Technology, Health, Sports, Food, Education, Community, Family, Work & Jobs). Stars are persisted in the Zustand store under `userInterests` (STORE_VERSION 16 → 17, defaults-empty migration). Both `/comprehension` and `/roleplay` (Malay + English tabs) sort their lists through a pure `prioritiseByInterests` helper that floats matching items to the top while preserving original order within each group. Matched items render with a ⭐ badge, an orange border-glow, and a "Your interest" pill so the student sees their choices reflected in the app. (UDL Round 3 Part 5, 2026-05-15.)

## Principle 2: Multiple Means of Representation (The "What")
**Goal:** Provide information in more than one format.

*   [x] **Visual Dictionary**: Use AI-generated icons or images for core vocabulary in `DICTIONARY.js`. (Commits `8dd560b` → `2b0aeab` + `48c211e` — 70 Tier-0 emojis across 5 surfaces; Tier-1 AI-image pipeline shipped but parked on provider/billing.)
*   [x] **Interactive Word Families**: Radial SVG tree on `/word-families` — the root sits at the centre with its imbuhan-derived forms branching out on a deterministic circle. Each node carries a `<DictionaryIcon>`, a POS-coded border (verb=blue / noun=green / adj=purple), Bezier paths whose stroke colour matches the destination POS, a click-to-speak handler routed through `speakWithBoundaries` (active node pulses with a ring during playback), and a `+` overlay for one-tap "add to deck". Layout math is a pure leaf in `src/lib/wordFamilyLayout.js` with a 9-case vitest pin. ADHD-safe: no idle animations, all colours flow through `var(--color-*)` so `.contrast-high` + `.font-dyslexic` reskin it for free. (UDL Round 3 Part 4, 2026-05-15.)
*   [x] **Audio-Visual Sync**: Highlight text as the Text-to-Speech engine reads it aloud (very helpful for ADHD/Dyslexia). (Commits `4397891` + `049a180` for Comprehension; `9598d16` extends to Roleplay examiner turns — the killer feature.)

## Principle 3: Multiple Means of Action & Expression (The "How")
**Goal:** Provide flexible ways for students to show what they know.

*   [x] **Multi-Modal Flashcards**: Speak-to-rate keyword spotter on `/study` standard & hint flashcards — opt-in mic toggle on the card; once on and flipped, a continuous Web Speech recogniser listens for "Again / Hard / Good / Easy" and grades the card hands-free. Pulsing mic indicator + per-keyword colour hint while live; auto-pauses while TTS reads the card aloud (gated on `speak()` onStart/onEnd). Conservative grade on conflict: again > hard > good > easy. (UDL Round 3 Part 2, 2026-05-15.)
*   [x] **Writing Scaffolding**: Connective Checklist sidebar (*Penanda Wacana*) on the Malay writing analyzer — grouped by Tambahan / Pertentangan / Urutan / Sebab & Akibat / Contoh, lights up live as the student types each connector. (UDL Round 3, 2026-05-15.)
*   [x] **Cikgu Maya Voice**: Full talk-to-tutor flow on `/cikgu` — opt-in "Voice" toggle in the header. When on, the mic button drives a state machine (idle → listening → thinking → speaking → idle): captures the question via `startRecognition('ms-MY')`, auto-sends, and reads Cikgu Maya's reply back through `speakWithBoundaries` with a per-word purple highlight on the message bubble. A `startKeywordSpotter` running `parseStopKeyword` listens for "stop" / "berhenti" / "diam" mid-readback to interrupt; a manual Stop button is the fallback for Safari. Markdown in the response (headings, bold, tables, code) is stripped via `plainifyForSpeech` before TTS so the synthesiser doesn't read "asterisk asterisk". (UDL Round 3 Part 3, 2026-05-15.)

---

## Why this matters for the "Masterpiece"
By following these steps, you aren't just adding features; you are removing **barriers**. A student who is tired after school can switch to "Casual" mode. A student who struggles with spelling can use "Visual" cues. This inclusivity is what makes an app go from "useful" to "indispensable."
