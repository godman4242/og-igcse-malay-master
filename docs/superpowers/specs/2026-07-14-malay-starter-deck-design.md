# Malay Beginner On-Ramp — Survival-Starter Deck (Phase 1)

**Date:** 2026-07-14 · **Branch:** `feat/malay-starter-deck` · **Status:** built, gate-green

## Problem

A new Malay learner lands on the Dashboard with **zero cards and no "start here."** English mode already has a one-tap starter (`seedEnglishStarter` → reversed dictionary; `seedAcademicEnglish` → AWL). Malay had nothing — the app implicitly assumes you can already read Malay. This is the #1 beginner gap.

## Solution (MVP)

A curated **~45-word Malay survival starter**, surfaced **opt-in** as one tap on the Malay empty-state, seeding `lang:'ms'` cards straight into the FSRS loop. The Malay mirror of the English seeds.

**Non-goals (Phase 2+, out of scope):** folding the full official-0546 list into `dictionary.js`; expanding `TOPIC_PACKS`; a pronunciation/alphabet primer; a linear course spine.

## Design & components

| Unit | File | What it does |
|---|---|---|
| Data | `src/data/malayStarter.js` | `MALAY_STARTER = [{ m, e, ex, p }]` — 45 verified entries. Mirrors `academicEn.js`. |
| Store action | `useStore.js` → `seedMalayStarter()` | Lazy-imports the data, maps to `{ m, e, lang:'ms', t:'Starter', p, ex, mn:'' }`, `addCards`, returns count added. Mirrors `seedAcademicEnglish` byte-for-byte. |
| UI | `Dashboard.jsx` | Malay empty-state block (mirror of the English one), gated `studyLang === 'ms' && cards.length === 0` (`cards` is already `cardsForLang`-scoped). Button uses the WCAG-safe `--color-accent2`/`--color-on-bright` pattern, ≥44px. |
| Docs | `README.md`, `src/lib/guide/pageGuides.js` | README feature bullet; a centered (un-anchored) Dashboard tour step. |
| Test | `src/store/__tests__/seedMalayStarter.test.js` | Data-integrity + seed behaviour + no cross-language leak + idempotent. Red-proofed. |

## Load-bearing invariants (must not break)

- **Opt-in only, never auto-seed** (reveal-gate ethos).
- **Malay & English decks never mix** — cards are `lang:'ms'`, land in the `'Starter'` deck; test asserts a pre-existing English card is untouched and no starter card enters the `'en'` partition.
- **Every Malay gloss verified** (confident-wrong Malay = the worst defect for a learning tool).
- **No `STORE_VERSION` bump** — cards go into the existing `cards` array; no new persisted state.

## Malay verification (the quality crux)

Sources: in-repo `src/data/dictionary.js` (825 vetted pairs) · `~/Downloads/igcse-malay (1).csv` (531 rows, native example sentences) · `~/Downloads/IGCSE_v7_Ultimate.html` (glossed IGCSE guide). Method: a script cross-checked every candidate gloss against all three.

- **40/45** glosses confirmed in `dictionary.js` with matching senses.
- **5** not in it — all trivially-common day-1 words, gate-verified as standard Bahasa Malaysia: `selamat petang`, `sama-sama`, `ya`, `ada`, `nama` (`ya`+`ada` also attested in the HTML).
- **Correction caught in review:** bare `mana` = "which" (dict: "which/where") — glossing it "where" alone is subtly wrong, so the entry is the real survival unit **`di mana` = "where"**.
- Example sentences follow the confirmed IGCSE beginner grammar patterns (S+V+O, adjective-after-noun, the question-word set) and reuse starter words, so the deck reads as a coherent set. Each `ex` contains its `m` as a whole word (cloze/Produce-safe; multi-word phrases confirmed to blank via `blankInExample`).

Categories (45): greetings & courtesy (8), pronouns (6), numbers 1–10 (10), question words (6), essential verbs (8), essential nouns/adjectives (7).

## Decisions flagged

1. **Sources:** kickoff paths were stale → used validated in-repo dictionary + the CSV + the IGCSE_v7 HTML (a 3rd corroborating source Kheshav supplied mid-session).
2. **Gate = `studyLang==='ms' && cards.length===0`** — precise per-language, because Dashboard's `cards` is already `cardsForLang`-scoped (no extra call needed).
3. **Deck name `t:'Starter'`** — short, clear, lives in the Malay partition so it can't collide with English decks.
4. **`FirstRunCard` overlap:** a fresh user still sees FirstRunCard ("build your deck" → word-families) above this — same accepted redundancy that already ships for English. Two doors (instant deck vs browse). Fast-follow option: hide FirstRunCard's empty variant when the starter is available; not done now (keeps the diff surgical, avoids its telemetry/tests).
5. **Tour step is centered/un-anchored** — the starter button only renders on a zero-card MS dashboard; an anchored step would stall+skip once populated (documented empty-state anti-pattern). Matches the Mistake-Journal step precedent.

## Verification

`npm run build` (zero errors, bundle within budget) · `npm run test:run` (incl. the new red-proofed `seedMalayStarter.test.js`) · `npm run lint` (0 errors). Manual: empty-state renders in MS mode, tap seeds 45 cards, they enter the Study loop; English mode unaffected.
