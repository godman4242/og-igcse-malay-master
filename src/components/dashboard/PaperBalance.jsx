import { useMemo } from 'react'
import { Scale } from 'lucide-react'
import useStore from '../../store/useStore'
import { skillBalance, SKILL_KEYS } from '../../lib/skillBalance'
import { getTodayISO } from '../../lib/localDay'

// Paper balance — review feature #7. Rolls the last 7 LOCAL days of activity
// into one count per skill so a neglected paper is visible at a glance
// (counts of completed units, not minutes — lib/skillBalance.js is the pure
// aggregator). Each row navigates to its surface: the nudge IS the shortcut.
// Spec: docs/superpowers/specs/2026-06-13-per-paper-balance-meter-design.md

const EMPTY_ARR = []
const EMPTY_OBJ = {}

const SKILL_META = {
  reading: { label: 'Reading', to: '/comprehension', color: 'var(--color-cyan)' },
  listening: { label: 'Listening', to: '/listening', color: 'var(--color-blue)' },
  writing: { label: 'Writing', to: '/writing', color: 'var(--color-orange)' },
  speaking: { label: 'Speaking', to: '/speaking', color: 'var(--color-purple)' },
  vocab: { label: 'Vocab', to: '/study', color: 'var(--color-green)' },
  grammar: { label: 'Grammar', to: '/grammar', color: 'var(--color-accent)' },
  exam: { label: 'Exam', to: '/exam-rehearsal', color: 'var(--color-red)' },
}

export default function PaperBalance({ navigate }) {
  const skillActivity = useStore(s => s.skillActivity) ?? EMPTY_OBJ
  const writingHistory = useStore(s => s.writingHistory) ?? EMPTY_ARR
  const speakingHistory = useStore(s => s.speakingHistory) ?? EMPTY_ARR
  const roleplayHistory = useStore(s => s.ai)?.roleplayHistory ?? EMPTY_ARR
  const studyHistory = useStore(s => s.studyHistory) ?? EMPTY_OBJ
  const examAttempts = useStore(s => s.examAttempts) ?? EMPTY_ARR

  const balance = useMemo(
    () => skillBalance(
      { skillActivity, writingHistory, speakingHistory, roleplayHistory, studyHistory, examAttempts },
      getTodayISO(),
    ),
    [skillActivity, writingHistory, speakingHistory, roleplayHistory, studyHistory, examAttempts],
  )

  // Nothing at all this week — let the rest of the dashboard own the nudge
  // instead of a wall of seven zero bars.
  if (balance.total === 0) return null

  const max = Math.max(...SKILL_KEYS.map(k => balance.counts[k]), 1)

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
        <Scale size={15} style={{ color: 'var(--color-cyan)' }} /> Paper balance
      </h3>
      <p className="text-[10px] mb-3" style={{ color: 'var(--color-dim)' }}>
        Completed activities in the last 7 days — tap a skill to practise it.
      </p>

      <div className="space-y-1.5">
        {SKILL_KEYS.map(k => {
          const meta = SKILL_META[k]
          const count = balance.counts[k]
          const untouched = count === 0
          return (
            <button key={k} onClick={() => navigate(meta.to)}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all hover:opacity-90"
              style={{ background: 'var(--color-card2)' }}
              aria-label={`${meta.label}: ${count} ${count === 1 ? 'activity' : 'activities'} this week — open ${meta.label}`}>
              <span className="text-[11px] font-semibold w-16 text-left shrink-0"
                style={{ color: untouched ? 'var(--color-dim)' : 'var(--color-text)' }}>
                {meta.label}
              </span>
              <span className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
                <span className="block h-full rounded-full"
                  style={{ width: `${Math.round((count / max) * 100)}%`, background: meta.color }} />
              </span>
              <span className="text-[11px] font-bold w-5 text-right shrink-0"
                style={{ color: untouched ? 'var(--color-orange)' : 'var(--color-text)' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {balance.neglected.length > 0 && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-orange)' }}>
          Untouched this week: {balance.neglected.map(k => SKILL_META[k].label).join(', ')}
        </p>
      )}
    </div>
  )
}
