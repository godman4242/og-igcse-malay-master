import { memo } from 'react'
import { TrendingUp } from 'lucide-react'

// Hand-rolled SVG sparkline — three series (writing band, speaking band,
// daily reviews) over 30 days. Bands share a 1-6 axis; reviews are
// re-scaled into the same chart space so the eye can spot correlation.
// memo-wrapped because prop is the rolling array which is itself memo'd
// from the same inputs upstream — re-renders only when activity changes.
const ProgressSparkline = memo(function ProgressSparkline({ rolling }) {
  const W = 320, H = 96, padX = 8, padY = 8
  const innerW = W - padX * 2, innerH = H - padY * 2
  const n = rolling.length
  const xAt = (i) => padX + (innerW * (n === 1 ? 0.5 : i / (n - 1)))
  // Bands plotted on a 1..6 scale.
  const yBand = (b) => b == null ? null : padY + innerH * (1 - (Math.max(1, Math.min(6, b)) - 1) / 5)
  const maxReviews = Math.max(1, ...rolling.map(d => d.reviews || 0))
  const yReview = (r) => padY + innerH * (1 - r / maxReviews)

  const buildPath = (series, accessor) => {
    let d = ''
    let started = false
    series.forEach((row, i) => {
      const v = accessor(row)
      if (v == null) return
      const x = xAt(i)
      d += (started ? 'L' : 'M') + x.toFixed(1) + ',' + v.toFixed(1) + ' '
      started = true
    })
    return d.trim()
  }
  const wPath = buildPath(rolling, r => yBand(r.writingBand))
  const sPath = buildPath(rolling, r => yBand(r.speakingBand))
  const rPath = buildPath(rolling, r => r.reviews ? yReview(r.reviews) : null)

  const lastRow = [...rolling].reverse().find(r => r.writingBand != null || r.speakingBand != null) || rolling[rolling.length - 1]

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <TrendingUp size={14} style={{ color: 'var(--color-cyan)' }} /> Last 30 days
        </h3>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-dim)' }}>
          <Legend dot="var(--color-blue)" label="Writing" />
          <Legend dot="var(--color-accent2)" label="Speaking" />
          <Legend dot="var(--color-orange)" label="Reviews" />
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="30-day progress sparkline">
        {/* Reference lines at band 4 and band 6 */}
        {[4, 6].map(b => (
          <line key={b} x1={padX} x2={W - padX} y1={yBand(b)} y2={yBand(b)}
            stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />
        ))}
        {rPath && <path d={rPath} fill="none" stroke="var(--color-orange)" strokeWidth="1.5" strokeOpacity="0.55" />}
        {wPath && <path d={wPath} fill="none" stroke="var(--color-blue)" strokeWidth="1.8" />}
        {sPath && <path d={sPath} fill="none" stroke="var(--color-accent2)" strokeWidth="1.8" />}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: 'var(--color-dim)' }}>
        <span>{rolling[0]?.day?.slice(5)}</span>
        <span>
          {lastRow?.writingBand != null ? `W ${(Math.round(lastRow.writingBand * 10) / 10)}` : ''}
          {lastRow?.writingBand != null && lastRow?.speakingBand != null ? ' · ' : ''}
          {lastRow?.speakingBand != null ? `S ${(Math.round(lastRow.speakingBand * 10) / 10)}` : ''}
        </span>
        <span>{rolling[rolling.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  )
})

function Legend({ dot, label }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  )
}

export default ProgressSparkline
