# Universal Design for Learning (UDL) Roadmap

Universal Design for Learning is the framework that ensures our app is accessible, engaging, and effective for *every* learner—including those with ADHD, dyslexia, or different learning styles.

## Principle 1: Multiple Means of Engagement (The "Why")
**Goal:** Optimize individual choice and autonomy.

*   [x] **Choice of Effort Level**: Allow users to set "Casual", "Standard", or "Intensive" goals. (Implemented in `useStore.js`)
*   [x] **Theme Choice**: Allow users to toggle between "High Contrast", "Dark Mode", and "Dyslexic Friendly" fonts. (Commit `7778132`, 2026-05-14 — Lexend body font + WCAG-AAA high-contrast overlay, both opt-in from Settings.)
*   [ ] **Personal Interests**: Allow users to "Star" topics (e.g., Environment, Technology) so that Reading passages prioritize their interests.

## Principle 2: Multiple Means of Representation (The "What")
**Goal:** Provide information in more than one format.

*   [x] **Visual Dictionary**: Use AI-generated icons or images for core vocabulary in `DICTIONARY.js`. (Commits `8dd560b` → `2b0aeab` + `48c211e` — 70 Tier-0 emojis across 5 surfaces; Tier-1 AI-image pipeline shipped but parked on provider/billing.)
*   [ ] **Interactive Word Families**: Create a "Tree" visualization for Malay root words and their affixes (*imbuhan*).
*   [x] **Audio-Visual Sync**: Highlight text as the Text-to-Speech engine reads it aloud (very helpful for ADHD/Dyslexia). (Commits `4397891` + `049a180` for Comprehension; `9598d16` extends to Roleplay examiner turns — the killer feature.)

## Principle 3: Multiple Means of Action & Expression (The "How")
**Goal:** Provide flexible ways for students to show what they know.

*   [ ] **Multi-Modal Flashcards**: Let students choose to "Speak" their answer into the mic instead of just clicking "Good/Hard".
*   [x] **Writing Scaffolding**: Connective Checklist sidebar (*Penanda Wacana*) on the Malay writing analyzer — grouped by Tambahan / Pertentangan / Urutan / Sebab & Akibat / Contoh, lights up live as the student types each connector. (UDL Round 3, 2026-05-15.)
*   [ ] **Cikgu Maya Voice**: Let students talk to the AI Tutor via voice instead of just typing.

---

## Why this matters for the "Masterpiece"
By following these steps, you aren't just adding features; you are removing **barriers**. A student who is tired after school can switch to "Casual" mode. A student who struggles with spelling can use "Visual" cues. This inclusivity is what makes an app go from "useful" to "indispensable."
