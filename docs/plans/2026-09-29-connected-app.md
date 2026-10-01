# Connected app — plan (APPROVED 2026-09-29)

> **Kheshav's approval (2026-09-29):** all 8 combos ("maybe all of them, you can start with the one word panel"; D–H "all look good,
> if you agree you can add all" — agreed, with the guards on F and G below). Phase 1 (navigation) starts NEXT session; the word
> panel (combo A) is the first combo, in Phase 2.

**Why:** Kheshav, 2026-09-29: the app is "a bit hard to navigate since all the features are in the practice
section"; features should be "more interconnected with each other instead of separate" and "all be there
regardless so that they help the user as much as possible". Every item below serves that, and each names the
learning principle it serves (`docs/reference/learning-science.md`).

**North-star for this epic:** a feature comes to the learner at the moment it helps. Three shared pieces make
that cheap: **one word panel** (the same card wherever a Malay word is tapped or highlighted), **one search**
(pages + help answers + words + your cards), and **hubs** instead of a 15-tile Practice grid.

Facts this plan rests on (measured 2026-09-29, `git show 1143d0b`):
- 23 routes; bottom nav = Home · For You · Study · Grammar · Roleplay · Practice; Practice holds 15 tiles.
- The header shows the brand on every page; the page's name exists only as a screen-reader `<h1>`
  (`Layout.jsx:152`, names in `lib/routeMeta.js`). No back/forward anywhere. Header search finds dictionary
  words + your cards only.
- Word families: 41 roots / 209 forms (`data/wordFamilies.js`); **no word → family lookup, no affix meanings**;
  two stemmers, neither returns root + prefix + suffix (`Import.jsx:28` stem, `lib/taskCoverage.js:67` malayStem).
- No way to edit a meaning anywhere; a card's gloss is COPIED into the card at creation (`card.e`).
- Cikgu Expert mode = 33 Malay-only keyword entries, answers only when the match score ≥ 40.
- Import has 7 things the Reader lacks: paste text, edit the text, stemmer glosses, dictionary-phrase detection,
  the whole-text word inventory, the word-by-word chip grid, Undo.

## Kheshav's asks → verdict

| # | Ask | Verdict | My version (and why it's better) |
|---|---|---|---|
| 1 | Replace the Expert chat with an FAQ + search | **Yes** | Fold it into the ONE header search: typing "meN- or ber-?" shows the answer card instantly, next to matching pages, words and your cards. Cikgu Maya becomes AI-only chat; with no AI available it shows the same search instead of a fake chat. Keeps the 33 answers (free, instant, offline), drops the pretend conversation. |
| 2 | Group related features; Home as the gateway | **Yes** | 5 hubs in the bottom nav: **Home · Words · Read & Listen · Speak & Write · Grammar**. "For You" folds into Home (it IS personal suggestions); Exam Rehearsal + real past papers live on Home's exam card and in each hub. Every hub page = 3–5 big tiles, one "next best" highlighted. |
| 3 | Merge Import into the Reader | **Yes (merge, not delete)** | The Reader gains "Paste text", stemmer glosses, phrase detection, "Make cards from all new words" (the inventory) and Undo; `/import` redirects there. Renamed "Reader". |
| 4 | Word-family bubble on flashcards (draggable, not on roots, double-click → tree) | **Yes, changed** | A small chip on the card's **back** (after you try — on the front it would give the meaning away): "ber- + main". Tap → side panel: the family, what the prefix/suffix does, 2–3 sibling words. "Open the family tree" button (double-click kept as a desktop shortcut — double-tap zooms on phones). Not draggable: a floating circle covers the card or the rating buttons, and dragging fights taps. Hidden for root words, as asked. |
| 5 | Page name on top + search + back/forward (phone and PC) | **Yes** — ✅ header built 2026-10-01 (branch `claude/a6-p1-header`, held for the driver's look; search = Phase 1 step 2) | Compact header: ← → · page name · ▶ tour · Save · 🔍. Brand only on Home. Forward greys out when there's nothing ahead. Gives back ~70 px of phone screen (today the brand block is ~130 px tall on every page). |
| 6 | New words auto-join the word tree | **Yes, with a guard** | A stemmer that returns root + prefix + suffix links a new word only when its root is a known headword; shown as "auto-linked" with a ✕ to unlink. Wrong splits (kelapa ≠ ke-+lapa) are the risk; the guard + an allow-list keep them out. |
| 7 | Edit meanings (double-click) + reset-all + 30-day restore | **Yes** | ✏️ pencil next to every meaning (double-click = desktop shortcut). Your meaning shows with "yours" + the original underneath. "Reset all to default" keeps a snapshot 30 days, restorable from Settings. Bonus: each edit is also a signal for me to fix the dictionary for everyone. Store + sync change → STORE_VERSION bump, cross-device test, 4-reviewer gauntlet. |
| 8 | Highlight-to-translate flips flashcards | **✅ Fixed 2026-09-29** | See RESUME_HERE. Front can't be highlighted (it'd give the answer away); back never flips on a tap, repeats the Malay word, has "show front". |
| 9 | Content: past papers + wrong translations | **✅ Translations fixed (29) · papers = link only** | Cambridge forbids hosting its papers. A "Real exam papers" page links the official free ones (0546 / 0500 / 0510) and tells the learner to open the PDF they downloaded in the Reader — tap-to-reveal on a real paper, legally (their file, never uploaded). |
| 10 | A better/cheaper translator than Google | **Trial first** | Mozilla's Bergamot runs ON the device, free, offline, supports Malay (en↔ms). No source proves it beats Google for Malay → 50-sentence blind bake-off before switching. Chrome's built-in translator has no Malay. DeepL has no free API. |
| 11 | A better/cheaper AI | **Switch after a measured eval** | The server uses `gemini-3.5-flash` ≈ **20 free requests/day** for everyone; `gemini-3.5-flash-lite` ≈ **500/day** (25×), both free. Malay grading quality unmeasured → run the ai-tier eval on both, switch the chat/translate routes, keep writing-grading on whichever scores better. GLM 5.3 Flash is paid ($0.15/$0.50 per M tokens); the free GLMs have no Malay evidence. "Jev" (TypeSafe AI, 2026-09-15) outputs scores, not text, and is paid — not a tutor. |

## Feature combos (all 8 approved 2026-09-29)

| Combo | What the learner sees | Principle | Effort |
|---|---|---|---|
| **A. One word panel everywhere** | Tap/highlight any Malay word — flashcard back, reader, comprehension, roleplay transcript, mistakes, search — and get the SAME panel: meaning (editable), family + affix meaning, example, 🔊, add-to-deck. Replaces 4 different popovers. | Elaborative encoding; consistency (ADD) | M — foundation for #4/#7 |
| **B. Every mistake gets a "Why?"** | A wrong grammar drill, flashcard or writing error shows a "Why?" that opens the matching help answer. | Immediate corrective feedback | S |
| **C. Build-the-word drills from your own deck** | Learned *membaca*? Get "baca + peN- = ?" — morphology practice from words you already know, scheduled by FSRS. | Generative retrieval; transfer | M |
| **D. Real past paper in the Reader** | Home's exam card → "Practise on a real paper": official link → open the download in the Reader; unknown words → cards. | Authentic materials; exam alignment | S |
| **E. Home "Today" chain** | ONE big button that walks you through: due cards → your top mistake's Why? → a 2-minute read full of your new words. | Interleaving; one clear next action (ADD) | M |
| **F. Writing error → family + drill** | An imbuhan error in your essay links to that affix's family examples and a 3-question drill. **Guard:** only when the grader names a specific affix — its affix detection is imperfect, and a wrong link teaches the wrong family. | Targeted practice | S |
| **G. Listen to your own text** | Any Reader page → "Dictation from this page" (hear a sentence, type it). **Guard:** PDF / pasted / sample text only — never OCR'd photos or transcribed audio, where a misread would be drilled in. | Dual coding; reuse | S |
| **H. Ask about this** | A "?" on grammar drills and reader sentences opens search pre-filled with the rule, then AI if you want more. | Help at point of need | S |

## Build order (each phase ships on its own; attended — product judgment + big UI)

> ⏰ **Deadline (flagged 2026-09-30):** the Claude subscription ends **2026-10-09**; after it, work moves to JClaw + GLM-5.3
> (text-only — screenshots need Kimi K3). So the phases that most need Claude-level judgement go first, one attended session a
> day: **Phase 1 → A1 shared-device fix → Phase 2 (word panel) → Phase 3 (edit meanings, store/sync)** by Oct 8. Phases 4–7 and
> the smaller combos are the safer ones to hand to the successor setup. Veto: renew the subscription and the order stops mattering.

1. **Find your way** — header (page name, ← →), search-everything incl. help answers, hubs. ~1 session.
2. **One word panel** (combo A) + word→family index + verified affix-meaning table + the flashcard family chip. ~1 session.
3. **Edit meanings + 30-day restore** — high-risk (store/sync) → gauntlet. ~1 session.
4. **Reader absorbs Import**. ~1 session.
5. **Approved combos** (B–H), smallest first.
6. **AI/translation**: flash-lite eval → switch; Bergamot bake-off. Needs Kheshav's Gemini key (already in `.env.local`).
7. **Auto-family for new words** (after 2 — it reuses the index).

**Red-team of this order.** *Steelman doing the word panel first:* it is the most "interconnected" piece and
#4/#7 hang off it. *Why navigation still goes first:* it's Kheshav's #1 pain, touches every page (so it should
land before other UI work to avoid rebasing twice), and it's lower risk. *Where it breaks:* the hub regroup
changes the app tour (`tourSteps.js` has the nav steps), 3 e2e specs that click nav items, and ~8 source files that link to
`/practice` (measured 2026-09-29) — keep `/practice` working as an "All features" page so no link dies.
*Hidden dependency:* the A1 shared-device fix (RESUME_HERE kickoff) is still the top SAFETY item — it must ship
before learners share school computers, whatever this plan's order.
