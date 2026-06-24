import useStore from '../../store/useStore'
import { STUDY_MIX_PRESETS } from '../../lib/studyMix'

// Constrained focus chooser — named presets (recognition-cost), NOT sliders.
// Steers SELECTION only (which discretionary skill the daily plan surfaces);
// never FSRS scheduling. Hidden by the caller on an empty deck.
export default function MixSteer() {
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const studyMix = useStore(s => s.studyMix)
  const setStudyMix = useStore(s => s.setStudyMix)
  const active = studyMix?.[studyLang] || 'balanced'

  return (
    <section>
      <h3 className="text-base font-bold mb-1">Tune your focus</h3>
      <p className="text-[12px] mb-2.5" style={{ color: 'var(--color-dim)' }}>
        Nudges what your next plan leans toward. Your due reviews always come first.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Focus preset">
        {STUDY_MIX_PRESETS.map(p => {
          const on = p.id === active
          return (
            <button key={p.id} onClick={() => setStudyMix(studyLang, p.id)}
              aria-pressed={on}
              className="px-3.5 py-2.5 rounded-2xl font-semibold text-sm"
              style={{
                minHeight: 44,
                background: on ? 'var(--color-accent)' : 'var(--color-card)',
                color: on ? 'var(--color-on-bright)' : 'var(--color-text)',
                border: '1px solid ' + (on ? 'var(--color-accent)' : 'var(--color-border)'),
              }}>
              {p.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
