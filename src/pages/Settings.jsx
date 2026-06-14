import { useEffect, useRef, useState } from 'react'
import { Sun, Moon, Download, Upload, Share2, BookOpen, Database, FileText, FileJson, Printer, Calendar, Snowflake, Trophy, User, Sparkles, Languages, AlertCircle, Trash2, Star, Smartphone, CheckCircle2 } from 'lucide-react'
import { INTERESTS } from '../lib/interests'
import { useInstallPrompt } from '../lib/installPrompt'
import useStore from '../store/useStore'
import DICTIONARY from '../data/dictionary'
import TOPIC_PACKS from '../data/topics'
import { getDueCards, State, RECALL_PROBE_DEFAULT } from '../lib/fsrs'
import { GOAL_PRESETS } from '../lib/goals'
import { exportToCSV, exportToJSON, exportToPDF } from '../lib/export'
import { getProviderHealth } from '../lib/translate'
import { isGeminiAvailable } from '../lib/gemini'
import {
  isOpenRouterAvailable, verifyOpenRouterKey,
  getUserOpenRouterKey, setUserOpenRouterKey, hasUserOpenRouterKey,
} from '../lib/openrouter'
import {
  getUserGeminiKey, setUserGeminiKey, hasUserGeminiKey, verifyGeminiKey,
} from '../lib/instructProviders/gemini'
import {
  getOllamaUrl, setOllamaUrl, getOllamaModel, setOllamaModel,
  DEFAULT_OLLAMA_URL, verifyOllama, listOllamaModels,
} from '../lib/instructProviders/ollama'
import {
  getConfiguredInstructProviders, getInstructPreference, setInstructPreference,
} from '../lib/instruct'
import { cacheSize, clearCache } from '../lib/translationCache'
import { SUPABASE_CONFIG } from '../config/supabaseConfig'
import AuthUnlock from '../components/AuthUnlock'
import AdminPanel from '../components/AdminPanel'
import GuideCard from '../components/GuideCard'
import InfoPreview from '../components/InfoPreview'
import StudyLangSwitch from '../components/StudyLangSwitch'

const IDENTITY_LABELS = [
  { id: 'explorer', emoji: '🧭', label: 'Explorer', desc: 'I love discovering new words and patterns' },
  { id: 'achiever', emoji: '🏆', label: 'Achiever', desc: 'I want top marks on IGCSE Malay' },
  { id: 'connector', emoji: '🤝', label: 'Connector', desc: 'I want to speak Malay with people I care about' },
  { id: 'scholar', emoji: '📚', label: 'Scholar', desc: 'I enjoy understanding language deeply' },
]

const STUDY_CUES = [
  { id: 'morning', emoji: '🌅', label: 'After waking up' },
  { id: 'commute', emoji: '🚌', label: 'During commute' },
  { id: 'lunch', emoji: '🍱', label: 'After lunch' },
  { id: 'evening', emoji: '🌙', label: 'Before bed' },
  { id: 'break', emoji: '☕', label: 'During breaks' },
]

export default function Settings() {
  const cards = useStore(s => s.cards)
  const theme = useStore(s => s.theme)
  const dailyGoal = useStore(s => s.dailyGoal)
  const getStreak = useStore(s => s.getStreak)
  const streak = getStreak()
  const streakFreezes = useStore(s => s.streakFreezes)
  const streakFreezeLog = useStore(s => s.streakFreezeLog)
  const challengeHistory = useStore(s => s.challengeHistory)
  const toggleTheme = useStore(s => s.toggleTheme)
  const setDailyGoal = useStore(s => s.setDailyGoal)
  const theaterModeEnabled = useStore(s => s.theaterModeEnabled ?? true)
  const setTheaterModeEnabled = useStore(s => s.setTheaterModeEnabled)
  const showDictionaryImages = useStore(s => s.showDictionaryImages ?? true)
  const setShowDictionaryImages = useStore(s => s.setShowDictionaryImages)
  const dyslexicFont = useStore(s => s.dyslexicFont ?? false)
  const setDyslexicFont = useStore(s => s.setDyslexicFont)
  const highContrast = useStore(s => s.highContrast ?? false)
  const setHighContrast = useStore(s => s.setHighContrast)
  const highlightMode = useStore(s => s.highlightMode ?? 'saved')
  const setHighlightMode = useStore(s => s.setHighlightMode)
  const useAdaptiveScaffolding = useStore(s => s.ui?.useAdaptiveScaffolding ?? true)
  const setUseAdaptiveScaffolding = useStore(s => s.setUseAdaptiveScaffolding)
  const userInterests = useStore(s => s.userInterests) ?? []
  const toggleUserInterest = useStore(s => s.toggleUserInterest)
  const clearUserInterests = useStore(s => s.clearUserInterests)
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt()
  const exportData = useStore(s => s.exportData)
  const importData = useStore(s => s.importData)
  const getAnkiExport = useStore(s => s.getAnkiExport)
  const loadTopicPack = useStore(s => s.loadTopicPack)
  const [showTopics, setShowTopics] = useState(false)
  const [msg, setMsg] = useState('')

  const examDate = useStore(s => s.examDate)
  const setExamDate = useStore(s => s.setExamDate)

  // Cluster E — Identity & motivation
  const identity = useStore(s => s.identity)
  const setIdentityLabel = useStore(s => s.setIdentityLabel)
  const setIdealSelf = useStore(s => s.setIdealSelf)
  const setStudyCue = useStore(s => s.setStudyCue)
  const setGoalPreset = useStore(s => s.setGoalPreset)
  const recallProbe = useStore(s => s.recallProbe) ?? RECALL_PROBE_DEFAULT
  const setRecallProbe = useStore(s => s.setRecallProbe)
  const [idealSelfDraft, setIdealSelfDraft] = useState(identity.idealSelf || '')

  const due = getDueCards(cards)
  const mastered = cards.filter(c => c.state === State.Review && (c.stability || 0) >= 21).length

  const handleExportJSON = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ooga-da-boogadamalay-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash('Backup downloaded!')
  }

  const handleImportJSON = () => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = '.json'
    inp.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          importData(data)
          flash(`Restored ${data.cards?.length || 0} cards!`)
        } catch {
          flash('Invalid file!')
        }
      }
      reader.readAsText(file)
    }
    inp.click()
  }

  const handleAnkiExport = () => {
    if (!cards.length) { flash('No cards to export'); return }
    const txt = getAnkiExport()
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `igcse-malay-anki-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash(`Exported ${cards.length} cards for Anki!`)
  }

  const handleShare = () => {
    if (!cards.length) { flash('No cards to share'); return }
    const mini = cards.map(c => ({ m: c.m, e: c.e, t: c.t }))
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(mini))))
    const url = `${location.origin}${location.pathname}?deck=${encoded}`
    navigator.clipboard.writeText(url).then(() => flash('Share link copied!'))
  }

  const flash = (m) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      <h2 className="text-lg font-bold">Settings & Tools</h2>

      {/* Toast */}
      {msg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-bold text-white animate-fadeUp"
          style={{ background: 'var(--color-green)' }}>
          {msg}
        </div>
      )}

      {/* App guide — replayable interactive tour. Mounted first so it's the
          obvious place to find the tour again (spec §5). */}
      <GuideCard />

      {/* Study language (v34) — which language you're revising. The most important
          new pref, so it sits near the top. Malay (0546) ↔ English (0510 ESL). */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2"><span aria-hidden="true">🌐</span> Study language</h3>
        <p className="text-[11px] mb-3" style={{ color: 'var(--color-dim)' }}>
          Pick the language you're revising. Switch any time — your Malay (IGCSE 0546) and
          English (IGCSE 0510) decks stay completely separate.
        </p>
        <StudyLangSwitch />
        <AcademicEnglishSeed />
      </div>

      {/* Stats */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Database size={14} /> Stats</h3>
        <StatRow label="Dictionary Words" value={Object.keys(DICTIONARY).length} color="var(--color-green)" />
        <StatRow label="Your Cards" value={cards.length} />
        <StatRow label="Due for Review" value={due.length} color="var(--color-orange)" />
        <StatRow label="Mastered" value={mastered} color="var(--color-green)" />
        <StatRow label="Study Streak" value={`🔥 ${streak} days`} color="var(--color-orange)" />
        <StatRow label="Streak Freezes" value={`❄️ ${streakFreezes}`} color="var(--color-blue)" />
        <StatRow label="Challenges Completed" value={Object.keys(challengeHistory).length} color="var(--color-purple)" />
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Trophy size={14} /> Streak Protection</h3>
        <p className="text-xs mb-2" style={{ color: 'var(--color-dim)' }}>
          Missed a day? A streak freeze will be consumed automatically before your streak resets.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
          <Snowflake size={12} style={{ color: 'var(--color-blue)' }} />
          <span className="text-xs font-bold">{streakFreezes} freeze(s) available</span>
        </div>
        {streakFreezeLog.length > 0 && (
          <div className="mt-3 space-y-1">
            {streakFreezeLog.slice(-4).reverse().map(log => (
              <div key={log.id} className="flex items-center justify-between text-[11px] py-1"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--color-dim)' }}>
                  {log.type === 'awarded' ? 'Awarded' : 'Used'} · {log.reason.replace(/_/g, ' ')}
                </span>
                <span>{new Date(log.at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Theme + Goal */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3">Preferences</h3>
        {/* PWA install — only renders when the browser has fired
            `beforeinstallprompt` OR the app is already running standalone.
            Hidden on iOS Safari (no event), where the install path is
            Share → Add to Home Screen and a button can't trigger it. */}
        {(canInstall || isInstalled) && (
          <div className="flex items-center justify-between py-2 gap-3 mb-1 rounded-xl px-2"
            style={{
              background: isInstalled ? 'rgba(0,230,118,0.08)' : 'rgba(124,58,237,0.08)',
              border: '1px solid ' + (isInstalled ? 'rgba(0,230,118,0.25)' : 'rgba(124,58,237,0.25)'),
            }}>
            <div className="min-w-0 flex items-center gap-2">
              {isInstalled ? <CheckCircle2 size={16} style={{ color: 'var(--color-green)' }} /> : <Smartphone size={16} style={{ color: 'var(--color-accent2)' }} />}
              <div className="min-w-0">
                <span className="text-sm font-bold">
                  {isInstalled ? 'Installed as an app' : 'Install Malay Master as an app'}
                </span>
                <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
                  {isInstalled
                    ? 'Running standalone — offline study works anywhere.'
                    : 'Add to home screen for full-screen, offline-ready study.'}
                </p>
              </div>
            </div>
            {canInstall && !isInstalled && (
              <button
                onClick={async () => {
                  const res = await promptInstall()
                  if (res?.outcome === 'accepted') flash('Installing…')
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-white"
                style={{
                  background: 'var(--color-accent2)',
                  boxShadow: '0 0 0 1px rgba(124,58,237,0.5), 0 4px 16px rgba(124,58,237,0.35)',
                }}
              >
                Install App
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Theme</span>
          <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <span className="text-sm">Theater Mode</span>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>Auto-hide chrome during active tasks</p>
          </div>
          <button
            onClick={() => setTheaterModeEnabled(!theaterModeEnabled)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{
              background: theaterModeEnabled ? 'var(--color-accent2)' : 'var(--color-card2)',
              color: theaterModeEnabled ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (theaterModeEnabled ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}
          >
            {theaterModeEnabled ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <span className="text-sm">Word Pictures <span aria-hidden="true">🖼️</span></span>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>Show emoji icons on flashcards (UDL — visual support for ADHD &amp; dyslexia)</p>
          </div>
          <button
            onClick={() => setShowDictionaryImages(!showDictionaryImages)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{
              background: showDictionaryImages ? 'var(--color-accent2)' : 'var(--color-card2)',
              color: showDictionaryImages ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (showDictionaryImages ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}
          >
            {showDictionaryImages ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <span className="text-sm">Dyslexic-friendly font <span aria-hidden="true">🔤</span></span>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>Swap body type to Lexend with wider tracking (UDL — easier reading for dyslexia)</p>
          </div>
          <button
            onClick={() => setDyslexicFont(!dyslexicFont)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{
              background: dyslexicFont ? 'var(--color-accent2)' : 'var(--color-card2)',
              color: dyslexicFont ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (dyslexicFont ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}
          >
            {dyslexicFont ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <span className="text-sm">High contrast <span aria-hidden="true">⬛</span></span>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>Maximise text/background contrast (WCAG AAA) and sharpen card borders</p>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{
              background: highContrast ? 'var(--color-accent2)' : 'var(--color-card2)',
              color: highContrast ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (highContrast ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}
          >
            {highContrast ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <span className="text-sm">Highlight saved words <span aria-hidden="true">✨</span></span>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>Underline words you’re learning wherever they appear while you read</p>
          </div>
          <div className="flex gap-1 shrink-0" role="group" aria-label="Saved-word highlighting">
            {[
              { id: 'off', label: 'Off' },
              { id: 'saved', label: 'Saved' },
              { id: 'all', label: 'All' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setHighlightMode(opt.id)}
                aria-pressed={highlightMode === opt.id}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
                style={{
                  background: highlightMode === opt.id ? 'var(--color-accent2)' : 'var(--color-card2)',
                  color: highlightMode === opt.id ? '#fff' : 'var(--color-dim)',
                  border: '1px solid ' + (highlightMode === opt.id ? 'var(--color-accent2)' : 'var(--color-border)'),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* "Still remember these?" recall-probe (v23) — drives the For You shelf */}
        <div className="py-2 gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm">Still remember these? <span aria-hidden="true">🧠</span></span>
              <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>Resurface settled words on your For You home to catch quiet forgetting</p>
            </div>
            <button
              onClick={() => setRecallProbe({ enabled: !recallProbe.enabled })}
              aria-pressed={recallProbe.enabled}
              aria-label="Still remember these — toggle on or off"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
              style={{
                background: recallProbe.enabled ? 'var(--color-accent2)' : 'var(--color-card2)',
                color: recallProbe.enabled ? '#fff' : 'var(--color-dim)',
                border: '1px solid ' + (recallProbe.enabled ? 'var(--color-accent2)' : 'var(--color-border)'),
              }}
            >
              {recallProbe.enabled ? 'On' : 'Off'}
            </button>
          </div>
          {recallProbe.enabled && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Recall probe sensitivity">
              {[
                { id: 'default', label: 'Default' },
                { id: 'strict', label: 'Strict' },
                { id: 'custom', label: 'Custom' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setRecallProbe({ mode: opt.id })}
                  aria-pressed={recallProbe.mode === opt.id}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: recallProbe.mode === opt.id ? 'var(--color-accent2)' : 'var(--color-card2)',
                    color: recallProbe.mode === opt.id ? '#fff' : 'var(--color-dim)',
                    border: '1px solid ' + (recallProbe.mode === opt.id ? 'var(--color-accent2)' : 'var(--color-border)'),
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {recallProbe.enabled && recallProbe.mode === 'custom' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]" style={{ color: 'var(--color-dim)' }}>
              <label className="flex items-center gap-1.5">
                Settled ≥
                <input type="number" min="1" max="365" value={recallProbe.stabilityDays}
                  onChange={e => setRecallProbe({ mode: 'custom', stabilityDays: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })}
                  className="w-14 p-1.5 rounded-lg text-center outline-none"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                days
              </label>
              <label className="flex items-center gap-1.5">
                Idle ≥
                <input type="number" min="1" max="365" value={recallProbe.idleDays}
                  onChange={e => setRecallProbe({ mode: 'custom', idleDays: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })}
                  className="w-14 p-1.5 rounded-lg text-center outline-none"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                days
              </label>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="min-w-0">
            <span className="text-sm">Adaptive scaffolding <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>beta</span></span>
            <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>Annotated writing feedback and personalised roleplay difficulty</p>
          </div>
          <button
            onClick={() => setUseAdaptiveScaffolding(!useAdaptiveScaffolding)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{
              background: useAdaptiveScaffolding ? 'var(--color-accent2)' : 'var(--color-card2)',
              color: useAdaptiveScaffolding ? '#fff' : 'var(--color-dim)',
              border: '1px solid ' + (useAdaptiveScaffolding ? 'var(--color-accent2)' : 'var(--color-border)'),
            }}
          >
            {useAdaptiveScaffolding ? 'On' : 'Off'}
          </button>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Daily Goal</span>
          <div className="flex gap-1">
            {[10, 20, 30, 50].map(g => (
              <button key={g} onClick={() => setDailyGoal(g)}
                className="px-3 py-1 rounded-lg text-xs font-semibold"
                style={{
                  background: dailyGoal === g ? 'var(--color-accent2)' : 'var(--color-card2)',
                  color: dailyGoal === g ? '#fff' : 'var(--color-dim)',
                  border: '1px solid ' + (dailyGoal === g ? 'var(--color-accent2)' : 'var(--color-border)'),
                }}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Personal Interests — UDL Principle 1 (Engagement). Star topics to
          float matching Comprehension passages + Roleplay scenarios to the
          top of those pages. */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
          <Star size={14} style={{ color: 'var(--color-orange)' }} fill="currentColor" /> Your Interests
        </h3>
        <p className="text-[11px] mb-3" style={{ color: 'var(--color-dim)' }}>
          Star the topics you care about — matching reading passages and roleplay scenarios will float to the top of those pages, with a ⭐ badge so you spot them. Opt-in; star nothing and ordering stays the same.
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(interest => {
            const on = userInterests.includes(interest.id)
            return (
              <button
                key={interest.id}
                onClick={() => toggleUserInterest(interest.id)}
                aria-pressed={on}
                aria-label={on ? `Unstar ${interest.label}` : `Star ${interest.label}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: on ? 'var(--color-orange)' : 'var(--color-card2)',
                  color: on ? 'var(--color-on-bright)' : 'var(--color-dim)',
                  border: '1px solid ' + (on ? 'var(--color-orange)' : 'var(--color-border)'),
                }}
              >
                <span aria-hidden="true">{interest.emoji}</span>
                <span>{interest.label}</span>
                {on && <Star size={11} fill="currentColor" />}
              </button>
            )
          })}
        </div>
        {userInterests.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span style={{ color: 'var(--color-dim)' }}>
              {userInterests.length} starred — pages prioritise these
            </span>
            <button
              onClick={clearUserInterests}
              className="px-2 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Translation & AI */}
      <TranslationAndAISection />

      {/* Exam Date */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Calendar size={14} style={{ color: 'var(--color-accent)' }} /> IGCSE Exam Date
        </h3>
        <div className="flex items-center gap-3">
          <input type="date" value={examDate || ''}
            onChange={e => setExamDate(e.target.value || null)}
            className="flex-1 p-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          {examDate && (
            <button onClick={() => setExamDate(null)}
              className="text-xs px-3 py-2 rounded-xl"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Clear
            </button>
          )}
        </div>
        {examDate && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-dim)' }}>
            {Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))} days until exam
          </p>
        )}
      </div>

      {/* Topic Packs */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <button onClick={() => setShowTopics(!showTopics)}
          className="w-full flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><BookOpen size={14} /> Topic Packs</h3>
          <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{showTopics ? '▲' : '▼'}</span>
        </button>
        {showTopics && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {Object.entries(TOPIC_PACKS).map(([name, words]) => {
              const loadedCount = cards.filter(c => c.t === name).length
              const isLoaded = loadedCount > 0
              return (
                <button key={name} onClick={() => { loadTopicPack(name); flash(`${name} loaded!`) }}
                  className="p-3 rounded-xl text-left text-xs font-semibold transition-all hover:scale-[1.02] relative"
                  style={{ background: isLoaded ? 'rgba(0,230,118,0.08)' : 'var(--color-card2)', border: '1px solid ' + (isLoaded ? 'var(--color-green)' : 'var(--color-border)'), color: 'var(--color-text)' }}>
                  {isLoaded && (
                    <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(0,230,118,0.2)', color: 'var(--color-green)' }}>
                      {loadedCount}
                    </span>
                  )}
                  {name}
                  <span className="block text-[10px] mt-0.5" style={{ color: 'var(--color-dim)' }}>
                    {words.length} words{isLoaded ? ' (loaded)' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cluster E — Identity & Motivation */}
      <div className="rounded-2xl p-4" style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(68,138,255,0.04))',
        border: '1px solid rgba(124,58,237,0.2)',
      }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--color-purple)' }} /> Identity & Motivation
        </h3>

        {/* Learner identity label */}
        <p className="text-[10px] mb-2 font-bold uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>
          I am a…
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {IDENTITY_LABELS.map(l => (
            <button key={l.id} onClick={() => setIdentityLabel(l.id)}
              className="p-2.5 rounded-xl text-left transition-all hover:scale-[1.02]"
              style={{
                background: identity.label === l.id ? 'rgba(124,58,237,0.15)' : 'var(--color-card)',
                border: '1.5px solid ' + (identity.label === l.id ? 'var(--color-purple)' : 'var(--color-border)'),
              }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{l.emoji}</span>
                <span className="text-xs font-bold" style={{
                  color: identity.label === l.id ? 'var(--color-purple)' : 'var(--color-text)',
                }}>{l.label}</span>
              </div>
              <p className="text-[10px] leading-snug" style={{ color: 'var(--color-dim)' }}>{l.desc}</p>
            </button>
          ))}
        </div>

        {/* Goal preset chooser (v23) — shapes the For You "Toward your goal" shelf */}
        <p className="text-[10px] mb-1.5 font-bold uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>
          What are you aiming for?
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Goal preset">
          {GOAL_PRESETS.map(p => {
            const active = identity.goalPreset === p.id
            return (
              <button key={p.id}
                onClick={() => { setGoalPreset(active ? null : p.id); flash('Goal updated!') }}
                aria-pressed={active}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                style={{
                  background: active ? 'var(--color-purple)' : 'var(--color-card)',
                  color: active ? '#fff' : 'var(--color-dim)',
                  border: '1px solid ' + (active ? 'var(--color-purple)' : 'var(--color-border)'),
                }}>
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Ideal self statement */}
        <p className="text-[10px] mb-1.5 font-bold uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>
          My goal in one sentence
        </p>
        <div className="flex gap-2 mb-4">
          <input type="text" value={idealSelfDraft}
            onChange={e => setIdealSelfDraft(e.target.value.slice(0, 80))}
            placeholder="e.g. I want to speak Malay confidently by June"
            className="flex-1 p-2.5 rounded-xl text-xs outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <button onClick={() => { setIdealSelf(idealSelfDraft); flash('Goal saved!') }}
            disabled={!idealSelfDraft.trim() || idealSelfDraft === identity.idealSelf}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--color-purple)' }}>
            Save
          </button>
        </div>

        {/* Study cue */}
        <p className="text-[10px] mb-1.5 font-bold uppercase tracking-wide" style={{ color: 'var(--color-dim)' }}>
          When I study
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STUDY_CUES.map(c => (
            <button key={c.id} onClick={() => setStudyCue(c.id)}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: identity.cue === c.id ? 'var(--color-purple)' : 'var(--color-card)',
                color: identity.cue === c.id ? '#fff' : 'var(--color-dim)',
                border: '1px solid ' + (identity.cue === c.id ? 'var(--color-purple)' : 'var(--color-border)'),
              }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {identity.idealSelf && (
          <div className="mt-3 p-2.5 rounded-xl text-xs italic leading-relaxed"
            style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-purple)', border: '1px solid rgba(124,58,237,0.15)' }}>
            "{identity.idealSelf}"
          </div>
        )}
      </div>

      {/* Export Formats (NEW) */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-2">Export Cards</h3>
        <Btn icon={<FileText size={14} />} label={`Export CSV (${cards.length} cards)`} color="var(--color-green)"
          onClick={() => { exportToCSV(cards); flash('CSV exported!') }} />
        <Btn icon={<FileJson size={14} />} label={`Export JSON (${cards.length} cards)`} color="var(--color-blue)"
          onClick={() => { exportToJSON(cards); flash('JSON exported!') }} />
        <Btn icon={<Printer size={14} />} label="Print / Save as PDF" color="var(--color-purple)"
          onClick={() => { exportToPDF(cards); flash('Print dialog opened!') }} />
        <Btn icon={<Download size={14} />} label="Export to Anki (.txt)" color="var(--color-accent2)" onClick={handleAnkiExport} />
      </div>

      {/* Backup / Import / Share */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-2">Backup & Share</h3>
        <Btn icon={<Download size={14} />} label="Backup All Data (JSON)" color="var(--color-green)" onClick={handleExportJSON} />
        <Btn icon={<Upload size={14} />} label="Restore from Backup" color="var(--color-blue)" onClick={handleImportJSON} />
        <Btn icon={<Share2 size={14} />} label="Share Deck via Link" color="var(--color-cyan)" onClick={handleShare} />
      </div>

      {/* Enhanced Mode */}
      <div className="mt-6">
        <h3 className="text-sm font-bold mb-3">Account</h3>
        <AuthUnlock />
      </div>

      {/* Admin Panel (only visible to admin/owner) */}
      <div className="mt-4">
        <AdminPanel />
      </div>
    </div>
  )
}

// Free academic English seed (AWL Sublist 1). Self-contained + self-gated so the
// big Settings component needs only a one-line insertion; shows only when the
// learner is studying English (v34 studyLang). Adds a "Academic English" deck of
// lang:'en' cards; the store action dedupes, so re-tapping is safe.
function AcademicEnglishSeed() {
  const studyLang = useStore(s => s.studyLang) || 'ms'
  const cards = useStore(s => s.cards)
  const seedAcademicEnglish = useStore(s => s.seedAcademicEnglish)
  const [seeding, setSeeding] = useState(false)
  const [justAdded, setJustAdded] = useState(null)
  if (studyLang !== 'en') return null
  const haveCount = cards.filter(c => c.t === 'Academic English').length
  const onAdd = async () => {
    setSeeding(true)
    const added = await seedAcademicEnglish()
    setJustAdded(added)
    setSeeding(false)
  }
  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
      <h4 className="text-xs font-bold mb-1 flex items-center gap-1.5">
        <Sparkles size={13} style={{ color: 'var(--color-accent2)' }} aria-hidden={true} /> Academic words (boost your band)
      </h4>
      <p className="text-[11px] mb-2" style={{ color: 'var(--color-dim)' }}>
        Add 60 high-frequency academic English words (Coxhead’s Academic Word List) with Malay meanings —
        the sophisticated vocabulary that lifts IGCSE writing bands. Free, and studied like any other deck.
      </p>
      <button
        type="button"
        onClick={onAdd}
        disabled={seeding}
        className="px-4 py-2 rounded-xl font-bold text-xs"
        style={{ background: 'var(--color-accent2)', color: 'var(--color-on-bright)', minHeight: 44, opacity: seeding ? 0.6 : 1 }}
      >
        {seeding ? 'Adding…' : haveCount >= 60 ? 'Academic deck added ✓' : 'Add academic words'}
      </button>
      {justAdded != null && (
        <p className="text-[11px] mt-2" style={{ color: justAdded > 0 ? 'var(--color-green)' : 'var(--color-dim)' }}>
          {justAdded > 0
            ? `Added ${justAdded} academic words to your “Academic English” deck.`
            : 'You already have these — nothing new added.'}
        </p>
      )}
    </div>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex justify-between py-1.5 text-sm border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
      <span style={{ color: 'var(--color-dim)' }}>{label}</span>
      <span className="font-bold" style={{ color: color || 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

function Btn({ icon, label, color, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01]"
      style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
      <span style={{ color }}>{icon}</span>
      {label}
    </button>
  )
}

// Bring-Your-Own-Key: per-provider key cards. When set, AI features run on the
// user's own key. Each key is stored only in this browser, in its OWN
// localStorage slot (never the Zustand store, so it can never reach the cloud
// sync blob). Designs: docs/superpowers/specs/2026-05-30-byok-design.md +
// 2026-06-10-multi-provider-instruct-router-design.md

// Shared field chrome (label, blurb, input, Save/Test/Clear states) for one
// provider key — the chrome extracted from the original OpenRouterKeyField,
// behavior unchanged.
function ProviderKeyCard({ label, blurb, placeholder, getKey, saveKey, hasKey, verify, inputRef, onConfigChange }) {
  const [key, setKey] = useState(() => getKey() || '')
  const [saved, setSaved] = useState(() => hasKey())
  const [testState, setTestState] = useState(null) // null | 'testing' | 'ok' | 'fail'

  const save = () => {
    saveKey(key)
    setSaved(hasKey())
    setTestState(null)
    onConfigChange?.()
  }
  const clear = () => {
    saveKey('')
    setKey('')
    setSaved(false)
    setTestState(null)
    onConfigChange?.()
  }
  const test = async () => {
    saveKey(key) // use the latest typed value
    setSaved(hasKey())
    setTestState('testing')
    onConfigChange?.()
    try {
      // Validate AUTH only — never a chat completion. The old path proxied a
      // completion through the flaky :free models, so a valid key reported
      // "Invalid" whenever those were rate-limited or returned empty.
      await verify(key)
      setTestState('ok')
    } catch {
      setTestState('fail')
    }
  }

  const statusText = testState === 'testing' ? 'Testing…'
    : testState === 'ok' ? '✓ Working'
    : testState === 'fail' ? '✗ Invalid or unreachable'
    : saved ? 'Saved on this device' : ''
  const statusColor = testState === 'ok' ? 'var(--color-green)'
    : testState === 'fail' ? 'var(--color-red)' : 'var(--color-dim)'

  return (
    <div className="mb-3">
      <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--color-dim)' }}>
        {label}
      </label>
      <p className="text-[11px] mb-2" style={{ color: 'var(--color-dim)' }}>
        {blurb}
      </p>
      <input
        ref={inputRef}
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-3 py-2 rounded-lg text-sm mb-2"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={save} disabled={!key.trim()}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--color-purple)', color: '#fff', minHeight: 36, opacity: key.trim() ? 1 : 0.5 }}>
          Save
        </button>
        <button onClick={test} disabled={!key.trim() || testState === 'testing'}
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', minHeight: 36, opacity: (key.trim() && testState !== 'testing') ? 1 : 0.5 }}>
          Test key
        </button>
        {saved && (
          <button onClick={clear}
            className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-red)', minHeight: 36 }}>
            <Trash2 size={11} /> Clear
          </button>
        )}
        {statusText && (
          <span className="text-[11px] font-semibold" style={{ color: statusColor }}>{statusText}</span>
        )}
      </div>
    </div>
  )
}

// Ollama: local AI on the user's own computer. Desktop-only (spec R2 — phones
// can't reach a local Ollama: no local server, and LAN URLs from HTTPS are
// hard-blocked mixed content) and collapsed by default (the ADD-friction
// guardrail: the main path stays two paste-a-key cards). Honest about its
// 3 setup steps right in the card.
function OllamaAdvancedCard({ onConfigChange }) {
  const [desktop] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 768px)')?.matches)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState(() => getOllamaUrl() || '')
  const [model, setModel] = useState(() => getOllamaModel() || '')
  const [models, setModels] = useState([])
  const [connState, setConnState] = useState(null) // null | 'connecting' | 'ok' | 'fail'
  const [connError, setConnError] = useState('')

  if (!desktop) return null

  const configured = !!(getOllamaUrl() && getOllamaModel())
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-site'

  const connect = async () => {
    setConnState('connecting')
    setConnError('')
    try {
      const target = (url || DEFAULT_OLLAMA_URL).trim()
      setOllamaUrl(target) // throws on a non-http(s) URL
      if (!url) setUrl(DEFAULT_OLLAMA_URL)
      await verifyOllama()
      const list = await listOllamaModels()
      setModels(list)
      if (list.length && !list.includes(model)) {
        setModel(list[0])
        setOllamaModel(list[0])
      }
      setConnState(list.length ? 'ok' : 'fail')
      if (!list.length) setConnError('Connected, but no models installed — run `ollama pull` first.')
    } catch (e) {
      setConnState('fail')
      setConnError(e?.message || 'Could not reach Ollama')
    }
    onConfigChange?.()
  }

  const pickModel = (m) => {
    setModel(m)
    setOllamaModel(m)
    onConfigChange?.()
  }

  const disconnect = () => {
    setOllamaUrl('')
    setOllamaModel('')
    setUrl('')
    setModel('')
    setModels([])
    setConnState(null)
    setConnError('')
    onConfigChange?.()
  }

  return (
    <div className="mb-3 rounded-xl" data-testid="ollama-advanced-card"
      style={{ border: '1px dashed var(--color-border)' }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}>
        <span className="text-[11px] font-bold" style={{ color: 'var(--color-dim)' }}>
          Advanced — local AI on your computer (desktop)
        </span>
        <span className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
          {configured ? `✓ ${getOllamaModel()}` : ''} {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <p className="text-[11px] mb-2" style={{ color: 'var(--color-dim)' }}>
            Run AI fully offline with Ollama — private, no quota, but weaker at Malay than
            the cloud options. Three one-time steps:
          </p>
          <ol className="text-[11px] mb-2 pl-4 list-decimal space-y-1" style={{ color: 'var(--color-dim)' }}>
            <li>Install Ollama (ollama.com) and pull a model, e.g. <code>ollama pull qwen3:4b</code></li>
            <li>Allow this site: <code>launchctl setenv OLLAMA_ORIGINS {origin}</code> (Mac; or set the
              OLLAMA_ORIGINS env var to {origin} or *), then restart Ollama</li>
            <li>Click Connect and accept Chrome's "local network" permission if prompted</li>
          </ol>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={DEFAULT_OLLAMA_URL}
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg text-sm mb-2"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={connect} disabled={connState === 'connecting'}
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-purple)', color: '#fff', minHeight: 36, opacity: connState === 'connecting' ? 0.5 : 1 }}>
              {connState === 'connecting' ? 'Connecting…' : 'Connect'}
            </button>
            {configured && (
              <button onClick={disconnect}
                className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-red)', minHeight: 36 }}>
                <Trash2 size={11} /> Disconnect
              </button>
            )}
            {connState === 'ok' && (
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-green)' }}>✓ Connected</span>
            )}
            {connState === 'fail' && (
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-red)' }}>✗ {connError}</span>
            )}
          </div>
          {models.length > 0 && (
            <div className="mt-2">
              <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--color-dim)' }}>
                Model
              </label>
              <select value={model} onChange={(e) => pickModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// "AI providers — use your own keys": the multi-provider BYOK section. Routing
// lives in src/lib/instruct.js; this section only manages the per-provider key
// slots and the preferred-provider choice. The #byok anchor (deep-linked from
// the add-key nudge and the switch toast) now sits on the section wrapper.
function AIProvidersSection() {
  const sectionRef = useRef(null)
  const firstInputRef = useRef(null)
  // Bumped whenever a key is saved/cleared so the preferred-provider picker
  // reflects the configured set without a reload.
  const [, setConfigVersion] = useState(0)
  const bumpConfig = () => setConfigVersion(v => v + 1)

  // Deep-link (/settings#byok): scroll the section into view and focus the
  // first key input so the user lands exactly where they act (recognition over
  // recall). Respect prefers-reduced-motion.
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#byok') return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    sectionRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    firstInputRef.current?.focus()
  }, [])

  const configured = getConfiguredInstructProviders()
  const preference = getInstructPreference()

  return (
    <div id="byok" ref={sectionRef} className="mb-2 scroll-mt-20">
      <h4 className="text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        AI providers — use your own keys (optional)
      </h4>
      <p className="text-[11px] mb-3" style={{ color: 'var(--color-dim)' }}>
        Keys are stored only in this browser — never sent to our servers. With two or
        more, the app auto-switches when one hits its limit.
      </p>

      <ProviderKeyCard
        label="OpenRouter key"
        blurb="Paste a free OpenRouter key and all AI runs on your account. Get one at openrouter.ai. Also powers “Sharper read” (vision OCR) in the PDF reader."
        placeholder="sk-or-..."
        getKey={getUserOpenRouterKey}
        saveKey={setUserOpenRouterKey}
        hasKey={hasUserOpenRouterKey}
        verify={(k) => verifyOpenRouterKey(k)}
        inputRef={firstInputRef}
        onConfigChange={bumpConfig}
      />

      <ProviderKeyCard
        label="Gemini key"
        blurb="Free key at aistudio.google.com/apikey — paste and go. Also powers “Sharper read” (vision OCR) in the PDF reader. Tip: restrict it to the Generative Language API in the Google Cloud console."
        placeholder="AIza..."
        getKey={getUserGeminiKey}
        saveKey={setUserGeminiKey}
        hasKey={hasUserGeminiKey}
        verify={(k) => verifyGeminiKey(k)}
        onConfigChange={bumpConfig}
      />

      <OllamaAdvancedCard onConfigChange={bumpConfig} />

      {configured.length >= 2 && (
        <div className="mb-1" data-testid="preferred-provider-picker">
          <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--color-dim)' }}>
            Preferred provider
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {[{ id: 'auto', label: 'Auto (recommended)' }, ...configured].map(opt => {
              const active = preference === opt.id
              return (
                <button key={opt.id}
                  onClick={() => { setInstructPreference(opt.id); bumpConfig() }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg"
                  style={{
                    background: active ? 'rgba(179,136,255,0.12)' : 'var(--color-surface)',
                    border: '1px solid ' + (active ? 'var(--color-purple)' : 'var(--color-border)'),
                    color: 'var(--color-text)',
                    minHeight: 36,
                  }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// A bar-and-frame primitive for the tiny phone mocks below — pure CSS, no
// assets, theme-safe (Issue 5 reusable-preview pattern).
function MockLine({ w = '100%', accent = false }) {
  return (
    <div style={{
      height: 4, borderRadius: 2, width: w,
      background: accent ? 'var(--color-cyan)' : 'var(--color-dim)',
      opacity: accent ? 0.85 : 0.35,
    }} />
  )
}

// A single labelled phone frame for the mocks below.
function MockFrame({ children, label }) {
  return (
    <div className="flex-1 text-center">
      <div className="mx-auto flex flex-col gap-1.5 p-2 rounded-lg"
        style={{ width: 88, height: 124, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        {children}
      </div>
      <p className="text-[10px] mt-1 font-bold" style={{ color: 'var(--color-text)' }}>{label}</p>
    </div>
  )
}

// 2-up phone mock for the Inline vs Bottom-panel sentence-reveal setting. The
// cyan bar = the revealed English: under the tapped line (inline) vs pinned to
// a fixed bottom strip (sheet).
function SentenceRenderMock() {
  return (
    <div>
      <p className="text-[11px] font-bold mb-2" style={{ color: 'var(--color-text)' }}>
        Where the English appears
      </p>
      <div className="flex gap-2">
        <MockFrame label="Inline">
          <MockLine w="80%" />
          <MockLine w="62%" />
          <MockLine w="70%" accent />{/* English right under the line */}
          <MockLine w="85%" />
          <MockLine w="48%" />
        </MockFrame>
        <MockFrame label="Bottom panel">
          <MockLine w="80%" />
          <MockLine w="66%" />
          <MockLine w="84%" />
          <MockLine w="56%" />
          <div className="mt-auto rounded-md p-1.5" style={{ background: 'var(--color-card2)', border: '1px solid var(--color-cyan)' }}>
            <MockLine w="90%" accent />{/* English pinned to a fixed strip */}
          </div>
        </MockFrame>
      </div>
      <p className="text-[10px] mt-2 leading-snug" style={{ color: 'var(--color-dim)' }}>
        <b>Inline</b> drops the English right under the sentence you tapped.
        <b> Bottom panel</b> keeps it in a fixed strip so the page never jumps.
      </p>
    </div>
  )
}

function TranslationAndAISection() {
  const translation = useStore(s => s.translation)
  const writingTutor = useStore(s => s.writingTutor)
  const userRole = useStore(s => s.userRole)
  const setTranslationProvider = useStore(s => s.setTranslationProvider)
  const setTranslationComparisonLink = useStore(s => s.setTranslationComparisonLink)
  const setTranslationCacheToCloud = useStore(s => s.setTranslationCacheToCloud)
  const sentenceRender = useStore(s => s.pdfReader?.sentenceRender ?? 'inline')
  const setPdfSentenceRender = useStore(s => s.setPdfSentenceRender)
  const autoHelpDensePages = useStore(s => s.pdfReader?.autoHelpDensePages ?? false)
  const setPdfAutoHelpDensePages = useStore(s => s.setPdfAutoHelpDensePages)
  // The dense-page help reveals the learner's L1 gloss: a Malay learner reads an
  // English doc → reveal English; an English (0510) learner reads an English doc →
  // reveal the Malay gloss. Mirror the reader's banner copy.
  const denseHelpLang = (useStore(s => s.studyLang) || 'ms') === 'en' ? 'Malay' : 'English'
  const setWritingTutorProvider = useStore(s => s.setWritingTutorProvider)
  const setWritingTutorAutoDetect = useStore(s => s.setWritingTutorAutoDetect)

  const health = getProviderHealth()
  const [cacheCount, setCacheCount] = useState(null)
  const cloudCacheReady = SUPABASE_CONFIG.enabled && userRole !== 'static'

  useEffect(() => {
    let active = true
    cacheSize().then(count => {
      if (active) setCacheCount(count)
    })
    return () => { active = false }
  }, [])

  const wipeCache = async () => {
    await clearCache()
    setCacheCount(0)
  }

  const PROVIDER_OPTIONS = [
    { id: 'auto', label: 'Auto', hint: 'Best available (DeepL > Google > Free)' },
    { id: 'deepl', label: 'DeepL', hint: health.deepl ? 'More accurate for short phrases' : 'Add VITE_DEEPL_KEY to enable' },
    { id: 'google', label: 'Google Cloud', hint: health.google ? 'Supports Malay' : 'Add VITE_GOOGLE_TRANSLATE_KEY to enable' },
    { id: 'gtx', label: 'Free (gtx)', hint: 'Unauthenticated, rate-limited' },
  ]

  const TUTOR_OPTIONS = [
    { id: 'gemini', label: 'Gemini Flash', hint: isGeminiAvailable() ? 'Free tier — 1M tokens/day' : 'Add VITE_GEMINI_KEY' },
    { id: 'openrouter', label: 'OpenRouter free', hint: isOpenRouterAvailable() ? 'Llama / DeepSeek / Gemma' : 'Add VITE_OPENROUTER_KEY' },
  ]

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Languages size={14} style={{ color: 'var(--color-cyan)' }} /> Translation &amp; AI
      </h3>

      {/* Key warning */}
      <div className="rounded-lg p-2.5 text-[11px] flex items-start gap-2 mb-3"
        style={{ background: 'rgba(255,145,0,0.08)', border: '1px solid rgba(255,145,0,0.2)', color: 'var(--color-orange)' }}>
        <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
        <span>API keys are bundled into the production site. Restrict each key in its provider's console (Google to Cloud Translation API + your domain; Gemini to Generative Language API).</span>
      </div>

      {/* Translator picker */}
      <div className="mb-3">
        <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--color-dim)' }}>Translator</label>
        <div className="space-y-1">
          {PROVIDER_OPTIONS.map(opt => {
            const disabled = (opt.id === 'deepl' && !health.deepl) || (opt.id === 'google' && !health.google)
            const active = translation.preferredProvider === opt.id
            return (
              <button key={opt.id} onClick={() => !disabled && setTranslationProvider(opt.id)}
                disabled={disabled}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: active ? 'rgba(0,229,255,0.12)' : 'var(--color-surface)',
                  border: '1px solid ' + (active ? 'var(--color-cyan)' : 'var(--color-border)'),
                  color: disabled ? 'var(--color-dim)' : 'var(--color-text)',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}>
                <span className="font-bold">{opt.label}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{opt.hint}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm">Show comparison link</span>
        <input type="checkbox" checked={translation.showComparisonLink}
          onChange={(e) => setTranslationComparisonLink(e.target.checked)} />
      </div>

      {/* PDF reader — where a revealed sentence's English appears (sentence-reveal). */}
      <div className="py-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm inline-flex items-center gap-1.5">
              PDF sentence translation
              <InfoPreview testId="info-sentence-render" label="PDF sentence translation" align="center">
                <SentenceRenderMock />
              </InfoPreview>
            </span>
            <p className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
              Where the English appears when you reveal a whole sentence in the PDF reader
            </p>
          </div>
          <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--color-border)' }}>
            {[
              { id: 'inline', label: 'Inline' },
              { id: 'sheet', label: 'Bottom panel' },
            ].map(opt => {
              const active = sentenceRender === opt.id
              return (
                <button key={opt.id} onClick={() => setPdfSentenceRender(opt.id)}
                  className="px-2.5 py-1.5 text-xs font-bold"
                  style={{ background: active ? 'var(--color-cyan)' : 'transparent',
                           color: active ? 'var(--color-on-bright)' : 'var(--color-text)' }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Beginner pref (Claim 6b) — auto-ease the reveal-gate on demonstrably
          too-hard pages instead of asking. Default OFF; gate stays default for all. */}
      <div className="flex items-center justify-between py-2">
        <div className="pr-3">
          <span className="text-sm">Starting out? Auto-show {denseHelpLang} on hard pages</span>
          <p className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
            When a page has a lot of new words, the reader shows the {denseHelpLang} for you (you&rsquo;ll
            still see the other language first) instead of asking. Off by default.
          </p>
        </div>
        <input type="checkbox" data-testid="auto-help-dense-toggle"
          checked={autoHelpDensePages}
          onChange={(e) => setPdfAutoHelpDensePages(e.target.checked)} />
      </div>

      <div className="flex items-center justify-between py-2" style={{ opacity: cloudCacheReady ? 1 : 0.6 }}>
        <div>
          <span className="text-sm">Cache translations to cloud</span>
          <p className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
            {cloudCacheReady
              ? 'Read-through cache enabled for signed-in devices'
              : SUPABASE_CONFIG.enabled
                ? 'Sign in to sync cached translations'
                : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY to enable'}
          </p>
        </div>
        <input type="checkbox" disabled={!cloudCacheReady} checked={cloudCacheReady && translation.cacheToCloud}
          onChange={(e) => setTranslationCacheToCloud(cloudCacheReady && e.target.checked)} />
      </div>

      {/* Cache stats */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm">Local translation cache</span>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-dim)' }}>
            {cacheCount === null ? '…' : `${cacheCount} entries`}
          </span>
          {cacheCount > 0 && (
            <button onClick={wipeCache}
              className="text-xs px-2 py-1 rounded flex items-center gap-1"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-red)' }}>
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      <hr className="my-3" style={{ borderColor: 'var(--color-border)' }} />

      {/* Tutor picker */}
      <div className="mb-2">
        <label className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--color-dim)' }}>Writing tutor model</label>
        <div className="space-y-1">
          {TUTOR_OPTIONS.map(opt => {
            const disabled =
              (opt.id === 'gemini' && !isGeminiAvailable()) ||
              (opt.id === 'openrouter' && !isOpenRouterAvailable())
            const active = writingTutor.provider === opt.id
            return (
              <button key={opt.id} onClick={() => !disabled && setWritingTutorProvider(opt.id)}
                disabled={disabled}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: active ? 'rgba(179,136,255,0.12)' : 'var(--color-surface)',
                  border: '1px solid ' + (active ? 'var(--color-purple)' : 'var(--color-border)'),
                  color: disabled ? 'var(--color-dim)' : 'var(--color-text)',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}>
                <span className="font-bold">{opt.label}</span>
                <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>{opt.hint}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-sm">Auto-detect writing format</span>
        <input type="checkbox" checked={writingTutor.autoDetectFormat}
          onChange={(e) => setWritingTutorAutoDetect(e.target.checked)} />
      </div>

      <hr className="my-3" style={{ borderColor: 'var(--color-border)' }} />

      <AIProvidersSection />
    </div>
  )
}
