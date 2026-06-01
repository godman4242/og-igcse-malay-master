# Speaking pillar — reliability fix + "best for students" direction

**Status:** robustness fix SHIPPED (commit `45828b5`, branch `feat/friction-polish`).
The bigger direction below is RESEARCH + RECOMMENDATION — needs Kheshav's call on
cost/provider before any build. (Per project rule: spec features that need product
input, don't solo-build them.)

---

## 1. What triggered this

Live report (2026-06-01): on the deployed Speaking page the mic "kept recording",
never said it had stopped, showed no Resume button, and "always thought I did not
say anything" — it never picked up the spoken words. (BYOK key itself tested fine.)

## 2. Root cause — how Web Speech actually fails

The browser `SpeechRecognition` API **streams audio to a backend service**
(Google's, in Chrome). That backend's Malay (`ms-MY`) coverage is patchy, and when
it can't transcribe it often returns **no results and no error** — recognition
keeps "running" but produces nothing.

The previously-shipped "Stopped listening" + Resume state only fired when the
`onend` auto-restart **threw** an exception. The silent-no-results failure never
throws, so `recording` stayed `true` forever and the student was stuck talking to a
wall. Sources: [MDN — Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API),
[AssemblyAI](https://www.assemblyai.com/blog/speech-recognition-javascript-web-speech-api).

Also relevant: ASR is unreliable for non-native speakers generally, and the
*learning value lives in the feedback*, not the transcription. Here the band + fixes
are computed from **text** — the audio path is just one way to get that text.
([Flowchase/arXiv](https://arxiv.org/pdf/2307.02051),
[NCBI review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12139008/))

## 3. What shipped now (robustness — `45828b5`)

All low-risk, presentational/logic only, no schema change:
1. **No-capture watchdog** — mic on but zero words after `NO_CAPTURE_SECS` (6s) →
   an honest "Not hearing you" state instead of a fake "Recording…".
2. **Honest, actionable errors** — new pure `describeSpeechError()` (TDD, +7 tests)
   maps `not-allowed` / `audio-capture` / `language-not-supported` / `network` /
   unknown to friendly copy; `no-speech`/`aborted` still ignored. `onerror` now
   stops + explains + opens the fallback instead of looping silently.
3. **Type-what-you-said fallback** — a textarea (auto-opens on no-capture/error,
   always reachable via a toggle) lets the student type their answer and STILL get
   the full band + fixes. The learning loop can no longer dead-end.

This makes Speaking *robust*. It does not yet make spoken-Malay feedback *great* —
that's §4.

## 4. The deeper question: is browser STT the right primary modality?

No — it's the cheapest, not the best. Four directions, with what the research says:

| Option | What it gives the student | Effort | Cost / dependency | Malay? |
|---|---|---|---|---|
| **A. Text-first + better coaching** | Make typing a *first-class* answer path (not just a fallback); richer AI coach on the text; keep browser STT as a bonus when it works. | Low | $0 (existing AI/BYOK) | ✅ full |
| **B. Audio capture + Whisper** | Reliable *transcription* of real speech (MediaRecorder → Whisper), then the same text grading. | Medium | OpenAI/Groq audio API (paid or BYOK-style) | ✅ Whisper supports Malay, mid-tier accuracy |
| **C. Azure Pronunciation Assessment** | TRUE phoneme-level pronunciation scoring (accuracy/fluency/completeness, per-word) — the PRD's original "real pronunciation feedback" dream. | High | Azure Speech key, server-side, new provider | ✅ **`ms-MY` is supported** |
| **D. Record + playback self-assessment** | Student hears themselves back, compares to the TTS model answer. No STT at all. Strong metacognition, works offline. | Low | $0 | ✅ (language-agnostic) |

Sources: [Whisper language list](https://github.com/openai/whisper),
[Azure pronunciation-assessment language support](https://github.com/MicrosoftDocs/azure-ai-docs/blob/main/articles/ai-services/speech-service/includes/language-support/pronunciation-assessment.md).

## 4a. Real-world test result (2026-06-01, Kheshav on prod)

Confirmed live after deploy:
- ✅ Type fallback works; ✅ AI grade (BYOK) works.
- ❌ **Spoken Malay still captures nothing** — the Chrome tab's record indicator
  **flickers on/off** = the recognition session ends instantly with no result and
  auto-restarts in a loop. The mic IS capturing (indicator lights), so this is the
  `ms-MY` backend returning nothing, NOT a hardware fault. Confirms the §2 root cause
  on a real device.
- ⚠️ **Heuristic ("static") grade felt inaccurate** — expected: it applies *speaking*
  pace metrics (words-per-second) that are meaningless for a typed answer, and it's a
  crude proxy generally.

**Implication:** for THIS user, real STT is effectively unavailable — which makes the
free **A+D** path (record/playback + typing-first) the clearly-right next build, and
adds two concrete sub-tasks below.

## 4b. A+D — refined scope (the free, now-justified build)

1. **Typing as a first-class choice**, not just a fallback: a "🎤 Speak / ⌨️ Type
   your answer" pick up front on PREP (plumbing already shipped).
2. **Record + playback** (D): capture audio via `MediaRecorder`, let the student
   replay themselves next to the model TTS. No transcription needed → works even
   though `ms-MY` STT doesn't. This is the real pronunciation-practice value for free.
3. **Typed-aware grading fix:** when the answer was typed (no real speech), drop the
   pace/words-per-second penalty from `heuristicGrade`, and **lead with the AI grade
   when a key is set** (auto-run it instead of hiding it behind a button). The
   heuristic becomes a fast preview, not the headline.
4. **Reduce the mic-flicker loop:** detect the rapid no-result end→restart cycle and
   surface the type option immediately (and stop the flickering restart) instead of
   looping for the full NO_CAPTURE_SECS. Cleaner + honest faster.

## 5. Recommendation

- **Now (cheap, high ROI):** ship **A + D**. Promote typing to a first-class
  "speak *or* write your answer" choice (the grading already supports it — we just
  shipped the plumbing), and add **record + playback** so students hear themselves
  next to the model TTS. Together these give a genuinely useful, robust speaking
  loop on $0, today, for both languages.
- **Strategic upgrade (the real dream):** **C — Azure Pronunciation Assessment for
  `ms-MY`.** It's the only option that delivers actual pronunciation feedback for
  Malay (the PRD's headline speaking promise). It costs money + a server-side key +
  a new provider integration, so it's a deliberate investment, not a quick win.
- **Middle option:** **B — Whisper** if you want reliable *transcription* of spoken
  Malay (so the existing text grader sees what was really said) without committing
  to full pronunciation scoring. Could ride a BYOK-style key like OpenRouter does.
- **Defer:** nothing else; C subsumes the ambitious cases.

## 5a. DECISION (2026-06-01, Kheshav)

**No budget, no monetization** for this site. That takes the paid options off the
table: **C (Azure ms-MY pronunciation) and B (Whisper) are OUT** unless a genuinely
free tier appears. **Chosen path = A + D ($0, bilingual).** Kheshav: *"if you feel
there is nothing more to be done or improved then we can go with your recommended
option"* + *"we may need more time to actually make it the best"* → build A+D
**properly, not rushed**, as its own focused piece. The robustness fix (§3) stands
on its own in the meantime. C/B stay documented here only as "if money/free-tier
ever changes."

## 6. ⬅️ Decisions for Kheshav (the fork) — RESOLVED, see §5a

1. **Build A + D next** (free, robust, bilingual) — yes / not yet?
2. **Invest in real pronunciation scoring?** If yes: **C (Azure, Malay phoneme-level,
   paid)** or **B (Whisper, reliable transcription, cheaper)** first? This drives
   whether we provision an Azure/OpenAI key and how billing works (your cost vs
   BYOK).
3. **BYOK vs owner-paid** for any paid speech provider — mirror the OpenRouter BYOK
   pattern (student's key, billed to them) or absorb it as owner?

## 7. Risk / scope guard
§3 is done and safe. §4–6 are **not** to be built without an explicit pick from §6 —
especially C/B, which touch billing and add a provider. Keep Speaking robust first.
