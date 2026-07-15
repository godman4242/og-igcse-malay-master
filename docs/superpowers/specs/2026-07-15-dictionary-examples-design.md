# Dictionary Example Sentences — full coverage (Malay On-Ramp Phase 2, reframed)

*Date: 2026-07-15 · Supersedes the kickoff's "fold the full 0546 list into `dictionary.js`" framing (that source no longer exists; see Problem).*

## Problem

The original Phase-2 kickoff assumed a clean ~1,300-word official-0546 list to fold into
`src/data/dictionary.js`. **That source is gone** (verified: the referenced
`~/Downloads/…malayenglish-format/` folder does not exist; the remaining CSV is 531 rows of which
~263 are a noisy 2023 listening-transcript dump and ~258 already in the dictionary). The existing
`dictionary.js` (**825** curated `{malay: english}` entries) is already the largest, cleanest vocab
asset — coverage is **not** the bottleneck.

The real content gap is **depth, not breadth**: `dictionary.js` is a flat gloss map with **no example
sentences**. Only **254 of the 825 words** carry a curated example (via the already-shipped parallel
map `src/data/dictionaryExamples.js`, consumed by `loadTopicPack`). The other **571 words** — the
broad vocabulary a learner reaches by tapping/importing/searching a word — get only a synthetic
placeholder `ex` (`"word — gloss"`) when they become a card. That placeholder is useless for the two
study modes that depend on a real sentence:

- **Cloze** (`ClozeMode.jsx`): blanks a word out of `card.ex`.
- **Produce** (`ProduceMode.jsx`): shows a blanked context line only when `card.ex` exists and is >10 chars.

So 571 words can never be studied with contextual/cloze retrieval — the app's highest-value modes for
elaborative encoding. Chosen by Kheshav (2026-07-15) as Phase 2 for its learning ceiling.

## Solution

**Additive: finish the existing parallel-examples pattern.** Grow `dictionaryExamples.js` from 254 →
825 entries (one verified sentence per dictionary word), and wire the remaining card-creation paths to
consult it. **`dictionary.js` is never touched** — it stays a flat `{malay: 'english'}` string map (the
one hard invariant, pinned by 3 existing tests). This is not a schema migration; it is data growth +
three small call-site edits against a pattern already in production.

## Design & components

1. **Data — `src/data/dictionaryExamples.js`** (grow 254 → 825): add one example per missing word.
   Keep the file's existing house style (header): **7–15 words, IGCSE-standard register, headword used
   naturally inside the sentence, concrete/situational (not a definition).** `getExample(word)` and
   `default EXAMPLES` are unchanged. Also fix the 4 existing entries whose headword only appears
   *inflected* (`goreng`, `basikal`, `baca`, `suami`) so the bare headword appears as a whole word
   (needed for cloze blanking).

2. **Wiring — 3 card-creation paths** currently write a synthetic `ex` placeholder; change each to
   `getExample(m) || <existing placeholder>` so a curated example reaches cards made outside topic
   packs (naturally Malay-only — `getExample` returns null for English words, so `lang:'en'` cards keep
   their placeholder):
   - `PDFReader.jsx` word-tap add (`addGloss`, ~:922)
   - `Import.jsx` add-to-deck
   - `SearchModal.jsx` add (~:35)
   (`loadTopicPack` already consumes `EXAMPLES`; `seedMalayStarter`/academic seeds carry their own inline
   `ex` and are out of scope.)

3. **Hard guard (green after every batch) — content-lint** (`scripts/lint-content.mjs` +
   `src/data/__tests__/contentLint.test.js`, the established home): for **every entry that exists** in
   `EXAMPLES`, assert the value is a non-empty string, **contains its headword as a whole word**
   (full phrase for multi-word headwords), and word-count ∈ [5, 18]. This stays green after each batch
   because we only *add* verified entries; it also forces the 4 fixes above. **It does NOT assert
   "every dictionary word has an example"** — that would redden the gate every session until the grind
   is complete.

4. **Soft lint (report, not gated) — `scripts/report-example-vocab.mjs`**: for each example, list content
   words not in `dictionary.js` keys ∪ a small allowlist (function words, pronouns, common names/particles,
   numbers). Guides comprehensible-input authoring (compose examples from already-vetted vocabulary) so I
   minimise unknown words — but never contorts a natural sentence, so it stays a report I read, not a test.

5. **Coverage** (254 → 825): tracked in RESUME_HERE/commit notes, **not gated**. The final batch adds the
   `dictionary.js`-parity assertion ("every dictionary word has an example") to flip completeness on once.

## Load-bearing invariants (must not break)

- **`dictionary.js` values stay strings.** Pinned by `dictionary.test.js:12-13`,
  `contentLint.test.js:100-104`, `listeningMistakes.test.js:107-120`. Not edited by this work.
- **`ex` stays optional + defensively coerced** everywhere (`blankWord.js`, `speakTarget.js`,
  `clozeBuilder.js`, `ProduceMode.jsx`). Adding examples only ever *upgrades* a placeholder.
- **No STORE_VERSION bump** — examples flow into the existing `ex` card field via existing creation
  paths; no persisted-state shape change. (The one migration that reads `EXAMPLES`, v10 backfill, keeps
  working with more entries.)
- **`contentLint` dictionary-header count** stays valid (dictionary unchanged).

## Malay verification (the quality crux)

A wrong example is confident-wrong Malay — the worst defect for a learning tool, and Claude is the gate
([[user_not_malay_fluent_claude_is_gate]]). Every new sentence, per batch:
1. **Web-verify** the sentence's grammar + the headword's sense against real sources (PRPM / Kamus
   Dewan / native corpora) — never memory alone. Paste sources for a sample each batch.
2. **Machine guard** (§3) — headword-as-whole-word + length, red-proofed.
3. **Comprehensible input** (§4) — prefer words already in the dictionary; review the soft-lint report.
4. **Optional** — cross-check a batch with the authorized Gemini eval (`.env.local` GEMINI_KEY) for a
   second opinion on over-confident glosses.

## Batching & delivery

- **571 missing, batched ~45 words/batch, alphabetically** (the topic-pack core is already covered, so the
  long tail is roughly value-equivalent — no frequency model needed; reprioritise only if a value signal
  emerges). Each batch = its own **gate-green commit** (additive → no half-finished state is unshippable).
- **This session:** ship the **machinery** (wiring + hard guard + soft-lint script + the 4 fixes) as
  Increment 0, then **Batch 1** = the first ~45 missing words (`abad`…`basuh`), fully web-verified. Stop at
  the quality bar, not a word count — 15 impeccable examples beat 45 rushed ones.
- **Subsequent sessions:** remaining alphabetical batches; final batch flips on the parity assertion.

## Decisions flagged (veto any)

- **Reuse `dictionaryExamples.js`, not a new file** — reuses the shipped pattern; smallest diff.
- **Hard test guards existing entries, not completeness** — keeps the gate green through a multi-session grind.
- **Comprehensible-input is a soft report, not a hard gate** — avoids contorting natural sentences.
- **Alphabetical ~45-word batches** — no frequency model (YAGNI); core words already done.
- **End-state = all 825** (multi-session). Cap smaller only on Kheshav's word.

## Verification (per batch)

1. `npm run build` — zero errors; no unexpected chunk growth (data file grows a shared chunk, exempt from
   the 70 KB per-route rule).
2. `npm run test:run` — green, incl. the new/updated content-lint guard (red-proofed on a bad example first).
3. `npm run lint` — 0 errors.
4. Spot-check: a Batch-1 word imported/tapped produces a card whose cloze/Produce shows the real sentence.
5. RESUME_HERE + GOAL.md refreshed with coverage (254 → N) and this session's batch.
