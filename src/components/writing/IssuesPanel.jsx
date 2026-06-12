import { useState, useMemo } from 'react'

const SEVERITY_COLOR = {
  high:   { bg: 'rgba(255,82,82,0.12)',   fg: 'var(--color-red)',    underline: 'var(--color-red)' },
  medium: { bg: 'rgba(255,145,0,0.12)',   fg: 'var(--color-orange)', underline: 'var(--color-orange)' },
  low:    { bg: 'rgba(0,229,255,0.10)',   fg: 'var(--color-cyan)',   underline: 'var(--color-cyan)' },
}

const TYPE_LABEL = {
  spelling:    'Spelling',
  grammar:     'Grammar',
  confusable:  'Confused word',
  punctuation: 'Punctuation',
  style:       'Style',
}

function renderHighlighted(text, findings, activeIdx) {
  if (!findings || findings.length === 0) return text
  // Build non-overlapping segments. If two findings overlap, prefer the higher severity.
  const sevRank = { high: 3, medium: 2, low: 1 }
  const sorted = [...findings].sort((a, b) => a.start - b.start || (sevRank[b.severity] - sevRank[a.severity]))
  const segments = []
  let cursor = 0
  for (const f of sorted) {
    if (f.start < cursor) continue   // skip overlap
    if (f.start > cursor) segments.push({ text: text.slice(cursor, f.start), finding: null })
    segments.push({ text: text.slice(f.start, f.end), finding: f })
    cursor = f.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), finding: null })

  return segments.map((seg, i) => {
    if (!seg.finding) return <span key={i}>{seg.text}</span>
    const sc = SEVERITY_COLOR[seg.finding.severity] || SEVERITY_COLOR.low
    const isActive = activeIdx !== null && findings[activeIdx] === seg.finding
    return (
      <span key={i} title={seg.finding.message}
        style={{
          background: isActive ? sc.bg : 'transparent',
          textDecoration: 'underline',
          textDecorationStyle: 'wavy',
          textDecorationColor: sc.underline,
          textDecorationThickness: '2px',
          textUnderlineOffset: '3px',
          borderRadius: '2px',
          padding: '0 1px',
        }}>
        {seg.text}
      </span>
    )
  })
}

export default function IssuesPanel({ text, findings, summary, band = 6 }) {
  const [active, setActive] = useState(null) // index of selected finding
  const [filter, setFilter] = useState('all') // 'all' | 'high' | 'medium' | 'low'
  // Parent keys this component on `${band}-${findings.length}` so the useState
  // initialiser re-evaluates fresh on each new analysis without an effect-driven setState.
  const [isFocusMode, setIsFocusMode] = useState(band <= 4 || findings.length > 8)

  const visible = useMemo(() => {
    let list = findings
    if (filter !== 'all') {
      list = findings.filter(f => f.severity === filter)
    }
    
    // Scaffolding: In focus mode, we only show the top 5 high/medium issues.
    if (isFocusMode && filter === 'all') {
      return [...list]
        .sort((a, b) => {
          const rank = { high: 3, medium: 2, low: 1 }
          return rank[b.severity] - rank[a.severity]
        })
        .slice(0, 5)
    }
    
    return list
  }, [findings, filter, isFocusMode])

  const highlighted = useMemo(() => renderHighlighted(text, visible, active), [text, visible, active])

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold">Issues found ({summary?.counts?.total ?? findings.length})</h3>
        <div className="flex gap-1 text-[10px]">
          {[
            { id: 'all',    label: `All (${summary?.counts?.total ?? findings.length})`, color: 'var(--color-text)' },
            { id: 'high',   label: `High (${summary?.counts?.high ?? 0})`,    color: 'var(--color-red)' },
            { id: 'medium', label: `Med (${summary?.counts?.medium ?? 0})`,   color: 'var(--color-orange)' },
            { id: 'low',    label: `Low (${summary?.counts?.low ?? 0})`,      color: 'var(--color-cyan)' },
          ].map(b => (
            <button key={b.id} onClick={() => { setFilter(b.id); setActive(null) }}
              className="px-2 py-0.5 rounded-full font-bold uppercase"
              style={{
                background: filter === b.id ? b.color : 'transparent',
                color: filter === b.id ? 'var(--color-on-bright)' : b.color,
                border: '1px solid ' + b.color,
              }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Highlighted essay */}
      <div className="rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: 280, overflowY: 'auto' }}>
        {highlighted}
      </div>

      {/* Focus Mode Banner */}
      {isFocusMode && filter === 'all' && findings.length > visible.length && (
        <div className="rounded-xl p-3 flex items-center justify-between gap-3"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <div className="text-[10px] leading-tight" style={{ color: 'var(--color-dim)' }}>
            <span className="font-bold text-[var(--color-purple)] block mb-0.5">Focus Mode Active</span>
            We've highlighted the top {visible.length} issues to keep your revision focused.
          </div>
          <button onClick={() => setIsFocusMode(false)}
            className="px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
            style={{ background: 'var(--color-purple)', color: '#fff' }}>
            Show all {findings.length}
          </button>
        </div>
      )}

      {/* List of issues */}
      {visible.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>No issues at this severity.</p>
      ) : (
        <div className="space-y-1.5">
          {visible.map((f) => {
            const orig = findings.indexOf(f)
            const sel = active === orig
            const sc = SEVERITY_COLOR[f.severity] || SEVERITY_COLOR.low
            return (
              <button key={orig} onClick={() => setActive(sel ? null : orig)}
                className="w-full text-left rounded-lg px-2.5 py-2 transition-all"
                style={{
                  background: sel ? sc.bg : 'transparent',
                  border: '1px solid ' + (sel ? sc.fg : 'var(--color-border)'),
                }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                    style={{ background: sc.bg, color: sc.fg }}>
                    {TYPE_LABEL[f.type] || f.type}
                  </span>
                  <span className="text-xs italic" style={{ color: 'var(--color-text)' }}>
                    “{f.excerpt.length > 50 ? f.excerpt.slice(0, 50) + '…' : f.excerpt}”
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>
                  {f.message}
                </p>
                {f.suggestion && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-green)' }}>
                    Suggested: <span className="font-mono">{f.suggestion}</span>
                  </p>
                )}
              </button>
            )
          })}
          
          {!isFocusMode && filter === 'all' && findings.length > 5 && (
            <button onClick={() => setIsFocusMode(true)}
              className="w-full py-2 text-[10px] font-bold opacity-60 hover:opacity-100"
              style={{ color: 'var(--color-purple)' }}>
              ↑ Switch back to Focus Mode
            </button>
          )}
        </div>
      )}
    </div>
  )
}
