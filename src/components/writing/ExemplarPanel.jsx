import { useState } from 'react'
import { ChevronDown, ChevronUp, Award } from 'lucide-react'

// Annotated band-6 exemplar paragraph. Surfaces when the user has chosen
// a specific writing format so they can see what excellence looks like
// before they start drafting.
const ANNOTATION_COLOURS = {
  vocab:    { bg: 'rgba(179,136,255,0.18)', fg: 'var(--color-purple)', label: 'sophisticated word' },
  cohesion: { bg: 'rgba(0,200,255,0.18)',   fg: 'var(--color-cyan)',   label: 'cohesion / connector' },
  format:   { bg: 'rgba(0,230,118,0.18)',   fg: 'var(--color-green)',  label: 'format convention' },
  craft:    { bg: 'rgba(255,145,0,0.18)',   fg: 'var(--color-orange)', label: 'descriptive craft' },
}

function renderExemplar(text, annotations) {
  if (!annotations || annotations.length === 0) {
    return text.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line || ' '}</p>)
  }
  // Find the first occurrence of each annotation phrase, longest first so
  // longer matches win when phrases overlap.
  const sorted = [...annotations].sort((a, b) => b.phrase.length - a.phrase.length)
  const ranges = []
  for (const ann of sorted) {
    const idx = text.indexOf(ann.phrase)
    if (idx === -1) continue
    const overlap = ranges.some(r => !(idx + ann.phrase.length <= r.start || idx >= r.end))
    if (overlap) continue
    ranges.push({ start: idx, end: idx + ann.phrase.length, ann })
  }
  ranges.sort((a, b) => a.start - b.start)

  // Build segment list interleaving plain text and highlights.
  const segments = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start > cursor) segments.push({ type: 'text', value: text.slice(cursor, r.start) })
    segments.push({ type: 'mark', value: text.slice(r.start, r.end), category: r.ann.category })
    cursor = r.end
  }
  if (cursor < text.length) segments.push({ type: 'text', value: text.slice(cursor) })

  // Re-split each segment by newlines so paragraphs render correctly.
  const lines = [[]]
  for (const seg of segments) {
    const parts = seg.value.split('\n')
    parts.forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part.length) {
        lines[lines.length - 1].push(seg.type === 'mark' ? { type: 'mark', value: part, category: seg.category } : { type: 'text', value: part })
      }
    })
  }
  return lines.map((line, i) => (
    <p key={i} className="mb-2 last:mb-0">
      {line.length === 0 ? ' ' : line.map((seg, j) => {
        if (seg.type === 'mark') {
          const c = ANNOTATION_COLOURS[seg.category] || ANNOTATION_COLOURS.craft
          return (
            <span key={j} className="px-1 py-0.5 rounded" title={c.label}
              style={{ background: c.bg, color: c.fg, fontWeight: 600 }}>
              {seg.value}
            </span>
          )
        }
        return <span key={j}>{seg.value}</span>
      })}
    </p>
  ))
}

export default function ExemplarPanel({ exemplar }) {
  const [open, setOpen] = useState(false)
  if (!exemplar) return null
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Award size={14} style={{ color: 'var(--color-accent2)' }} />
          Band-6 exemplar
          <span className="text-[10px] font-normal" style={{ color: 'var(--color-dim)' }}>
            study before drafting
          </span>
        </span>
        {open ? <ChevronUp size={16} style={{ color: 'var(--color-dim)' }} />
              : <ChevronDown size={16} style={{ color: 'var(--color-dim)' }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>Opening</p>
            <div className="text-[13px] leading-relaxed p-3 rounded-xl"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
              {renderExemplar(exemplar.opening, exemplar.annotations)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-dim)' }}>Closing</p>
            <div className="text-[13px] leading-relaxed p-3 rounded-xl"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
              {renderExemplar(exemplar.closing, exemplar.annotations)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(ANNOTATION_COLOURS).map(([key, c]) => (
              <span key={key} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: c.bg, color: c.fg, fontWeight: 600 }}>
                {c.label}
              </span>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
            Highlighted phrases mark techniques that lift work into the top band — not for copying, but for
            noticing. Aim to use one or two equivalents in your own essay.
          </p>
        </div>
      )}
    </div>
  )
}
