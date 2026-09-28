# R4 — Robustness review (async / device-API surfaces)

Status: DONE (2026-09-28). HEAD = 5603d88. Findings ranked worst-first; each verified.
Probes (all under `scratchpad/probes/r4/`): `r4.probe.test.js` (pure; `vitest.probe.config.mjs`) and
`{speaking,cikgu,import,pdfrec}.rprobe.test.jsx` (jsdom React renders of the real pages; `vitest.react.config.mjs`).
Run from the repo: `npx vitest run --root <probes/r4> --config <probes/r4>/<config> --reporter=verbose`.

## Findings

Counts: P0 0 · P1 5 · P2 3 (one KNOWN-STILL-LIVE).

### 1. [P1] Speaking: leaving the page mid-answer never stops the continuous SpeechRecognition — it auto-restarts forever on every other page (mic hot, audio still streamed to the browser's speech backend)
- `src/pages/Speaking.jsx:85-92` (unmount cleanup) vs `:189-214` (`onend` auto-restart)
```js
useEffect(() => { return () => {
  abortRef.current?.abort()
  audioRecRef.current?.stop().catch(() => {})      // MediaRecorder stopped…
  if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
} }, [])                                            // …but recRef (the SR) is never stopped
…
rec.onend = () => {
  if (recRef.current && recRef.current._stopRequested) return   // never set on unmount
  … if (r && !r._gotResult) { …3-strike guard… }                  // skipped once any result arrived
  try { rec.start() } catch { … }
```
- Scenario: student taps "Bercakap jawapan", speaks a sentence, then leaves (browser Back, or "Exit theater mode" → any nav link). Speaking unmounts; `recRef.current` still points at the live recogniser with `_stopRequested=false` and `_gotResult=true`, so every Chrome session end (post-silence / ~60 s) restarts it. The mic indicator stays on across the whole app until the tab is closed; any speech keeps resetting `_restarts`. (Only `stopRecording` sets `_stopRequested`; it's unreachable after unmount.)
- PROOF: CONFIRMED (jsdom render probe `speaking.rprobe.test.jsx`: render Speaking → pick topic → "Bercakap jawapan" → one result → `root.unmount()` → fire `onend` ×5):
```
PROBE SR lifecycle: start#1 --- unmounted --- start#1 start#1 start#1 start#1 start#1
```
  (no `stop#1`/`abort#1` ever logged.) Not in any prior review.

### 2. [P1] `startRecognition` never settles when a session ends without a result or error → mic button stuck "Listening…" on 5 surfaces
- `src/lib/speech.js:177-198`
```js
recognition.onresult = (e) => { … resolve(results); };
recognition.onerror = (e) => reject(e);
recognition.onend = () => {};          // ← no settle
recognition.start();                    // no onnomatch handler, no timeout
```
- Scenario: Web Speech spec allows a session to end with `nomatch` + `end` (speech heard, nothing recognised — a mumbled/quiet Malay answer, a cough) or a bare `end` (no result, no error). Neither path resolves or rejects. The awaiting caller never reaches its `setListening(false)` / `finally`:
  - `CikguBot.jsx:304-316` dictation: `if (listening) return` → mic button dead until the page remounts. Voice mode (`:273-283`) stuck in LISTENING (only toggling voice mode off recovers).
  - `ExamRehearsal.jsx:217-233` + `:702` `disabled={recording}` → Record button disabled for the rest of the timed rehearsal.
  - `SpeakMode.jsx:56` → stuck "🎙️ Listening..." AND the parallel `createAudioRecorder` keeps the mic open until the card changes (its stop is in the never-reached `finally`).
  - `Roleplay.jsx:340`, `RoleplaySession.jsx:248` → button stays red "listening".
- PROOF: CONFIRMED (probe). Fake SR firing `nomatch`→`end`, and a bare `end`:
```
PROBE startRecognition after nomatch+end (300ms later): PENDING | onnomatch handler attached? undefined
PROBE startRecognition after bare end: PENDING
```
- Fix direction: settle in `onend` (resolve `[]` if nothing resolved/rejected yet) + handle `onnomatch`.

### 3. [P1] Import: "Add N cards" persists the in-flight placeholder `"loading..."` — or the word itself when offline — as the card's English (B4's sibling, never swept)
- `src/pages/Import.jsx:180-195` + `:218-224`
```js
const translateUnknown = async (word) => {
  if (translations[word]) return
  setTranslations(t => ({ ...t, [word]: 'loading...' }))      // sentinel lives in the same map…
  const result = await translateWord(word, plan.from, plan.to) // failure → { text: word, source:'error' } (translate.js:134)
  setTranslations(t => ({ ...t, [word]: result.text }))
}
…
e: w.meaning || translations[w.word] || w.word,               // …that addSelected reads as the gloss
```
- Scenario: paste text → Process → tap unknown words (each tap starts a lookup) → tap "Add N cards" before the lookups return (slow mobile data), or while offline. Cards are minted as `makarn = loading...` / `makarn = makarn`, with `ex` "makarn (loading...)." — confident-wrong cards that then enter FSRS. The PDF reader got the B4 guard (`partitionSelectionForDeck`, PDFReader.jsx:882); Import's add path has neither the sentinel nor the `source:'error'` check.
- PROOF: CONFIRMED (jsdom render probe `import.rprobe.test.jsx`, `translateWord` mocked as slow / all-providers-failed, reading the store after the real Add click):
```
PROBE slow-network card: {"m":"qzxbelajarx","e":"loading...","ex":"qzxbelajarx (loading...)."}
PROBE offline card: {"m":"qzxmembacax","e":"qzxmembacax","ex":"qzxmembacax (qzxmembacax)."}
```

### 4. [P1] AI-proxy "all models failed" SSE error frame is parsed as SUCCESS → Cikgu Maya posts an EMPTY reply (no expert fallback), breaker reset
- `src/lib/ai.js:230-251` (`readSSEStream.processLine`) ignores `{"type":"error"}`; `:271` then `recordSuccess()`.
- Server side sends exactly that frame with HTTP 200 when every free model fails: `supabase/functions/ai-proxy/index.ts:553-558`
```js
const errData = JSON.stringify({ type: 'error', error: 'AI service unavailable' });
controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
```
- Consumer `CikguBot.jsx:160-173` (Strategy 2 — the default path for a signed-in keyless learner): `ai.call` resolves `{response:''}` → `addMessage({ role:'assistant', content:'', mode:'ai' })` (store `useStore.js:788` doesn't filter) → an empty persisted Cikgu bubble, `return ''`; Strategy 3 (expert fallback, "always works") is skipped because nothing threw. Voice mode silently returns to IDLE. The daily quota was also incremented (`ai.js:192`) and the circuit breaker reset (`recordSuccess`), so repeated upstream failure never trips it. Same parser returns a mid-stream-truncated reply as a complete success.
- PROOF: CONFIRMED (probe, exact server frame):
```
PROBE sse-error-frame result = {"response":"","tokensUsed":0,"cached":false}
PROBE sse-partial result = {"response":"Imbuhan meN- digunakan untuk","tokensUsed":0,"cached":false}
```
- (RoleplaySession tolerates it via its `length > 5` fallback; CikguBot does not.)

### 5. [P1] Cikgu Maya voice mode: a question asked before leaving the page is answered AFTER unmount — Cikgu talks over whatever page you're on and a keyword-spotter mic opens
- `src/pages/CikguBot.jsx:268-296` (`handleSpeech`) + `:203-240` (`readResponse`); unmount cleanup `:266` only cancels refs that are still null during LISTENING/THINKING.
```js
const results = await startRecognition('ms-MY')      // no abort handle, not cancelled on unmount
…
const replyText = await sendMessage(transcript)       // AI call: several seconds (THINKING)
…
readResponse(newAssistantIdx, replyText)              // speakWithBoundaries + startKeywordSpotter
```
- Scenario: voice mode ON → tap mic → ask → navigate to Dashboard while "Listening…/Cikgu Maya is thinking…". The pending promise chain continues on the dead component: the message pair is written to history, TTS reads the reply aloud on the Dashboard, and `onStart` launches a continuous `startKeywordSpotter` (mic on). The new page has no Stop control for it; it ends only when TTS ends. Also, `startRecognition` itself can't be aborted, so the mic stays open after unmount until the user stops talking.
- PROOF: CONFIRMED (jsdom render probe `cikgu.rprobe.test.jsx`, speech lib mocked, expert tier): enable voice → mic → `root.unmount()` → resolve recognition:
```
PROBE cikgu: --- unmounted --- | TTS speaks: I'm not sure I have a precise answer for | MIC keyword spotter started
```

### 6. [P2] PDF reader "Record": a double-tap opens two mic streams; the first is orphaned and stays live even after leaving the reader
- `src/pages/PDFReader.jsx:591-624`
```js
if (recording) { … stop … return }                     // `recording` is still false until getUserMedia resolves
…
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const mr = new MediaRecorder(stream)                   // (a throw here also leaks `stream`)
…
mediaRecRef.current = mr                               // 2nd tap overwrites the 1st recorder
mr.start(); setRecording(true)
```
- Scenario: learner taps Record twice (slow permission/mic spin-up, or impatience). Both calls pass the `recording` guard, both acquire a stream; `mediaRecRef` keeps only the second. Stop and the unmount cleanup (`:444`) only ever stop `mediaRecRef.current`, so recorder #1 + its stream run until the tab closes (mic indicator stays on app-wide). Related trigger, same root cause: loading a sample/file/photo while recording swaps the empty state (the only place the Stop button lives) for the reader, leaving the mic recording with no visible control.
- PROOF: CONFIRMED (jsdom render probe `pdfrec.rprobe.test.jsx`, fake getUserMedia with 30 ms latency; double-tap → Stop → unmount):
```
PROBE stream#1 OPEN | rec(stream#1) start | stream#2 OPEN | rec(stream#2) start | button now:  Stop recording |
      rec(stream#2) stop | stream#2 track stopped | rec(stream#2) stop | stream#2 track stopped | --- unmounted ---
```
  (stream#1 is never stopped.) The 2026-07-08 fix (`unmountedRef`) addressed the transcription-after-unmount leak, not this.

### 7. [P2] PWA `autoUpdate` silently reloads an open tab after any deploy — an OCR'd / transcribed / loaded document (and a Speaking answer mid-recording) is lost without warning
- `src/components/PWAUpdateToast.jsx:19-25` + `vite.config.js:96,133-138`
```js
// "In autoUpdate mode a found update activates + reloads automatically."
setInterval(() => { registration.update().catch(() => {}) }, 60 * 60 * 1000)
…
registerType: 'autoUpdate', cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true,
```
- Scenario: a student has a scanned past paper OCR'd in the reader (minutes of on-device Tesseract/Whisper on a phone). The build loop ships a deploy; within the hour the interval finds it, the new SW activates and the page reloads. Reader state is component-only (`pdfData`/`pdfDoc` are `useState`, PDFReader.jsx:113-114; `addPdfRecent` keeps only metadata), so the document, reveals, selection and any in-flight OCR/ASR are gone; Speaking's transcript (`useState`, Speaking.jsx:51) likewise. No "update ready — reload when you're done" gate exists (the file says `needRefresh` never flips in this mode). Opening the app in a second tab triggers the same thing immediately (skipWaiting + clientsClaim).
- PROOF: TRACED from the repo's own configuration and comments (PWAUpdateToast.jsx:4-8 and :22-24 state the auto-reload; vite.config.js:135-137 likewise). I could not read `node_modules/vite-plugin-pwa` (sandbox denies node_modules reads), so the reload mechanics rest on those in-repo statements. Distinct from GOAL #12 (which is about users stuck on a STALE build — the opposite failure).

### 8. [P2] KNOWN-STILL-LIVE — `translatePage` cancel→re-translate race (2026-07-03 review, "fix DEFERRED")
- `src/pages/PDFReader.jsx:970-980` at HEAD: post-await tail still unconditionally does `setTranslating(null)` + `translateAbortRef.current = null`, so run #1's late resolve (translateBatch isn't signal-aware; retries/backoff aren't abortable, `translateDocument.js:164-176`) hides run #2's progress bar and nulls its abort ref (Cancel goes dead). Same shape also fires after a document swap if the learner taps Translate page on the new doc within that window. Still unfixed; the review's 1-line guard (`if (translateAbortRef.current !== ac) return`) still applies.
- PROOF: TRACED (code unchanged at HEAD vs the review's description).

## Checked (no reportable defect found, or below the evidence bar)
- **pdf.js** (`pdf.js`): load once/destroy on replace/clear; `extractPdfText` finally-destroy (07-08 fix holds); corrupt "Replace" keeps the old doc (P2-C7 holds); isEvalSupported:false.
- **PDFReader** doc swap: `resetGloss` epoch + index-state clears (07-07/07-08 fixes hold); sentence paths epoch-guarded; `fetchSentenceEnglish` can't strand `pending` (translateDocument never rejects).
- **OCR**: runImageOcr terminates prior worker; Cancel works through rasterise (P2-C9 holds); progress screen unmounts the file inputs so concurrent OCR/ASR runs can't be started from the UI; vision failure never blanks the free read. (All-empty Tesseract read shows the "blurry" note over a blank page — misleading copy, not reported.)
- **ASR**: size cap pre-decode + duration cap post-decode; failed vs silent split (07-08 fix holds); unmount-while-recording transcription leak fixed (`unmountedRef`). Main-thread Whisper = census A22 (not re-reported).
- **LayoutView**: render tasks cancellable; scroll/resize listeners removed; ResizeObserver disconnected; model load has a `cancelled` flag.
- **useSelectionMode / usePinchZoom / readerKeymap**: coordinate hit-test intact; no leaked global listeners. (Mouse released outside the reader leaves `startRef` set until the next pointerdown on a token — cosmetic, not reported.)
- **useFocusTrap**: Escape closes, Tab wraps, listener removed + focus restored on deactivate/unmount; PDFReader consent dialog wires it.
- **lazyWithRetry**: one-shot reload guarded by sessionStorage; clears flag on success; no-storage ⇒ no reload. (If `setItem` throws while `getItem` works it would reload-loop — only old Safari private mode; not reported.) Bare `React.lazy` sub-chunks (LayoutView, FullTranslationView, RoleplaySession, Writing panels, Dashboard widgets) aren't retry-wrapped — relevant only together with finding 7's cache cleanup; folded there, not separately reported.
- **SSE parser** (`readSSEStream`): cross-chunk line buffer + `TextDecoder({stream:true})` handle split lines and split multi-byte UTF-8 (pinned by `aiSSEStream.test.js`); only the error-frame gap (finding 4) is live.
- **speech.js**: `speak()` no-ops without TTS; `startKeywordSpotter` benign-error restart (FlashcardMode stops on `onError`; CikguBot's no-op `onError` can restart-loop during TTS on a hard error — bounded by TTS end, not reported); `speakWithBoundaries` cancel idempotent.
- **audioRecorder.js**: releases tracks on stop; `start()` leaks the stream if `new MediaRecorder` throws (browsers without MediaRecorder are gated by `hasAudioRecording`, so not reported).
- **Speaking** (beyond finding 1): flicker guard, error→type fallback, `finalizeAudio`, object-URL revoke on reset/unmount.
- **SpeakMode**: unmount stops recorder + revokes URL. Double-tap "Tap & Speak" isn't guarded (no `disabled`); racy recorder assignment possible but timing-dependent — not proven, not reported.
- **Roleplay / RoleplaySession**: empty/short AI reply falls back to the scripted turn; render-time `setTimeout(fireConfetti)` on the scorecard (Roleplay.jsx:368) re-fires on re-render — cosmetic, not reported.
- **CikguBot** (beyond 4/5): browsing-topic render path, dictation.
- **Writing.jsx**: page has no awaits (async lives in lazy panels outside scope); A14/GOAL #13 stale-grade already known.
- **Settings**: Restore = `isValidBackup` + confirm when cards exist; export revokes object URLs; key "Clear" is one-tap but re-pasteable; cache wipe regenerable. No unguarded irreversible data wipe found.
- **Import.jsx** (beyond 3): `extractPdfText` errors surface; word-by-word runs sequential un-cancellable lookups (slow on long text, not a correctness bug).
- Prior reviews cross-checked: 2026-06-12, 2026-07-03, 2026-08-01, 2026-08-02, 2026-08-06 census. Only finding 8 is a re-find.
