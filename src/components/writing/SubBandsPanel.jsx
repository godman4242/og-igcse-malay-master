function bandColor(b) {
  if (b >= 6) return 'var(--color-green)'
  if (b >= 5) return '#69f0ae'
  if (b >= 4) return 'var(--color-orange)'
  return 'var(--color-red)'
}

const SUB_BAND_LABELS = {
  content:  { label: 'Content',  hint: 'Length, paragraphs, idea development' },
  accuracy: { label: 'Accuracy', hint: 'Grammar + spelling error density' },
  vocab:    { label: 'Vocabulary', hint: 'Range (TTR), formal/sophisticated words' },
  variety:  { label: 'Sentence Variety', hint: 'Length variance + complex structures' },
  cohesion: { label: 'Cohesion', hint: 'Unique discourse markers used' },
  format:   { label: 'Format', hint: 'Required conventions of the chosen format' },
}

function MetricLine({ label, value }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--color-dim)' }}>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

export default function SubBandsPanel({ sub, metrics }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-3">Band Breakdown</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(sub).map(([k, v]) => {
          const meta = SUB_BAND_LABELS[k] || { label: k, hint: '' }
          return (
            <div key={k} className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ border: '2px solid ' + bandColor(v), color: bandColor(v) }}>
                {v}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{meta.label}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--color-dim)' }}>{meta.hint}</p>
              </div>
            </div>
          )
        })}
      </div>
      {metrics && (
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <MetricLine label="Errors / 100w (high)" value={metrics.errorsPer100} />
          <MetricLine label="Errors / 100w (all)" value={metrics.allErrorsPer100} />
          <MetricLine label="Lexical diversity (TTR)" value={metrics.ttr} />
          <MetricLine label="Sentence-length σ" value={metrics.sentLenStd} />
          <MetricLine label="Complex / total sentences" value={metrics.complexRatio} />
          <MetricLine label="Opener variety" value={metrics.openerVariety} />
          <MetricLine label="Avg syllables / word" value={metrics.avgSyll} />
          <MetricLine label="Long-word ratio" value={metrics.longWordRatio} />
          <MetricLine label="Unique discourse markers" value={metrics.uniqueDiscourse} />
          <MetricLine label="Formal vocabulary hits" value={metrics.formalCount} />
        </div>
      )}
    </div>
  )
}
