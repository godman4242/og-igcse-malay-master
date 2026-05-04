# RESUME HERE — STOP. Wrong directory.

If you opened this in a fresh Claude Code session, **you are most likely
in the wrong repo.** The user has retired this fork. All active work
happens in the sibling repo. Switch first, then read its handoff doc.

---

## What changed

This repo (`og igcse malay master/`) was the static, free, client-only
fork. The user has chosen the upgraded fork — `upg-igcse-malay-master/` —
as the active codebase, because it has Supabase cloud sync, Auth tiers
(`userRole: 'static' | 'enhanced' | 'admin' | 'owner'`), telemetry, and
service worker.

PR #1 (which originated from this repo) was **closed as superseded** —
its work was merged into upg via PR #2. Do not reopen PR #1.

The two repos share the same GitHub remote
(`godman4242/og-igcse-malay-master.git`); the "fork" is just two local
checkouts on different branches.

## Switch to the active repo

```bash
cd "/Users/kheshav/Kheshav/kheshav code/upg-igcse-malay-master"
cat RESUME_HERE.md
```

The upg `RESUME_HERE.md` is the canonical handoff doc. Read that
end-to-end before doing anything else.

## If the user explicitly asks you to work in this repo

Edge case only — typically because they're cleaning up branches or
reviewing closed history. The state here is:

- **Branch:** `feat/pdf-translator-writing-upgrade` (local), pushed to
  `origin/feat/pdf-translator-writing-upgrade-og`.
- **Build:** clean.
- **Lint:** 0 errors + 2 pre-existing dep warnings.
- **PR:** #1, closed (superseded by #2). Branch on origin can be
  deleted once the user confirms.

Do **not** make new feature commits here. Make them in the upg repo.
