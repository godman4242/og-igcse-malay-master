import { useState } from 'react'
import { Sun, Moon, Download, Upload, Share2, BookOpen, Trash2, Database } from 'lucide-react'
import useStore from '../store/useStore'
import DICTIONARY from '../data/dictionary'
import TOPIC_PACKS from '../data/topics'
import { getDueCards } from '../lib/sm2'

export default function Settings() {
  const cards = useStore(s => s.cards)
  const theme = useStore(s => s.theme)
  const dailyGoal = useStore(s => s.dailyGoal)
  const streak = useStore(s => s.getStreak())
  const toggleTheme = useStore(s => s.toggleTheme)
  const setDailyGoal = useStore(s => s.setDailyGoal)
  const exportData = useStore(s => s.exportData)
  const importData = useStore(s => s.importData)
  const getAnkiExport = useStore(s => s.getAnkiExport)
  const loadTopicPack = useStore(s => s.loadTopicPack)
  const [showTopics, setShowTopics] = useState(false)
  const [msg, setMsg] = useState('')

  const due = getDueCards(cards)
  const mastered = cards.filter(c => (c.box || 1) >= 4).length

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

      {/* Topic Packs */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <button onClick={() => setShowTopics(!showTopics)}
          className="w-full flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2"><BookOpen size={14} /> Topic Packs</h3>
          <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{showTopics ? '▲' : '▼'}</span>
        </button>
        {showTopics && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            {Object.entries(TOPIC_PACKS).map(([name, words]) => (
              <button key={name} onClick={() => { loadTopicPack(name); flash(`${name} loaded!`) }}
                className="p-3 rounded-xl text-left text-xs font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                {name}
                <span className="block text-[10px] mt-0.5" style={{ color: 'var(--color-dim)' }}>{words.length} words</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export / Import */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-2">Data</h3>
        <Btn icon={<Download size={14} />} label="Backup All Data (JSON)" color="var(--color-green)" onClick={handleExportJSON} />
        <Btn icon={<Upload size={14} />} label="Restore from Backup" color="var(--color-blue)" onClick={handleImportJSON} />
        <Btn icon={<Download size={14} />} label="Export to Anki (.txt)" color="var(--color-accent2)" onClick={handleAnkiExport} />
        <Btn icon={<Share2 size={14} />} label="Share Deck via Link" color="var(--color-cyan)" onClick={handleShare} />
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
