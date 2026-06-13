# Record-and-compare across speaking surfaces (review feature #9) — DESIGN

**Status: specced 2026-06-13, build reserved for a WITH-KHESHAV session (Opus 4.8 /fast).**
Audio UX can't be verified headlessly — the session needs his ears on real ms-MY TTS + mic playback.

## What already EXISTS (grounded 2026-06-13 — don't rebuild)
- **`src/lib/audioRecorder.js`** — complete, unit-tested mime picking (`pickRecorderMimeType`),
  `hasAudioRecording()`, `createAudioRecorder()` (start → stop → playable Blob, releases mic).
- **`/speaking` page: record-and-compare is SHIPPED** (speaking-reliability spec §4b/D):
  capture runs in parallel with SpeechRecognition (best-effort, never blocks), results screen has
  play-yourself + "Play model" TTS + a bilingual compare hint (`Speaking.jsx:64-73,140-150,751-760`).
  Object-URL lifecycle handled (revoke on reset/unmount).

## The actual delta (what #9 still means)
| Surface | Today | Gap |
|---|---|---|
| `src/components/study/SpeakMode.jsx` (Study → Speak mode, word-level, 99 lines) | STT + `scorePronunciation` only | **No recording** — and STT for ms-MY is unreliable, so on many devices the score is noise while a replay would still teach |
| Roleplay speak path (`RoleplaySession`) | STT transcribe only | No recording of turns |
| `src/components/PronunciationDrill.jsx` | **ORPHAN — zero importers anywhere** | Dead code; duplicates SpeakMode's job |

## Decided forks (decide-and-flag; veto in-session)
1. **Scope v1 = SpeakMode only.** Word/example-level record-and-compare in the Study speak mode,
   reusing the EXACT Speaking-page pattern (parallel best-effort capture; replay button + model TTS
   button side by side after the attempt). Roleplay turns = v2 (multi-turn audio lifecycle is a
   bigger surface; veto: include if v1 lands fast in-session).
2. **Delete `PronunciationDrill.jsx`** (orphan, grep-zero importers). Veto: revive instead of
   SpeakMode — rejected because SpeakMode is the mounted, session-integrated surface.
3. **Never persist audio.** Object URLs only, revoked on advance/unmount (privacy + storage;
   matches Speaking). Veto: keep last-N recordings — needs a product call on storage/privacy.
4. **Compare UX = two adjacent buttons** ("Hear yourself" / "Hear model") + the existing bilingual
   compare hint — no waveform visualisation in v1 (cost/benefit; veto: add later).

## Open calls that NEED Kheshav in the room (why this isn't an autobuild)
- Does the replay actually sound usable on HIS devices (phone + laptop) with real mics?
- Is word-level compare useful, or does it need the card's example sentence (`card.ex`) spoken
  instead? (Pedagogy: sentence prosody vs word phonemes — his call after hearing both.)
- Button placement/size in SpeakMode's small layout (44px rule, one-clear-next-action).

## Test plan
- Pure: none new needed (`pickRecorderMimeType` already covered). If a helper emerges
  (e.g. object-URL lifecycle hook), red-proof it.
- Component behaviour rides on build/lint + the proven Speaking pattern (repo norm).
- **Eyeball harness in-session:** Kheshav records, replays, compares on 2 devices, dark+light.
- e2e: mic can't be granted headlessly — assert graceful degradation only
  (`hasAudioRecording()` false → no record UI, mode still works).

## Done criteria
SpeakMode records in parallel, replay + model buttons appear after an attempt, nothing persists,
mic-denied path identical to today, PronunciationDrill deleted (grep-zero re-proof), gate green,
RESUME_HERE updated, Kheshav signs off the audio quality live.
