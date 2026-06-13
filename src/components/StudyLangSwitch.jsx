import useStore from '../store/useStore'

// v34 — the global "which language am I revising" switch. Malay (IGCSE 0546) ↔
// English (IGCSE 0510 ESL). Scopes the Study session, Smart-Study queue, and
// Dashboard counts (cardsForLang). One active language at a time (ADD-first).
const OPTS = [
  { id: 'ms', flag: '🇲🇾', label: 'Malay' },
  { id: 'en', flag: '🇬🇧', label: 'English' },
]

export default function StudyLangSwitch({ compact = false }) {
  const studyLang = useStore((s) => s.studyLang) || 'ms'
  const setStudyLang = useStore((s) => s.setStudyLang)
  return (
    <div
      className={`inline-flex gap-1 p-1 rounded-xl ${compact ? '' : 'w-full'}`}
      style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}
      role="group"
      aria-label="Study language"
    >
      {OPTS.map((o) => {
        const active = studyLang === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setStudyLang(o.id)}
            aria-pressed={active}
            className={`flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all ${compact ? 'px-3 text-xs' : 'flex-1 px-3 text-sm'}`}
            style={{
              background: active ? 'var(--color-accent2)' : 'transparent',
              color: active ? 'var(--color-on-bright)' : 'var(--color-dim)',
              minHeight: 44,
            }}
          >
            <span aria-hidden="true">{o.flag}</span>
            <span>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
