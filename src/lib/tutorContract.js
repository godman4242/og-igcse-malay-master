// Pure tutor-output post-processor (Layer B). No DOM, no network, `now` injected.
// Wraps ONLY the AI-generated Cikgu branches; expert-tier is exempt.
export const CTRL_DELIM = '⟦CTRL⟧'

export function parseTutorControl(rawText) {
  const text = typeof rawText === 'string' ? rawText : ''
  const i = text.lastIndexOf(CTRL_DELIM)
  if (i === -1) return { text: text.trim(), control: null }
  let control = null
  try { control = JSON.parse(text.slice(i + CTRL_DELIM.length).trim()) } catch { control = null }
  return { text: text.slice(0, i).trim(), control }
}
