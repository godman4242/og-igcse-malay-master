<ship-bar-local>
PROJECT ADDITIONS — these ADD TO the global contract in ~/.claude/ship-bar.md, which the
global hook injects separately every turn. They never replace it. Keep this file to the
rules that are TRUE HERE AND NOWHERE ELSE; anything universal belongs in the global file.

A. CONTENT GATE. "Gate green" in this repo means build + tests + lint **+ content-lint**
   (`node scripts/lint-content.mjs`). This app ships learning content: a malformed
   question or a broken card is a user-facing defect that eslint cannot see.
B. DEPLOY IS NOT "PUSHED". After a push to main, confirm the Vercel deployment reaches
   READY before calling anything live — the global bar's "deploy confirmed live" means
   exactly that here, not a green push.
</ship-bar-local>
