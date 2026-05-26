// Per-turn examiner feedback chips. Reuses the writing palette so the visual
// vocabulary stays consistent across surfaces (spec §6.3). MS roleplay looks
// missed words up in the static dictionary for English glosses; EN roleplay
// has no dictionary file and falls back to the AI's note only.

import { memo, useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import DICTIONARY from '../data/dictionary'

const HEAVY_CAP = 2 // spec §6.3 — missed items collapse beyond this on heavy

function lookupGloss(word) {
  if (!word) return null
  const key = word.toLowerCase().trim()
  return DICTIONARY[key] || null
}

function UsedChip({ label }) {
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1"
      style={{
        color: 'var(--color-annot-green)',
        background: 'transparent',
        border: '1px solid var(--color-annot-green)',
      }}
    >
      <CheckCircle2 size={10} /> {label}
    </span>
  )
}

function MissedChip({ label, gloss, note }) {
  const tip = gloss || note
  return (
    <span
      tabIndex={tip ? 0 : -1}
      title={tip || undefined}
      aria-label={tip ? `${label}: ${tip}` : label}
      className="text-[11px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1"
      style={{
        color: 'var(--color-annot-orange)',
        background: 'transparent',
        border: '1px solid var(--color-annot-orange)',
      }}
    >
      <AlertCircle size={10} /> {label}
    </span>
  )
}

function RoleplayTurnFeedback({ feedback, lang = 'ms', scaffoldLevel = 'medium' }) {
  const [showAllMissed, setShowAllMissed] = useState(false)

  // Hooks first — never gate them on `feedback` so React's hook order stays
  // stable across renders. The bail-out after computation is cheap.
  const { usedItems, missedItems } = useMemo(() => {
    const f = feedback || {}
    const used = [
      ...(f.vocabUsed || []).map(w => ({ label: w, kind: 'vocab' })),
      ...(f.imbuhanUsed || []).map(w => ({ label: w, kind: 'imbuhan' })),
    ]
    const missedRaw = [
      ...(f.vocabMissed || []).map(w => ({ label: w, kind: 'vocab' })),
      ...(f.imbuhanMissed || []).map(w => ({ label: w, kind: 'imbuhan' })),
    ]
    const missed = missedRaw.map(item => ({
      ...item,
      gloss: lang === 'ms' && item.kind === 'vocab' ? lookupGloss(item.label) : null,
    }))
    return { usedItems: used, missedItems: missed }
  }, [feedback, lang])

  if (!feedback) return null

  const cap = scaffoldLevel === 'heavy' && !showAllMissed ? HEAVY_CAP : missedItems.length
  const visibleMissed = missedItems.slice(0, cap)
  const hiddenCount = missedItems.length - cap

  const hasAnyContent =
    usedItems.length > 0
    || missedItems.length > 0
    || feedback.grammarNote
    || feedback.suggestion
    || feedback.missingPhrase

  if (!hasAnyContent) return null

  return (
    <div
      className="mt-1 px-3 py-2 rounded-lg text-xs space-y-2"
      style={{
        background: 'var(--color-card2)',
        border: '1px solid var(--color-border)',
      }}
    >
      {usedItems.length > 0 && (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--color-dim)' }}>
            You used:
          </span>
          {usedItems.map((u, i) => (
            <UsedChip key={`u-${i}`} label={u.label} />
          ))}
        </div>
      )}

      {missedItems.length > 0 && (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--color-dim)' }}>
            You missed:
          </span>
          {visibleMissed.map((m, i) => (
            <MissedChip
              key={`m-${i}`}
              label={m.label}
              gloss={m.gloss}
              note={feedback.suggestion}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAllMissed(true)}
              className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
              style={{
                color: 'var(--color-dim)',
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
              }}
            >
              Show {hiddenCount} more
            </button>
          )}
        </div>
      )}

      {feedback.grammarNote && (
        <div
          className="rounded-md px-2 py-1.5 text-[11px] leading-relaxed"
          style={{
            background: 'var(--color-annot-yellow)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span className="font-semibold">Tip · </span>
          {feedback.grammarNote}
        </div>
      )}

      {feedback.missingPhrase && (
        <p className="text-[11px]" style={{ color: 'var(--color-annot-orange)' }}>
          Try using: <strong>{feedback.missingPhrase}</strong>
        </p>
      )}
    </div>
  )
}

export default memo(RoleplayTurnFeedback)
