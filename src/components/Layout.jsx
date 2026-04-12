import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, MessageSquare, Languages, PenTool, FileDown, Settings, Search } from 'lucide-react'
import useStore from '../store/useStore'
import SearchModal from './SearchModal'

const NAV = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/study', label: 'Study', icon: BookOpen },
  { path: '/roleplay', label: 'Roleplay', icon: MessageSquare },
  { path: '/grammar', label: 'Grammar', icon: Languages },
  { path: '/writing', label: 'Writing', icon: PenTool },
]

const NAV_MORE = [
  { path: '/import', label: 'Import', icon: FileDown },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const streak = useStore(s => s.getStreak())
  const [searchOpen, setSearchOpen] = useState(false)

  // Global / key shortcut
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {searchOpen && <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />}

      {/* Header */}
      <header className="text-center pt-5 pb-3 px-4 relative">
        <button onClick={() => setSearchOpen(true)}
          className="absolute right-4 top-5 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          <Search size={14} />
        </button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-accent via-accent2 to-blue bg-clip-text text-transparent">
          ooga da boogadamalay
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>IGCSE Malay Master</p>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            🔥 <span style={{ color: 'var(--color-orange)' }}>{streak}</span> day streak
          </span>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-[880px] w-full mx-auto px-3 pb-24 animate-fadeUp">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t flex justify-around items-center py-2 px-1"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        {[...NAV, ...NAV_MORE].map(item => {
          const active = location.pathname === item.path
          const NavIcon = item.icon
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[52px]"
              style={{
                color: active ? 'var(--color-accent)' : 'var(--color-dim)',
                background: active ? 'rgba(255,77,109,0.1)' : 'transparent',
              }}>
              <NavIcon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
