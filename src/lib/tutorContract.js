// Pure tutor-output post-processor (Layer B). No DOM, no network, `now` injected.
// Wraps ONLY the AI-generated Cikgu branches; expert-tier is exempt.
export const CTRL_DELIM = '⟦CTRL⟧'

export const WORD_BUDGET = { explain: 220, retrieval: 60 }

export function parseTutorControl(rawText) {
  const text = typeof rawText === 'string' ? rawText : ''
  const i = text.lastIndexOf(CTRL_DELIM)
  if (i === -1) return { text: text.trim(), control: null }
  let control = null
  try { control = JSON.parse(text.slice(i + CTRL_DELIM.length).trim()) } catch { control = null }
  return { text: text.slice(0, i).trim(), control }
}

export function enforceLength(text, { mode = 'explain' } = {}) {
  const s = typeof text === 'string' ? text : ''
  const budget = WORD_BUDGET[mode] ?? WORD_BUDGET.explain
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length <= budget) return { text: s, truncated: false }
  const capped = words.slice(0, budget).join(' ')
  const lastStop = Math.max(capped.lastIndexOf('. '), capped.lastIndexOf('! '), capped.lastIndexOf('? '))
  const out = lastStop > capped.length * 0.4 ? capped.slice(0, lastStop + 1) : capped + '…'
  return { text: out, truncated: true }
}

export function hasNextAction(text) {
  const t = (text || '').trim()
  if (!t) return false
  const lastLine = t.split('\n').filter(Boolean).pop() || ''
  return /\?\s*$/.test(t) || /^(→\s|next\b|seterusnya\b|cuba\b|try\b)/i.test(lastLine)
}

const LEAK_PATTERNS = [
  /jawapan(nya)?\s+(ialah|adalah)/i,
  /the\s+answer\s+is/i,
  /correct\s+answer\s*[:—-]/i,
  /^✓/m,
]
export function detectAnswerLeak(text, { mode = 'explain', attempted = false } = {}) {
  if (mode !== 'retrieval' || attempted) return false
  return LEAK_PATTERNS.some((re) => re.test(text || ''))
}
