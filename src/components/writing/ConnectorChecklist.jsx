import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Check, BookMarked } from 'lucide-react'
import { CONNECTOR_GROUPS_MS, detectConnectors } from '../../data/connectors'

// Writing scaffolding sidebar — live connective checklist for Malay
// karangan. Each penanda wacana lights up the moment the student types
// it (or any registered variant), giving a visible "cohesion budget"
// that mirrors what an examiner counts for band-5/6 work.
//
// UDL Principle 3 (Action & Expression): the panel itself is optional —
// students can collapse it once they've internalised the markers.
//
// Accessibility:
//   • Uses `var(--color-*)` tokens so the high-contrast overlay
//     (`.contrast-high`) reskins it without code changes.
//   • Inherits the Lexend dyslexic body font when `.font-dyslexic` is on.
//   • Hit areas ≥ 32px; group headers are full-width buttons.
export default function ConnectorChecklist({ text = '' }) {
  const [open, setOpen] = useState(true)
  const [collapsed, setCollapsed] = useState(() => new Set())

  const used = useMemo(() => detectConnectors(text), [text])

  const totalUsed = used.size
  const totalAvail = useMemo(
    () => CONNECTOR_GROUPS_MS.reduce((n, g) => n + g.items.length, 0),
    [],
  )

  const toggleGroup = (id) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {/* Header — overall coverage + collapse */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: 'transparent' }}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <BookMarked size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-sm font-bold">Penanda Wacana</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: totalUsed > 0 ? 'rgba(0,230,118,0.18)' : 'var(--color-surface)',
              color: totalUsed > 0 ? 'var(--color-green)' : 'var(--color-dim)',
            }}>
            {totalUsed}/{totalAvail} used
          </span>
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'var(--color-dim)' }} />
              : <ChevronDown size={16} style={{ color: 'var(--color-dim)' }} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[11px] px-1" style={{ color: 'var(--color-dim)' }}>
            Connectors light up as you use them. Aim for variety — at least one from each group.
          </p>

          {CONNECTOR_GROUPS_MS.map(group => {
            const usedInGroup = group.items.filter(it => used.has(it.id)).length
            const isCollapsed = collapsed.has(group.id)
            return (
              <div key={group.id} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                    <span className="text-xs font-semibold">{group.label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                      ({group.labelEn})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold"
                      style={{ color: usedInGroup > 0 ? group.color : 'var(--color-dim)' }}>
                      {usedInGroup}/{group.items.length}
                    </span>
                    {isCollapsed
                      ? <ChevronDown size={14} style={{ color: 'var(--color-dim)' }} />
                      : <ChevronUp size={14} style={{ color: 'var(--color-dim)' }} />}
                  </div>
                </button>

                {!isCollapsed && (
                  <ul className="px-3 pb-3 flex flex-wrap gap-1.5">
                    {group.items.map(item => {
                      const on = used.has(item.id)
                      return (
                        <li key={item.id}>
                          <span
                            title={item.en}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-colors"
                            style={{
                              background: on ? group.bg : 'transparent',
                              color: on ? group.color : 'var(--color-dim)',
                              border: '1px solid ' + (on ? group.color : 'var(--color-border)'),
                              textDecoration: on ? 'none' : 'none',
                              opacity: on ? 1 : 0.85,
                            }}
                          >
                            {on && <Check size={11} aria-hidden="true" />}
                            <span style={{ fontFamily: 'inherit' }}>{item.phrase}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
