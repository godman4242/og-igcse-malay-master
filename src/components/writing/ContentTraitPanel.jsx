// ContentTraitPanel — the task-aware "Did you answer the task?" Content axis.
//
// PURE & STORE-FREE: props only, no `useStore`. The Writing page owns the AI
// grade + the selected task and hands the relevant fields down here.
//
// It renders ONLY when the AI returned task-aware Content (i.e. a numeric
// `content_band`). With no task, AI unavailable, or a parse fail, `content_band`
// is absent and this returns `null` — the page then never fabricates a Content
// number (honest degrade; the existing AddKeyNudge covers the AI-down case).
//
// Why a SEPARATE axis from the "Band N/6" the page already shows: that band is
// LANGUAGE quality (fluency/accuracy). Content/task-fulfilment is a different
// IGCSE trait — a fluent essay that ignores the task must still score low here.
// We label it "Did you answer the task?" so the two never read as the same mark.
// Deliberately NO summed "/N" total — the band + a scannable ✓/✗ per requirement
// is the whole point (ADD-first: see what's met vs missed at a glance).

// Band → colour, mirroring Writing.jsx BAND_COLORS so the two band rings match.
const BAND_COLORS = {
  1: 'var(--color-red)',
  2: 'var(--color-red)',
  3: 'var(--color-orange)',
  4: 'var(--color-orange)',
  5: '#69f0ae',
  6: 'var(--color-green)',
}

export default function ContentTraitPanel({ aiGrade, requirements = [] }) {
  const band = aiGrade?.content_band
  // Honest degrade: only render when the AI actually produced a Content band.
  if (typeof band !== 'number') return null

  const coverage = aiGrade.task_coverage || {}
  const ringColor = BAND_COLORS[band] || 'var(--color-dim)'

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
          style={{ border: '4px solid ' + ringColor, color: ringColor }}>
          {band}
        </div>
        <div>
          <h3 className="text-sm font-bold">Did you answer the task?</h3>
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
            Content / task-fulfilment · Band {band}/6
          </p>
        </div>
      </div>

      {aiGrade.content_justification && (
        <p className="text-xs italic" style={{ color: 'var(--color-dim)' }}>
          "{aiGrade.content_justification}"
        </p>
      )}

      {requirements.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
            Requirement coverage
          </span>
          {requirements.map((req, i) => {
            const met = coverage[`req_${i}`] === true
            const fill = met ? 'var(--color-green)' : 'var(--color-orange)'
            return (
              <div key={i} data-coverage-row={i} className="flex items-start gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="flex items-center justify-center w-4 h-4 rounded-full font-bold flex-shrink-0 mt-0.5"
                  style={{ background: fill, color: 'var(--color-on-bright)', fontSize: '10px' }}>
                  {met ? '✓' : '✗'}
                </span>
                <span style={{ color: met ? 'var(--color-text)' : 'var(--color-dim)' }}>
                  {req}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
