# Plan — roleplay scorecard whole-word key-vocab/imbuhan detection

Spec: `../specs/2026-06-15-roleplay-scorecard-wholeword-hits-design.md`. TDD, surgical.

1. **Red-proof the pure helper.** Create `src/lib/wholeWordMatch.js` with a deliberately NAIVE
   (substring) impl first. Write `src/lib/__tests__/wholeWordMatch.test.js` (menu/menunggu,
   bil/ambil, harga/berharga whole-word-false cases + positive standalone matches + phrase +
   hyphen-reduplication + the `wholeWordSplitRegex` split shape). Run → the whole-word cases FAIL
   for the right reason (substring impl). Then fix the impl to the boundary regex → all green.
2. **Red-proof the component wiring.** Create
   `src/components/__tests__/roleplayScorecardKeywordHits.test.js` (mounts the real component,
   mirrors `roleplayScorecardMistakeLang.test.js`'s localStorage shim + dynamic imports). Assert:
   - student "Saya menunggu makanan", `keyVocab:['menu']` → **0** green "✓ used" chips.
   - student "Boleh saya lihat menu?", `keyVocab:['menu']` → **1** green chip (positive control).
   Run against the CURRENT substring code → the 0-chip case FAILS (chip appears) for the right reason.
3. **Implement.** Edit `RoleplayScorecard.jsx`: import the helper; swap the 4 `.includes()` and the
   `highlightKeywords` regex; delete the now-unused `studentLower`/`modelLower`. Component test → green.
4. **Gate:** `npm run build && npm run test:run && npm run lint` — all green. Run
   `tests/e2e/*roleplay*` if one exists (UI-affecting); else rely on the mounted component test.
5. **Self-review** hostile: Malay/English parity, phrase matching, theme-agnostic, no new lint warning,
   mistake-language test still green. Ship one commit + RESUME_HERE shipped section + queue `[x]` +
   overnight report.

**Measurable Done:** the two red tests turn green; gate green; lint 0 errors.
