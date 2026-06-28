// ReattemptPanel — the act-on-feedback "Improve your answer" surface.
// PURE & STORE-FREE: props only. Renders the specific missed requirements + their
// how-to-fix hints (focused, where-to-next — NO praise in the revise phase), and,
// after a resubmit, an HONEST before→after comparison (band change + ✗→✓ flips).
// Returns null when there is nothing to act on (all met, no prior attempt).

export default function ReattemptPanel({ missed = [], comparison = null, onImprove, lang = 'en' }) {
  if ((!missed || missed.length === 0) && !comparison) return null

  const ms = lang === 'ms' // chrome only — missed/hint strings are authored in-language upstream

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent)' }}>
      <h3 className="text-sm font-bold">{ms ? 'Perbaiki jawapan anda' : 'Improve your answer'}</h3>

      {comparison && (
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
          {comparison.bandBefore != null && comparison.bandAfter != null
            ? <>{ms ? 'Band isi' : 'Content band'} {comparison.bandBefore} → {comparison.bandAfter}.{' '}</>
            : null}
          {comparison.improved
            ? (ms
                ? <>Anda kini memenuhi {comparison.flipsToMet.length} keperluan lagi.</>
                : <>You now meet {comparison.flipsToMet.length} more requirement{comparison.flipsToMet.length === 1 ? '' : 's'}.</>)
            : (ms
                ? <>Tiada perubahan — perkara ini masih perlu diperbaiki.</>
                : <>Unchanged — these points still need work.</>)}
        </p>
      )}

      {missed.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-dim)' }}>
            {ms ? 'Fokus pada perkara ini' : 'Focus on these'}
          </span>
          {missed.map(m => (
            <div key={m.index} className="text-xs">
              <div className="flex items-start gap-2">
                <span aria-hidden="true" style={{ color: 'var(--color-orange)' }}>✗</span>
                <span style={{ color: 'var(--color-text)' }}>{m.text}</span>
              </div>
              {m.hint && (
                <p className="ml-5 mt-0.5" style={{ color: 'var(--color-dim)' }}>→ {m.hint}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {missed.length > 0 && (
        <button data-reattempt-improve onClick={onImprove}
          className="w-full rounded-xl py-2 text-sm font-bold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-bright)', minHeight: '44px' }}>
          {ms ? 'Tulis semula, fokus pada perkara ini' : 'Rewrite, focusing on these points'}
        </button>
      )}
    </div>
  )
}
