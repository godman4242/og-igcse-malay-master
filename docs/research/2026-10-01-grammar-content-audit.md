# Malay content audit — 2026-10-01 — `src/data/grammar.js` (GOAL #60, file 1/7)

> **Status:** 2 verified fixes APPLIED (pinned by `src/data/__tests__/contentAudit20261001.test.js`). 4 unverified doubts left in the data, listed below. Method = `docs/research/2026-09-29-malay-content-audit.md`. **Cloud session caveat:** PRPM (`prpm.dbp.gov.my`) and Wiktionary are blocked by this session's egress proxy on every route (curl, WebFetch), so every lookup went through web search quoting Kamus Dewan / Tatabahasa Dewan text; anything only KBBI (Indonesian) could confirm is listed as unverified, not changed. Review: one fresh-context reviewer subagent read the diff (verdict in the overnight report).

## Entries read: 123 (every Malay line, explanation and answer key)
- `IMBUHAN_DRILLS` 63 (24 meN-, 9 ber-, 5 peN-, 8 passive, 17 suffix) · `TENSE_DRILLS` 16 · `ERROR_DRILLS` 20 · `TRANSFORM_DRILLS` 20 · `GRAMMAR_RULES` 22 rule rows.
- Every answer key re-derived by hand against the meN-/ber-/peN-/di- allomorph rules (Tatabahasa Dewan) — all 63 affix answers, 8 passives, 20 transforms and 16 tense keys hold. The tense drills show the English translation on screen (`Grammar.jsx:652`), so a sentence where several aspect words would fit ("Ali _____ makan nasi") is still single-answer for the learner.
- Register: all Malaysian (kereta, bil, cikgu, filem, baharu). No Indonesian forms.

## Fixes (2, both explanation lines; ids untouched)

| id | was | now | why | source | confidence |
|---|---|---|---|---|---|
| `transform-noun-mengajar2` | hint `peN- + root + -an = process noun (K drops)` | `… (peng- before a vowel: ajar → pengajaran)` | `ajar` starts with a vowel; there is no k to drop. The "K drops" note teaches the wrong allomorph rule for the very example shown. | the file's own `GRAMMAR_RULES['peN-']` row "peng- + g, h, k, vowels"; Tatabahasa Dewan peN- allomorphs | high |
| `prefix-peN-kerja` | hint `peN- + kerja = worker` | `pe- + kerja = worker (pairs with bekerja)` | Tatabahasa Dewan treats **pe-** (petani, pekerja, pesakit — the ber- verb's agent, humans only) as a prefix distinct from peN- (whose regular form of kerja is *pengerja*). The drill's own `rule` already said "pe- + kerja"; the hint contradicted it, and `wordFamilies.js` was relabelled `pe-` in the 2026-09-29 audit. `prefix: 'peN-'` is kept: it is the concept-tracker key (`Grammar.jsx:237-241`) AND the card badge "Add peN-" (`Grammar.jsx:546`), so the hint names pe- without saying "not peN-" (the reviewer caught that contradiction); the drill stays in the peN- group the way Tatabahasa Dewan files pe- beside peN-. | Tatabahasa Dewan (anyflip digital ed., pp. 51–100: "Awalan pe- … tanpa melibatkan apa-apa perubahan … hanya boleh digunakan untuk manusia"); 2026-09-29 audit `pekerja` row | medium-high |

## Checked and cleared (so they don't get re-flagged)
- `error-mencomel`: Kamus Dewan **comel II** → *mencomel* = merungut/mengomel (quoted via maksudperkataan.com's Kamus Dewan copy). The drill is right.
- `error-mentadbir` / `error-menterjemahkan` + their "loanwords keep t (tadbir, terjemah, tafsir)" explanation: Kamus Dewan lists *mentafsirkan* (its *penafsir* entry: "orang yg mentafsirkan"), *mentadbir*, *menterjemahkan*. Correct.
- `GRAMMAR_RULES['peN-']` example *pemfitnah*: Kamus Dewan "orang (pihak) yg membuat fitnah". Real word.
- `GRAMMAR_RULES['meN-']` *memveto*-type mem- + v: Tatabahasa Dewan cites *memveto* for the rule, so "mem- + b, f, p, v" is right as a rule (its example word is a doubt below).
- *menanya, penyapu (broom), berteriak, berasa, bekerja, belajar, mengecat, mengelap, menanti, merangkak, kediaman, pembacaan, penyiaran, keindahan*: standard Kamus Dewan forms (menanya/penyapu re-confirmed 2026-09-29).
- "menterjemahkan … ke bahasa Inggeris": Kamus Dewan defines *terjemahan* as "pindahan … daripada suatu bahasa ke suatu bahasa yang lain" — *ke bahasa* is fine.

- `GRAMMAR_RULES['peN-']` row "peng- + g, h, k, vowels" carries note "K drops!" next to the example *pengajar* (a vowel root). Same shape as the meN- row (*mengambil*): the note describes the k case of a four-case row, not the example — left as is (reviewer finding 2; a layout call, not a wrong fact).

## Unverified doubts (NOT changed)

| line | doubt | what I tried |
|---|---|---|
| `GRAMMAR_RULES['meN-']` example **memvaksin** | Only KBBI (Indonesian) attests *memvaksin*; I could not confirm a Kamus Dewan entry. *Memveto* is the form Tatabahasa Dewan itself uses for mem- + v. | PRPM blocked; web search found only KBBI/Kompas. Driver: `prpm.dbp.gov.my/cari1?keyword=memvaksin`; if absent, swap the example to *memveto*. |
| `suffix-kean-aman` meaning **'security/safety'** | KBBI/Kamus Dewan-style definition is "keadaan aman; ketenteraman" = **peace**. "Safety" is *keselamatan*. Likely better: 'peace/security'. | PRPM blocked; only KBBI reachable. Driver: `keyword=keamanan`. |
| `tense-pelajar-peperiksaan` **"mengambil peperiksaan"** | Official Malaysian register is *menduduki peperiksaan*; *mengambil* is widespread but I found no DBP ruling that it is standard. Grammatical either way. | Search of MOE/JPA documents (both forms occur). Driver: `keyword=ambil` sense list. |
| `GRAMMAR_RULES['meN-']` "men- + c, d, j, t" / peN- "pen- + c, d, j, t" | Incomplete rather than wrong: z and sy also take men-/pen- (menziarahi, mensyukuri). Left as is — adding letters is a product call, not a correctness fix. | Tatabahasa Dewan allomorph table (from memory of the standard rule; not re-read this session). |

## Counts
- Entries read: 123 · fixes: 2 (0 Malay word changes, 2 explanation lines) · unverified: 4 · ids renamed/reordered/deleted: 0.
