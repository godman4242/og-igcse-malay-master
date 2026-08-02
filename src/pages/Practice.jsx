import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import Meta from '../components/Meta'
import { PRACTICE_GROUPS } from '../lib/practiceSurfaces'
import { trackEvent } from '../lib/telemetry'

// Practice hub — a scannable, grouped index of every learning surface, so
// nothing is buried behind a drawer. Tiles are launchers; a few carry a cheap,
// already-computed status cue. Design: docs/superpowers/specs/2026-05-31-practice-hub-design.md

const EMPTY = []

export default function Practice() {
  const navigate = useNavigate()

  // Cheap status cues. Store getters return fresh objects/values each call —
  // per CLAUDE.md, extract the ref then call in the component body (never in a
  // selector), and use a primitive/stable selector for the array.
  const getDueCount = useStore(s => s.getDueCount)
  const getExamReadiness = useStore(s => s.getExamReadiness)
  const mistakes = useStore(s => s.mistakes ?? EMPTY)
  const cards = useStore(s => s.cards ?? EMPTY)

  const dueCount = getDueCount()
  const mistakeCount = mistakes.filter(m => !m.reviewed).length
  const readiness = Math.round(getExamReadiness()?.smoothed ?? 0)
  const savedCount = cards.filter(c => c.t === 'Saved').length

  useEffect(() => {
    trackEvent('practice_hub_opened') // once per mount
  }, [])

  // Resolve a tile's optional status key → short visible text (or null = hide).
  const statusText = (key) => {
    if (key === 'due') return dueCount > 0 ? `${dueCount} due` : null
    if (key === 'mistakes') return mistakeCount > 0 ? `${mistakeCount} to fix` : null
    if (key === 'readiness') return readiness > 0 ? `${readiness}% ready` : null
    if (key === 'saved') return savedCount > 0 ? `${savedCount} saved` : null
    return null
  }

  const open = (path) => {
    trackEvent('practice_tile_clicked', { surface: path })
    navigate(path)
  }

  return (
    <div className="space-y-5">
      <Meta title="Practice — IGCSE Malay Master" description="Every learning surface in one place: speaking, writing, reading, listening, grammar, review and tools." />

      <div>
        {/* h2, not h1 — Layout renders the route's sr-only <h1> (the page name) on every route. */}
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Practice</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>
          Everything in one place — pick a skill to practise.
        </p>
      </div>

      {PRACTICE_GROUPS.map((group, gi) => (
        <section key={group.heading} aria-labelledby={`grp-${group.heading}`}
          // Full Page Guide (T11): anchor the first group so the ▶ tour can point
          // at the grouped-by-skill layout. Always present (groups are static).
          data-guide={gi === 0 ? 'practice-groups' : undefined}>
          <h2 id={`grp-${group.heading}`}
            className="text-[10px] font-bold uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-dim)' }}>
            {group.heading}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {group.items.map(item => {
              const Icon = item.icon
              const status = statusText(item.status)
              return (
                <button key={item.path} onClick={() => open(item.path)}
                  // Full Page Guide (T11): anchor the Study tile (launcher concept)
                  // and the Mistakes tile (live-cue concept). Both tiles always
                  // render; the cue BADGE is conditional but the button is not, so
                  // no guide arrow ever points at a missing node.
                  data-guide={item.path === '/study' ? 'practice-tile' : item.path === '/mistakes' ? 'practice-cue' : undefined}
                  aria-label={status ? `${item.label}, ${status}` : item.label}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all relative min-h-[88px] justify-center"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <Icon size={22} strokeWidth={1.75} aria-hidden={true} />
                  <span className="text-[11px] font-semibold text-center leading-tight">{item.label}</span>
                  {status && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                      {status}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
