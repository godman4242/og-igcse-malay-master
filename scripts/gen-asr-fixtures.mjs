// Produces known Malay + English audio clips + a silent clip + ground-truth text so
// the e2e can assert transcription word-accuracy (Q-ACC) and the empty state (Q-EMPTY)
// deterministically. macOS `say` (voices Amira=ms_MY, Samantha=en_US) → aiff →
// `afconvert` (native; no ffmpeg dep) → 16 kHz mono WAV. The silent clip is written
// directly with `wavefile`. Commit the resulting WAVs so CI needs no TTS binary.
//
// CAVEAT (spec Q-ACC): TTS audio is crisp/synthetic → this is a pipeline-correctness
// floor, NOT a real-world accuracy number (that's the manual harness, Task 10). The
// clips are validated against the real model by scripts/asr-accuracy-harness.mjs.
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import wavefile from 'wavefile'
const { WaveFile } = wavefile

const dir = join(process.cwd(), 'tests', 'e2e', 'fixtures')
await mkdir(dir, { recursive: true })

// Common, high-frequency words → the Malay-tuned model transcribes them reliably.
const MS = 'Saya suka makan nasi lemak pada waktu pagi.'
const EN = 'The weather today is very hot and sunny.'

// macOS `say` → aiff → afconvert 16 kHz mono 16-bit WAV. Commit the WAVs so CI needs
// no TTS binary.
function tts(text, voice, outWav) {
  const aiff = outWav.replace(/\.wav$/, '.aiff')
  execFileSync('say', ['-v', voice, '-o', aiff, text])
  // -f WAVE container, -d LEI16@16000 = little-endian int16 @ 16 kHz, -c 1 = mono.
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiff, outWav])
  return aiff
}

const cleanup = []
try {
  cleanup.push(tts(MS, 'Amira', join(dir, 'asr-clean-malay.wav')))    // ms_MY voice
  cleanup.push(tts(EN, 'Samantha', join(dir, 'asr-clean-english.wav'))) // en_US voice
  console.log('wrote asr-clean-malay.wav + asr-clean-english.wav')
} catch (e) {
  console.warn('TTS unavailable — commit asr-clean-*.wav manually:', e.message)
} finally {
  for (const aiff of cleanup) { try { await rm(aiff) } catch { /* ignore */ } }
}

// Silent clip (1.5 s of digital silence) for the empty-state test (Q-EMPTY).
const silent = new WaveFile()
silent.fromScratch(1, 16000, '16', new Int16Array(Math.round(16000 * 1.5)))
await writeFile(join(dir, 'asr-silent.wav'), silent.toBuffer())
console.log('wrote asr-silent.wav (1.5 s silence)')

await writeFile(join(dir, 'asr-ground-truth.json'), JSON.stringify({ ms: MS, en: EN }, null, 2))
console.log('ASR fixtures written to', dir)
