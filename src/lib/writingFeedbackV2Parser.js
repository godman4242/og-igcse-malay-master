// Strict validator for the writing-feedback-v2 action's JSON response. See
// docs/2026-05-26-adaptive-scaffolding-design.md §4.2-§4.4 for the contract.
//
// Why a hand-written validator and not Zod: this is a single function with a
// short, frozen schema; the span-coverage check is custom logic Zod can't
// express ergonomically; pulling in Zod just for this would cost ~12 KB
// gzipped in the writing chunk for no clarity win.
//
// Returns `{ ok: true, data }` on success or `{ ok: false, reason }` on
// rejection. Callers fall back to v1 on rejection.

const CATEGORIES = new Set([
  'imbuhan',
  'verb-form',
  'vocab-upgrade',
  'cohesion',
  'sophisticated-lexicon',
  'spelling',
  'register',
  'sentence-structure',
])

const SCAFFOLD_LEVELS = new Set(['heavy', 'medium', 'light'])

function rejectFrom(message) {
  return { ok: false, reason: message }
}

export function parseWritingFeedbackV2(raw, originalText) {
  let payload = raw
  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw)
    } catch {
      return rejectFrom('json parse error')
    }
  }

  if (!payload || typeof payload !== 'object') return rejectFrom('payload not an object')

  // Band: number in [1, 6]
  if (typeof payload.band !== 'number' || payload.band < 1 || payload.band > 6) {
    return rejectFrom('band must be a number in 1..6')
  }

  // Overall: non-empty string
  if (typeof payload.overall !== 'string' || payload.overall.trim().length === 0) {
    return rejectFrom('overall must be a non-empty string')
  }

  // Scaffold level applied
  if (!SCAFFOLD_LEVELS.has(payload.scaffoldLevelApplied)) {
    return rejectFrom('scaffoldLevelApplied must be heavy|medium|light')
  }

  // studentText
  const studentText = payload.studentText
  if (!studentText || typeof studentText !== 'object') return rejectFrom('studentText missing')
  if (!Array.isArray(studentText.spans)) return rejectFrom('studentText.spans must be an array')
  if (!Array.isArray(studentText.groups)) return rejectFrom('studentText.groups must be an array')

  // Group integrity
  const groupIds = new Set()
  for (const g of studentText.groups) {
    if (!g || typeof g !== 'object') return rejectFrom('group entry malformed')
    if (typeof g.id !== 'number') return rejectFrom('group.id must be a number')
    if (typeof g.label !== 'string' || g.label.length === 0) return rejectFrom('group.label must be a non-empty string')
    if (!CATEGORIES.has(g.category)) return rejectFrom(`group.category invalid: ${g.category}`)
    groupIds.add(g.id)
  }

  // Span integrity
  let recon = ''
  for (const s of studentText.spans) {
    if (!s || typeof s !== 'object') return rejectFrom('span entry malformed')
    if (typeof s.text !== 'string') return rejectFrom('span.text must be a string')
    if (s.category !== null && !CATEGORIES.has(s.category)) {
      return rejectFrom(`span.category invalid: ${s.category}`)
    }
    if (s.groupId !== null && !groupIds.has(s.groupId)) {
      return rejectFrom(`span.groupId is an orphan reference: ${s.groupId}`)
    }
    recon += s.text
  }

  // Span coverage invariant. The spec (§4.4) calls for byte-exact equality,
  // but real Claude responses normalise whitespace (NBSP → space, collapse
  // adjacent spaces, drop trailing newlines) in JSON string serialisation
  // even when the prompt forbids it. Strict equality rejected essentially
  // every real essay in pre-ship testing. We compare whitespace-normalised
  // forms instead: that's enough to detect content drift (dropped words,
  // edited punctuation, paraphrasing) without false-rejecting cosmetic
  // whitespace differences. The renderer paints span.text directly, so any
  // whitespace shift in spans is harmless visually.
  if (typeof originalText === 'string') {
    const normalise = (s) => s.replace(/\s+/g, ' ').trim()
    if (normalise(recon) !== normalise(originalText)) {
      return rejectFrom('span coverage does not match original text')
    }
  }

  // modelRewrite
  const modelRewrite = payload.modelRewrite
  if (!modelRewrite || typeof modelRewrite !== 'object') return rejectFrom('modelRewrite missing')
  if (!Array.isArray(modelRewrite.spans)) return rejectFrom('modelRewrite.spans must be an array')
  for (const s of modelRewrite.spans) {
    if (!s || typeof s !== 'object') return rejectFrom('modelRewrite span malformed')
    if (typeof s.text !== 'string') return rejectFrom('modelRewrite span.text must be a string')
    if (typeof s.isKey !== 'boolean') return rejectFrom('modelRewrite span.isKey must be a boolean')
  }

  // strengths
  if (!Array.isArray(payload.strengths)) return rejectFrom('strengths must be an array')
  for (const str of payload.strengths) {
    if (typeof str !== 'string') return rejectFrom('strengths must be strings')
  }

  // fixes
  if (!Array.isArray(payload.fixes)) return rejectFrom('fixes must be an array')
  for (const f of payload.fixes) {
    if (!f || typeof f !== 'object') return rejectFrom('fix entry malformed')
    if (f.groupId !== null && !groupIds.has(f.groupId)) {
      return rejectFrom(`fix.groupId is an orphan reference: ${f.groupId}`)
    }
    if (typeof f.issue !== 'string' || typeof f.fix !== 'string') {
      return rejectFrom('fix.issue and fix.fix must be strings')
    }
  }

  // nextStep is optional but if present must be a non-empty string
  if (payload.nextStep !== undefined && (typeof payload.nextStep !== 'string' || payload.nextStep.length === 0)) {
    return rejectFrom('nextStep must be a non-empty string when present')
  }

  return { ok: true, data: payload }
}
