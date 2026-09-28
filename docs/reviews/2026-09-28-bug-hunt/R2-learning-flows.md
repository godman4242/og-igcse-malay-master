# R2: Learning-flow correctness review (FINAL)

HEAD: `5603d88` · reviewer R2 (learning-flow) · read-only. No repo files were touched.
Probes (all re-runnable with `npx vite-node <file>` from the repo root):
`/private/tmp/claude-501/-Users-kheshav-kheshav-code-og-igcse-malay-master/5f674039-76b7-4acb-9e85-b138dfdeebc2/scratchpad/probes/r2/`

**Counts:** P0 0 · P1 6 · P2 6 · KNOWN-STILL-LIVE 1. All 12 new findings are CONFIRMED by a probe.

---

## F1 · P1 · Listen mode never records a failure, and a wrong answer followed by a retype is credited "Good"
`src/components/study/ListenMode.jsx:13-22`
```js
const check = () => {
  const correct = input.trim().toLowerCase() === card.m.toLowerCase()
  setFb({ correct, answer: card.m })
  if (correct) session.rate(Rating.Good)        // wrong → no rate at all
}
const reveal = () => {
  setFb({ correct: false, answer: card.m })
  setTimeout(session.nextCard, 2000)            // never rated Again; timer never cleared
}
```
**Scenario:** the learner hears "kucing" and types "kucingg", then taps Check. The screen shows `💡 kucing = cat` and nothing is rated. The input stays enabled, so they copy the answer shown, type "kucing", press Enter, and the card is rated **Good**. Listen mode can never produce an Again: a wrong answer or a Reveal leaves FSRS untouched, so no relearning is scheduled and no mistake is logged. The "Why?" chips never appear either, because `pendingWrongWord` is only set by `rate(Again)`. Tapping Reveal twice starts two `nextCard` timers, and one card is skipped.
**Proof: CONFIRMED** (`listen.mjs`, jsdom render of the real component):
```
after WRONG check: rates= [] feedback= 💡 kucing = cat input.disabled= false
after RETYPE-from-shown-answer: rates= [3] (Rating.Good=3, Again=1)
after 2x Reveal + 2.2s: rates= [] nextCard calls= 2
```

## F2 · P1 · Tapping "Next Card"/"Skip" during the 5 s wrong-answer pause drops the next card's answer and then skips that card
`src/hooks/useStudySession.js:129-175` (the latch plus an uncleared `setTimeout`). The bypasses are `src/pages/Study.jsx:178` (the "Next Card" button, always visible), `src/components/study/ClozeMode.jsx:39` (Skip) and `FlashcardMode.jsx:100` (the `n`/→ keys).
```js
const rate = (rating) => {
  if (!card || advancingRef.current) return     // latched for 5 s after Again
  advancingRef.current = true
  ...
  const delay = rating === Rating.Again ? 5000 : 300
  setTimeout(() => { advancingRef.current = false; ... nextCard() }, delay)
```
**Scenario:** the learner gets card A wrong, which starts a 5 s wait with no Continue button. They tap "Next Card" (natural). Card B appears and they answer it correctly. `rate()` returns early because it is still latched, but the mode still shows "✅ Correct!". When A's timer fires, `nextCard()` runs again and B is pulled away. B's review is never written and the session's `reviewed` count is wrong. The timer is also never cleared on unmount, so leaving the page within 5 s of the last card still fires `addStudyMinutes` and confetti.
**Proof: CONFIRMED** (`session.mjs`, the real `useStudySession` and the real Zustand store, 4 due cards):
```
rate Again  cardIdx= 0 card= satu reviewed= 1
Next Card   cardIdx= 1 card= dua reviewed= 1
rate Good   cardIdx= 1 card= dua reviewed= 1      ← answer dropped
after 5.2s  cardIdx= 2 card= tiga reviewed= 1     ← dua yanked away
'dua' reps before=3 after= 3
```

## F3 · P1 · English grader flags correct complex sentences as a HIGH "comma splice", and this costs a full band
`src/lib/writingErrors.js:892-934`. The rule checks only the word just before the comma. It never checks whether the sentence starts with a subordinator (When/While/Since/As/Even though…). The only other skip is a lead-in of ≤4 words. The starter regex is case-sensitive, so in practice it fires on ", I <verb>", which is exactly the shape of first-person narratives and diaries.
```js
const re = new RegExp(`(\\w+),\\s+(${starters})\\s+(\\w+)`, 'g')
...
if (COMMA_SPLICE_SKIP_WORDS.has(m[1].toLowerCase())) continue   // word BEFORE comma only
if (wordsBefore <= 4) continue
```
**Scenario:** "When I got home from school, I felt very tired." is a subordinate clause followed by a main clause, which is correct English and the complex sentence IGCSE rewards. It gets a HIGH grammar error saying "Use a full stop…". Following that advice produces the fragment "When I got home from school." The rule also fires on the app's own Band-6 exemplars (`eng-diary` closing, `eng-letter-formal` opening).
**Proof: CONFIRMED** (`splice.mjs`): FLAGGED HIGH on "When I got home from school, I felt…", "As I close this notebook tonight, I feel…", "While my mother was cooking dinner, I did…", "Since we moved to the new house, I have…" and "Even though the test was very difficult, I tried…". The genuine control splice "…with my mother, we bought some fish." is **not** flagged, because the regex needs a capitalised "We".
**Band impact** (`band.mjs`, `score(text,{lang:'eng',format:'eng-narrative'})`, a correct 181-word narrative): as written, **accuracy 4 / band 4**. The same essay with the falsely flagged sentences reworded: **accuracy 6 / band 5**. The penalty feeds `errPer100` (`writingGrader.js:301-329`). It also feeds Exam Rehearsal's writing band, which is 35% of readiness (`ExamRehearsal.jsx:198-205`).

## F4 · P1 · "There is some good news" gets a HIGH error, and the suggested fix ("there are some") is wrong English
`src/lib/writingErrors.js:1048-1050`
```js
{ re: /\bthere\s+is\s+(many|several|few|two|...|some|various)\b/gi,
  msg: 'Use "there are" with plural countables.',
  fix: (m) => m.replace(/there\s+is/i, 'there are') },
```
**Why it's wrong:** "some" also goes with uncountable nouns: *There is some water / news / information / advice / time*. "News", "information" and "advice" are uncountable in English, so "There are some good news" is a textbook learner error. The rule teaches it. It fires inside dialogue quotes too, and it fires on the app's own comprehension passage `coral-reefs`.
**Proof: CONFIRMED** (`en-battery.mjs`):
```
"There is some good news."                    high/subject-verb«There is some»→there are some
"There is some information on the website."   high/subject-verb«There is some»→there are some
"There is some advice I would like to give you." high/subject-verb«There is some»→there are some
```

## F5 · P1 · "Sentence fragment: no clear verb" on correct sentences using common irregular pasts or contractions
`src/lib/writingErrors.js:986-1002` (the `VERB_HINTS` list) together with `detectFragments` at 1004-1029 (MED severity, which counts toward `allErrPer100`). Missing from the list: found, began, thought, rang, forgot, bit, froze, sank, understood, blew, meant, sit, and the contracted verbs in `'s / 'm / 're` ("it's", "I'm", "you're"). British "practise" is also missed.
**Scenario:** "We found a wallet on the road." gets MED "Every sentence needs a subject and a verb." The flag appears on the app's own passages too ("She found Room 7B by accident." in `first-day`, "Hi sweetheart, it's Mum." in `voicemail-mum`).
**Proof: CONFIRMED** (`frag.mjs`): **17/27** correct sentences flagged. Examples: "The film began at eight.", "I thought about it all night.", "The phone rang twice.", "I understood the lesson.", "It's my birthday today.", "I'm ready now.", "We practise every day.".

## F6 · P1 · Saved-word cloze: English-mode learners get Malay-only instructions and are marked wrong for following them, and the session mixes MS and EN cards
`src/pages/SavedWordCloze.jsx:34-39` (no `cardsForLang`) and the hard-coded copy at `:159, :165, :171, :174`
```js
useStore.getState().cards.filter(c => c.t === 'Saved')      // both lang:'ms' and lang:'en'
...
{q.kind === 'cloze' ? 'Fill in the missing word' : 'Produce the Malay word'}
{q.kind === 'cloze' ? 'Meaning' : 'English'}: {q.clue}      // for an en card, clue = the MALAY gloss
placeholder="Type the Malay word…"
```
`SelectionToCard.jsx:21,69` saves into the same `'Saved'` deck with `lang` set from `studyLang`. For an EN card, `card.m` is the English target and `card.e` is the Malay gloss.
**Scenario:** an English-mode learner saved "reluctant" (gloss "enggan"). The screen says "Produce the Malay word · **English: enggan**". They type "enggan" as told and get **"Answer: reluctant"**. The Hard rating is then written to FSRS. The learner's older Malay saves are served in the same session, which breaks the "decks never mix" invariant.
**Proof: CONFIRMED** (`swc.mjs`, jsdom plus the real store with `studyLang:'en'`):
```
CARD 1 screen: Practise saved words 1 / 2 Produce the Malay word English: enggan Check Show answer
input placeholder: Type the Malay word… | aria-label: Type the Malay word
after typing the Malay word as instructed: Answer: reluctant
CARD 2 screen (studyLang=en): … Produce the Malay word English: cat    ← Malay card in an EN session
```

## F7 · P2 · Both graders put HIGH punctuation and capitalisation errors on e.g., a.m./p.m., email addresses, URLs, `dll.`/`dsb.` and ellipses
`src/lib/writingErrors.js:837-849` (the spacing-after-punct allow-list only knows `e.g.` as a whole, so the first dot of "e.g." is flagged) and the `cap-sentence` rule. Malay: `src/lib/writingErrorsMalay.js:736-750` and `:676-705` (`[.!?]\s+([a-z])` becomes HIGH).
**Why it's wrong:** `dll.` (*dan lain-lain*) and `dsb.` (*dan sebagainya*) are standard DBP abbreviations and are followed by a lowercase word mid-sentence. A mid-sentence ellipsis ("Saya menunggu... dan terus menunggu") is stylistically valid. Email addresses are required content in the e-mel/email format.
**Proof: CONFIRMED** (`en-battery.mjs`, `ms-text.mjs`, `grader-corpus.mjs`): "Pack warm clothes, e.g. jumpers" gives HIGH `.g` plus HIGH `j→J`. "opens at 9 a.m. every day" gives HIGH plus HIGH `e→E`. "ali@school.edu.my" gives 2× HIGH. "…ikan dll. untuk kenduri" gives HIGH `u→U`. "…minyak dsb. di kedai" gives HIGH. "I waited... and waited" gives HIGH. The app's own `ms-email` exemplar gets **4 HIGH** flags on its email headers.

## F8 · P2 · Dictation counts the em-dash "—" as a word, so 6 of 59 sentences can never score 100%
`src/lib/dictation.js:50-52`. `normalize()` strips `.,!?;:'"()` but not `—`, so the dash becomes its own reference token that nobody can hear or type.
**Proof: CONFIRMED** (`dict.mjs`): a perfect transcription scores 92–97% with a red "✗ —" chip. Affected: 4 EN sentences (e.g. "Don't worry about dinner — I've…", 97%) and 2 MS sentences (e.g. "…naik teksi atau Grab — lebih senang.", 92%).

## F9 · P2 · Curly apostrophes (iOS Smart Punctuation default) mark correct contractions wrong
`src/lib/dictation.js:50-52` (normalises only the straight `'`). The same happens in `TypeMode.jsx:20` for the gloss `'jangan': "don't"` (`dictionary.js:184`).
**Scenario:** on an iPhone, typing "Don't" inserts "Don’t" (U+2019). The reference normalises to "dont" and the typed word stays "don’t", so it's a miss.
**Proof: CONFIRMED** (`dict.mjs`, the reference sentence retyped with ’): 5 EN sentences drop to 75–95% (missing "its", "ill", "dont", "ive", "oclock", "im", "shes").

## F10 · P2 · Type mode accepts the bare word "to" as the meaning of 97 of 825 dictionary verbs
`src/components/study/TypeMode.jsx:20-21`
```js
const correct = trimmed === card.e.toLowerCase() || containsWholeWord(card.e, trimmed)
```
"Any whole word of the gloss" (a deliberate leniency, pinned in `typeModeGrading.test.js:103`) also credits function words.
**Proof: CONFIRMED** (`typemode.mjs`): "to" is credited for 97 glosses (bekerja="to work", berenang="to swim"…), "in" for 10, "for" for 6, "a" for 5, "the" for 4. "older" is accepted for both abang and kakak. Each of these is a Good rating in FSRS for a word the learner did not produce.

## F11 · P2 · After a wrong answer in Type or Cloze mode, retyping flips the UI to "✅ Correct!" while FSRS keeps Again
`src/components/study/TypeMode.jsx:12-24` and `ClozeMode.jsx:14-18`. Neither `check()` has an `if (fb) return` guard, and the input stays enabled. ProduceMode (`:31`) does have the guard.
**Scenario:** the learner types "dog" for kucing, sees "❌ cat", types "cat" and presses Enter. The screen now says "✅ Correct!" and the Why? chips disappear. `rate()` is latched and drops the second call, so FSRS records Again.
**Proof: CONFIRMED** (`type2.mjs`, with a stub that latches like the real `rate`): `rates= [1,"DROPPED(latched)"]` and `UI now shows: ✅ Correct!`.

## F12 · P2 · Malay grader tells narrative writers not to use "akhirnya" mid-story
`src/lib/writingErrorsMalay.js:787-817`. `CLOSING_MARKERS` includes `'akhirnya saya'` and `'pada akhirnya'`, and any occurrence in the first 50% of the text gets a MED flag ("biasanya digunakan dalam perenggan penutup. Pindahkan ke perenggan akhir.").
**Why it's wrong:** in *karangan cerita*, "akhirnya" means "finally / at last" as a narrative adverb ("Selepas berjalan jauh, akhirnya saya nampak sebuah pondok"). It is a conclusion marker only in expository essays. The MED flag also counts toward `allErrPer100`.
**Proof: CONFIRMED** (`ms-text.mjs`): a correct 2-paragraph narrative gets `medium closing-too-early «akhirnya saya»`.

---

## KNOWN-STILL-LIVE
- **Census A15 · P2 · Comprehension: in-flight AI questions land on whichever passage is open.** `src/pages/Comprehension.jsx:103-127`. There is no passage-identity check after `await callTextAI(...)`. The back button (`:322` `setPassage(null)`) stays enabled while `generating`. If the learner goes back and picks passage B, the questions generated for A are applied to B (`:200` `questions = aiQuestions || passage.questions`). **TRACED** at HEAD.

## Checked, no finding
- `src/lib/wholeWordMatch.js`, `blankWord.js`, `clozeBuilder.js`: Unicode whole-word boundaries hold, and hyphenated reduplication stays one token.
- `clozeListening.js` `checkGap`: gap words are alphabetic only, so the apostrophe issue can't reach them; case and punctuation are neutralised.
- `listeningMistakes.js`: the em-dash is filtered out by `isContentWord` (no junk journal entries).
- `QuizMode.jsx` plus `study/quizOptions.js`: same-language distractors per `card.lang`, and there is an `fb` guard.
- `ProduceMode.jsx`: exact match with an `fb` guard.
- `useStudySession` finish check is scoped with `cardsForLang` (fix #12 is live).
- Comeback warm-up single-list queue (census A3/A4) is fixed in `studyQueue.js`.
- `interleave.js`: EN sessions drop the Malay grammar drills.
- `examReadiness.js`: normalisation is correct, and `listeningPct:0` counts.
- `studyMix.js`, `study/sessionResult.js`, `mistakeDrill.js` (null/reflect downgrade is sound).
- `MistakeJournal` drill: snapshot queue, never touches FSRS.
- Grammar transform/imbuhan checks are exact-match, which is defensible given the visible hints.
- Census A1 `kediaman` removed (`wordFamilies.js:412`).
- Malay grader sentence rules: **0/82** false flags on a battery of standard (baku) sentences covering di-passive vs di-preposition, dari/daripada/kepada, reduplication, time markers, `RM3.50`, `8.00 pagi`, `SMK`.
- ExamRehearsal composite and stage timers are cleared on stage change.
- Not re-reported: the known "misses tense errors" work item.
