// Record + playback (Speaking pillar, option D from the speaking-reliability
// spec §4b). Captures the student's spoken answer with MediaRecorder so they
// can replay themselves next to the model TTS — pure metacognition, needs NO
// speech recognition, so it works even where ms-MY STT transcribes nothing.
//
// The pure mime-type picker is unit-tested; createAudioRecorder is a thin
// browser wrapper (like speak()/startKeywordSpotter() in speech.js) and is
// exercised by the Playwright eyeball harness, not vitest.

// Preference order: Opus-in-WebM is the broadest, smallest, best-quality combo
// in Chromium; the rest are fallbacks for Safari/Firefox. '' lets the browser
// pick its own default as a last resort.
export const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

// Pure: return the first candidate the browser reports as recordable, or ''
// (browser default) when nothing matches / no detector exists / it throws.
// `isTypeSupported` is injected for testability (defaults to the global).
export function pickRecorderMimeType(
  isTypeSupported = (typeof MediaRecorder !== 'undefined' ? MediaRecorder.isTypeSupported : null),
) {
  if (typeof isTypeSupported !== 'function') return ''
  try {
    for (const type of RECORDER_MIME_CANDIDATES) {
      if (isTypeSupported(type)) return type
    }
  } catch {
    return ''
  }
  return ''
}

// True when this browser can capture mic audio for record+playback.
export function hasAudioRecording() {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

// Factory: start() opens the mic and begins recording; stop() resolves with a
// playable Blob (or null if nothing was captured) and releases the mic track.
// Errors from getUserMedia (denied/absent mic) reject start() so the caller can
// fall back gracefully — record+playback is always optional, never load-bearing.
export function createAudioRecorder() {
  let recorder = null
  let stream = null
  let chunks = []

  async function start() {
    if (!hasAudioRecording()) throw new Error('Audio recording not supported')
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickRecorderMimeType()
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    chunks = []
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }
    recorder.start()
  }

  function stop() {
    return new Promise((resolve) => {
      const release = () => {
        stream?.getTracks().forEach(t => t.stop())
        stream = null
      }
      if (!recorder || recorder.state === 'inactive') {
        release()
        resolve(chunks.length ? new Blob(chunks, { type: chunks[0].type }) : null)
        return
      }
      recorder.onstop = () => {
        release()
        resolve(chunks.length ? new Blob(chunks, { type: chunks[0].type }) : null)
      }
      try { recorder.stop() } catch { release(); resolve(null) }
    })
  }

  return { start, stop }
}
