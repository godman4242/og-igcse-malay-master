// Pure helper: turn a logged mistake record into a drill prompt.
//
// Mistakes do NOT all have a crisp answer. We split by DATA SHAPE (gated by
// category), not category alone — verified against the real addMistake call
// sites (2026-06-05). The discriminated return is the whole point: a
// "What's the fix?" prompt with nothing to reveal is the failure mode this
// prevents.
//
//   { kind: 'answer',  question, answer, yourError }   — recall → reveal
//   { kind: 'reflect', surface, note, practiseTarget } — coaching, no answer
//   null                                               — nothing to drill; skip
//
// Reflective categories are advisory tips (Speaking/Roleplay) with no correct
// answer. Answerable categories DOWNGRADE to reflect when they lack an answer
// (e.g. Roleplay logs imbuhan/tense as surface + note only), and to null when
// there is no content at all.

const REFLECT_CATEGORIES = new Set(['fluency', 'cohesion', 'register', 'pronunciation'])

const clean = (v) => (typeof v === 'string' ? v.trim() : '')

// type → where the learner should go to practise the reflective point.
function practiseTargetForType(type) {
  if (type === 'speaking') return '/speaking'
  if (type === 'roleplay') return '/roleplay'
  return '/study'
}

function reflectPrompt(m, surface, note) {
  // A reflect card needs *something* to reflect on.
  if (!surface && !note) return null
  return { kind: 'reflect', surface, note, practiseTarget: practiseTargetForType(m.type) }
}

export function buildDrillPrompt(mistake) {
  if (!mistake || typeof mistake !== 'object') return null

  const m = mistake
  const surface = clean(m.surface)
  const note = clean(m.note)
  const word = clean(m.word)
  const answer = clean(m.correct) || clean(m.correction)
  const yourError = clean(m.given) || word

  // Reflective tip categories never have an answer to reveal.
  if (REFLECT_CATEGORIES.has(m.category)) {
    return reflectPrompt(m, surface, note)
  }

  // Answerable categories need an actual answer; without one, downgrade.
  if (!answer) {
    return reflectPrompt(m, surface, note)
  }

  const question = m.category === 'vocab' && word
    ? `What does "${word}" mean?`
    : (surface || word)

  // No question text to anchor the recall → fall back to reflection.
  if (!question) {
    return reflectPrompt(m, surface, note)
  }

  return { kind: 'answer', question, answer, yourError }
}
