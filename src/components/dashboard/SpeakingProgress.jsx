import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import useStore from '../../store/useStore'
import {
  speakingBandSeries, recurringSpeakingWeakness, topicsDueForReattempt,
} from '../../lib/patterns'
import { trackEvent } from '../../lib/telemetry'
import { hasUserOpenRouterKey } from '../../lib/openrouter'
import { speakingCoachSummary } from '../../lib/speakingCoach'
import TOPICS, { TOPICS_EN } from '../../data/speakingTopics'

// Speaking progression widget — band trend + recurring-weakness readout +
// "due for another go" topics. Pure synthesis over speakingHistory; the
// intelligence lives in src/lib/patterns.js. Reads, routes, renders. No store
// API change, no persisted state, no new Gemini calls.
// Design: docs/superpowers/specs/2026-05-30-speaking-progression-design.md

// The AI-coach summary runs on the user's own OpenRouter key (BYOK) so it never
// adds owner cost — hence it appears only when the user has set their own key.
function aiCoachAvailable() {
  return hasUserOpenRouterKey()
}

const ALL_TOPICS = [...TOPICS, ...TOPICS_EN]
function topicTitle(topicId) {
  return ALL_TOPICS.find(t => t.id === topicId)?.title || topicId
}

function isEnglishLang(lang) {
  return lang === 'eng' || lang === 'en'
}

// Default scope language: the most-recent attempt's language IF it has enough
// attempts to show a trend (≥2); otherwise whichever language qualifies. This
// avoids hiding a student's rich history just because their single newest
// attempt was in the other language.
function defaultScopeLang(history) {
  let ms = 0
  let en = 0
  let recent = 'malay'
  let best = -Infinity
  for (const e of history || []) {
    const isEn = isEnglishLang(e.lang)
    if (isEn) en++
    else ms++
    const t = new Date(e.ts).getTime()
    if (t > best) { best = t; recent = isEn ? 'eng' : 'malay' }
  }
  const recentQualifies = recent === 'eng' ? en >= 2 : ms >= 2
  if (recentQualifies) return recent
  if (en >= 2) return 'eng'
  if (ms >= 2) return 'malay'
  return recent
}

// Bilingual labels + one-line fixes, keyed by the weaknessFlags categories.
const WEAKNESS_COPY = {
  tooShort: {
    malay: { label: 'jawapan terlalu pendek', fix: 'Cuba capai masa sasaran — kembangkan setiap idea.' },
    eng: { label: 'answers too short', fix: 'Aim for the full target time — keep developing each idea.' },
  },
  disfluent: {
    malay: { label: 'kelajuan tidak sekata', fix: 'Latih kelajuan sekata — jangan terlalu laju atau perlahan.' },
    eng: { label: 'uneven pace', fix: 'Practise a steady pace — not too fast, not too slow.' },
  },
  fewMarkers: {
    malay: { label: 'kurang penanda wacana', fix: 'Tambah penanda (pertama, walau bagaimanapun, kesimpulannya).' },
    eng: { label: 'few connectors', fix: 'Add discourse markers (firstly, however, in conclusion).' },
  },
  weakVocab: {
    malay: { label: 'kosa kata harian', fix: 'Gantikan satu dua perkataan biasa dengan yang lebih formal.' },
    eng: { label: 'everyday vocabulary', fix: 'Swap one or two plain words a minute for stronger ones.' },
  },
  repetitive: {
    malay: { label: 'perkataan berulang', fix: 'Variasikan perkataan — elak mengulang yang sama.' },
    eng: { label: 'repetitive wording', fix: 'Vary your word choice — avoid repeating the same words.' },
  },
  fillerHeavy: {
    malay: { label: 'kata pengisi', fix: 'Kurangkan kata pengisi (um, lah) — berhenti senyap sebentar.' },
    eng: { label: 'filler words', fix: 'Trim fillers (um, like, you know) — pause silently instead.' },
  },
  missedCues: {
    malay: { label: 'isi terlepas', fix: 'Sentuh lebih banyak cadangan isi bagi topik itu.' },
    eng: { label: 'missed prompt cues', fix: 'Cover more of the suggested cues for the topic.' },
  },
}

function Sparkline({ bands }) {
  const w = 132
  const h = 34
  const pad = 4
  const lo = 1
  const hi = 6
  const n = bands.length
  const points = bands.map((b, i) => {
    const x = pad + (i * (w - 2 * pad)) / Math.max(1, n - 1)
    const y = pad + (h - 2 * pad) * (1 - (b - lo) / (hi - lo))
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`Recent speaking bands: ${bands.join(', ')}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function SpeakingProgress() {
  const navigate = useNavigate()
  const speakingHistory = useStore(s => s.speakingHistory)
  const userRole = useStore(s => s.userRole)
  const isEnhanced = userRole !== 'static'
  const now = useMemo(() => Date.now(), [])

  // Per-language counts → drive the gate and the optional MS/EN toggle.
  const { msCount, enCount } = useMemo(() => {
    let ms = 0
    let en = 0
    for (const e of speakingHistory || []) {
      if (isEnglishLang(e.lang)) en++
      else ms++
    }
    return { msCount: ms, enCount: en }
  }, [speakingHistory])

  const [lang, setLang] = useState(() => defaultScopeLang(speakingHistory))
  const [coach, setCoach] = useState({ state: 'idle', text: '' }) // idle|loading|done|error
  const bothQualify = msCount >= 2 && enCount >= 2
  const scopedCount = isEnglishLang(lang) ? enCount : msCount
  const langKey = isEnglishLang(lang) ? 'eng' : 'malay'

  const series = useMemo(
    () => speakingBandSeries(speakingHistory, { lang }), [speakingHistory, lang])
  const weakness = useMemo(
    () => recurringSpeakingWeakness(speakingHistory, { lang }), [speakingHistory, lang])
  const due = useMemo(
    () => topicsDueForReattempt(speakingHistory, now, { lang }), [speakingHistory, lang, now])

  // Telemetry (Enhanced tier only) — once per mount, after the gate passes.
  const shownRef = useRef(false)
  useEffect(() => {
    if (!isEnhanced || shownRef.current || scopedCount < 2) return
    shownRef.current = true
    trackEvent('speaking_progress_shown', {
      lang, count: scopedCount, delta: series.delta, best: series.best,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (scopedCount < 2) return null

  const onReattempt = (d) => {
    if (isEnhanced) {
      trackEvent('speaking_progress_reattempt_clicked', { topicId: d.topicId, reason: d.reason })
    }
    navigate('/speaking', { state: { topicId: d.topicId } })
  }

  const runCoach = async () => {
    if (isEnhanced) trackEvent('speaking_coach_clicked', { lang })
    setCoach({ state: 'loading', text: '' })
    try {
      const text = await speakingCoachSummary({ series, weakness, lang })
      setCoach({ state: text ? 'done' : 'error', text })
    } catch {
      setCoach({ state: 'error', text: '' })
    }
  }

  const showSparkline = scopedCount >= 5 && series.bands.length >= 2
  const showArrow = scopedCount >= 3
  const TrendIcon = series.delta > 0 ? TrendingUp : series.delta < 0 ? TrendingDown : Minus
  const trendColor = series.delta > 0
    ? 'var(--color-green)'
    : series.delta < 0 ? 'var(--color-red)' : 'var(--color-dim)'

  const headlineId = 'speaking-progress-headline'

  return (
    <section
      role="region"
      aria-labelledby={headlineId}
      className="rounded-2xl p-5 shadow-md"
      style={{ background: 'var(--color-card)', borderLeft: '4px solid var(--color-accent2)' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Mic size={18} style={{ color: 'var(--color-accent2)' }} aria-hidden={true} />
          <h2 id={headlineId} className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {langKey === 'eng' ? 'Speaking progress' : 'Kemajuan pertuturan'}
          </h2>
        </div>
        {bothQualify && (
          <div className="flex items-center gap-1">
            {[{ id: 'malay', label: 'BM' }, { id: 'eng', label: 'EN' }].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLang(opt.id)}
                className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{
                  minHeight: 44,
                  background: lang === opt.id ? 'var(--color-accent2)' : 'var(--color-bg)',
                  color: lang === opt.id ? '#fff' : 'var(--color-dim)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Headline trend stat (primary) + sparkline (secondary). */}
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs" style={{ color: 'var(--color-dim)' }}>
              {langKey === 'eng' ? 'Recent average' : 'Purata terkini'}
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              {series.avg}
              <span className="text-sm font-semibold" style={{ color: 'var(--color-dim)' }}> / 6</span>
            </div>
          </div>
          {showArrow && (
            <div className="flex items-center gap-1" style={{ color: trendColor }}>
              <TrendIcon size={18} aria-hidden={true} />
              <span className="text-sm font-semibold">
                {series.delta === 0
                  ? (langKey === 'eng' ? 'steady' : 'stabil')
                  : `${series.delta > 0 ? '+' : ''}${series.delta} ${langKey === 'eng' ? 'from' : 'dari'} ${series.first}`}
              </span>
            </div>
          )}
          <div className="text-xs" style={{ color: 'var(--color-dim)' }}>
            {langKey === 'eng' ? 'Best' : 'Terbaik'} {series.best}
          </div>
        </div>
        {showSparkline && <Sparkline bands={series.bands} />}
      </div>

      {!showArrow && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-dim)' }}>
          {langKey === 'eng'
            ? 'One more attempt to start seeing your trend.'
            : 'Satu lagi percubaan untuk mula melihat trend anda.'}
        </p>
      )}

      {/* Recurring weakness — three states. */}
      <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
        {weakness.tallied < 2 ? (
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
            {langKey === 'eng'
              ? 'Log a couple more attempts to surface your recurring weakness.'
              : 'Log beberapa percubaan lagi untuk menemukan kelemahan berulang anda.'}
          </p>
        ) : weakness.flagTotal === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-green)' }}>
            {langKey === 'eng'
              ? 'No recurring weakness — your recent attempts are well-rounded. Keep it up.'
              : 'Tiada kelemahan berulang — percubaan terkini anda seimbang. Teruskan!'}
          </p>
        ) : (
          <div>
            <div className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-accent2)' }}>
              {langKey === 'eng' ? 'Most common gap' : 'Kelemahan paling kerap'}
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {WEAKNESS_COPY[weakness.top[0].category]?.[langKey]?.label || weakness.top[0].category}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-dim)' }}>
              {WEAKNESS_COPY[weakness.top[0].category]?.[langKey]?.fix || ''}
            </div>
          </div>
        )}
      </div>

      {/* Due for another go. */}
      {due.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--color-dim)' }}>
            {langKey === 'eng' ? 'Due for another go' : 'Sesuai dicuba semula'}
          </div>
          <div className="flex flex-wrap gap-2">
            {due.map(d => (
              <button
                key={d.topicId}
                type="button"
                onClick={() => onReattempt(d)}
                className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-full"
                style={{ minHeight: 44, background: 'var(--color-bg)', color: 'var(--color-text)' }}
              >
                <span>{topicTitle(d.topicId)}</span>
                <ChevronRight size={16} style={{ color: 'var(--color-dim)' }} aria-hidden={true} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI-coach summary — runs on the user's own OpenRouter key (BYOK). */}
      {aiCoachAvailable() && (
        <div className="mt-4">
          {coach.state === 'done' && coach.text ? (
            <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
              <div className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--color-accent2)' }}>
                {langKey === 'eng' ? 'AI coach' : 'Jurulatih AI'}
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{coach.text}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={runCoach}
              disabled={coach.state === 'loading'}
              className="text-sm font-semibold"
              style={{ color: 'var(--color-accent2)', minHeight: 44, opacity: coach.state === 'loading' ? 0.6 : 1 }}
            >
              {coach.state === 'loading'
                ? (langKey === 'eng' ? 'Thinking…' : 'Memikirkan…')
                : coach.state === 'error'
                  ? (langKey === 'eng' ? "Couldn't generate — tap to retry" : 'Gagal — ketik untuk cuba lagi')
                  : (langKey === 'eng' ? 'Get an AI coaching summary →' : 'Dapatkan ringkasan jurulatih AI →')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
