import { useState } from 'react'
import { Sun, Moon, Download, Upload, Share2, BookOpen, Database, FileText, FileJson, Printer, Calendar, Snowflake, Trophy, User, Sparkles } from 'lucide-react'
import useStore from '../store/useStore'
import DICTIONARY from '../data/dictionary'
import TOPIC_PACKS from '../data/topics'
import { getDueCards, State } from '../lib/fsrs'
import { exportToCSV, exportToJSON, exportToPDF } from '../lib/export'
import AuthUnlock from '../components/AuthUnlock'
import AdminPanel from '../components/AdminPanel'

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
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Theme</span>
          <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'dark' ? 'Dark' : 'Light'}
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
