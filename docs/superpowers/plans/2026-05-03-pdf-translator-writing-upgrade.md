# PDF Reader, Pluggable Translators, Cached Translations & Writing Grader Upgrade

**Branch:** `feat/pdf-translator-writing-upgrade`
**Plan date:** 2026-05-03
**Phase A status:** shipped (this branch)
**Phase B status:** kicked off in `upg-igcse-malay-master`

## Goal

Upgrade the free static IGCSE Malay app with:
- Real translation (Google Cloud Translation v2 / DeepL / free `gtx` fallback) routed through a single client.
- Local IndexedDB cache of translations (cloud cache is Phase B).
- PDF import with an interactive reader (click to translate, drag to select, drag-to-phrase).
- Format-aware writing grader (English + Malay, all IGCSE formats including auto-detect and "general").
- Free Gemini-powered writing tutor with format-specific prompting.
- Settings UI to pick translator, tutor model, and toggle cloud cache.
- Fix the long-paste UX in Import (results always visible).

## Architecture

```
UI                                              libs
─────────────────────────────────────────────────────────────────
Import.jsx       — paste/PDF tab + sticky panel ──► pdf.js
PDFReader.jsx    — interactive reader            ──► pdf.js
                                                 ──► useSelectionMode
                                                 ──► translate.js
Writing.jsx      — format dropdown + tutor       ──► writingGrader.js
WritingTutor.jsx — Gemini/OpenRouter chat        ──► gemini.js
                                                 ──► openrouter.js
Settings.jsx     — translator + tutor pickers    ──► translate.js
                                                 ──► translationCache.js

translate.js ───► providers/{google,deepl,gtx}.js
              └── translationCache.js (IndexedDB; cloud no-op in Phase A)
```

## Files added in Phase A

```
src/lib/translate/providers/google.js
src/lib/translate/providers/deepl.js
src/lib/translate/providers/gtx.js
src/lib/translationCache.js
src/lib/pdf.js
src/lib/useSelectionMode.js
src/lib/writingGrader.js
src/lib/gemini.js
src/pages/PDFReader.jsx
src/components/WritingTutor.jsx
docs/superpowers/plans/2026-05-03-pdf-translator-writing-upgrade.md
```

## Files modified in Phase A

```
src/lib/translate.js          — became the router; same exports
src/pages/Import.jsx          — PDF tab + sticky result panels
src/pages/Writing.jsx         — format dropdown + tutor + grader
src/pages/Settings.jsx        — Translation & AI section
src/store/useStore.js         — STORE_VERSION 7 → 8 + new slices
src/App.jsx                   — /pdf-reader route
src/components/Layout.jsx     — "PDF Reader" entry in More
src/components/WordFamilyCard.jsx — bug fix: + button feedback
.env.example                  — provider-specific keys + warnings
.gitignore                    — ignore .env*
package.json                  — pdfjs-dist@^4
```

## Store v8 changes

New slices added with v7 → v8 migration that preserves existing data:

```js
translation: {
  preferredProvider: 'auto',     // 'auto' | 'deepl' | 'google' | 'gtx'
  showComparisonLink: true,
  cacheToCloud: false,           // Phase B opt-in
}
writingTutor: {
  provider: 'gemini',            // 'gemini' | 'openrouter' | 'claude'
  autoDetectFormat: true,
}
writingHistory: []                // [{ ts, lang, format, band, words }]
pdfRecents: []                    // [{ name, sizeKB, pages, addedAt }]
```

Setters: `setTranslationProvider`, `setTranslationComparisonLink`,
`setTranslationCacheToCloud`, `setWritingTutorProvider`,
`setWritingTutorAutoDetect`, `logWritingFeedback`, `addPdfRecent`.

## Behavioral guarantees

- **Backward compat.** `translateWord(text, from?, to?)` still works for
  every existing call site. New callers can pass `{ provider }` opts.
- **Graceful degradation.** With no API keys at all, the app falls back
  to `gtx` and the writing tutor button hides itself.
- **Privacy.** PDFs are extracted in the browser; nothing uploaded.
- **No cloud writes.** `cacheToCloud=true` is a no-op in Phase A; the
  toggle is disabled with a "Coming with the upgraded version" hint.

## Phase B — separate `upg-igcse-malay-master` repo

After Phase A merges to main, fork into `upg-igcse-malay-master` and
add Supabase-backed features:

1. **Auth** — magic-link / Google OAuth via existing
   `src/config/supabase.js`.
2. **Cloud translations table.**
   ```sql
   CREATE TABLE translations (
     key TEXT PRIMARY KEY,    -- "${from}:${to}:${normalized}"
     text TEXT NOT NULL,
     source TEXT NOT NULL,    -- 'google' | 'deepl' | 'gtx'
     provider TEXT NOT NULL,
     lang_from TEXT NOT NULL,
     lang_to TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     created_by UUID REFERENCES auth.users(id)
   );
   ```
   RLS: `SELECT` open, `INSERT` auth required. Replace the no-op stub
   in `translationCache.js` with read-through and write-through.
3. **Cloud card sync** via the existing `sync.queue` infrastructure.
4. **Cloud writing-tutor history** so it survives device changes.
5. **Speaking grader** (Web Speech API → Gemini) for IGCSE Paper 3.

### Phase B kickoff notes

- Local fork created at `../upg-igcse-malay-master`.
- Added Supabase schema script:
  `supabase/phase-b-cloud-sync.sql`.
- Translation cache is now IndexedDB-first with optional Supabase
  read-through/write-through when the user is signed in and the Settings
  cloud-cache toggle is enabled.
- Writing analyzer history now gets durable IDs, queues
  `writing_feedback_logged`, and hydrates missing cloud history after
  enhanced-mode sign-in. Existing local writing history is also uploaded
  after hydration.
- Card add/import/remove/review actions now enqueue card sync events.
  `flushSyncQueue` routes authenticated events to Supabase and archives
  non-card progress events in `sync_events`. Existing local cards are
  uploaded after sign-in hydration so older local decks become cloud-backed.

## Verification

- `npm run build` — clean after every Phase A commit.
- `npm run lint` — no new errors introduced (only pre-existing).
- Manual smoke checklist:
  - Import → PDF tab → load past paper → results panel pinned.
  - PDF Reader → upload → click word → translate; right-drag → phrase;
    Select mode → drag → bucket → "Add" → cards appear in Study deck.
  - Writing → Auto-detect → live "Looks like X (Y%)" hint; analyse
    surfaces format hits/misses; tutor responds when key configured.
  - Settings → translator + tutor picker; greyed options without keys.

## Open follow-ups

- Service worker offline support is not yet wired (PRD Phase 2 item).
- The English writing grader currently has lighter format coverage than
  the Malay one for letter sub-types — extend over time with marked-up
  past-paper examples.
- DeepL doesn't support Malay; the router transparently falls through
  to Google. If DeepL ever ships `MS`, no code change required.
