import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, MessageSquare, Languages, MoreHorizontal, PenTool, FileDown, Settings, Search, AlertTriangle, TreePine, X, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import useStore from '../store/useStore'
import SearchModal from './SearchModal'

const NAV = [
  { path: '/', label: 'Home', icon: LayoutDashboard },
  { path: '/study', label: 'Study', icon: BookOpen },
  { path: '/grammar', label: 'Grammar', icon: Languages },
  { path: '/roleplay', label: 'Roleplay', icon: MessageSquare },
]

const MORE_ITEMS = [
  { path: '/writing', label: 'Writing', icon: PenTool },
  { path: '/import', label: 'Import Text', icon: FileDown },
  { path: '/word-families', label: 'Word Families', icon: TreePine },
  { path: '/mistakes', label: 'Mistakes', icon: AlertTriangle },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const streak = useStore(s => s.getStreak())
  const mistakes = useStore(s => s.mistakes)
  const sync = useStore(s => s.sync)
  const setNetworkStatus = useStore(s => s.setNetworkStatus)
  const retrySync = useStore(s => s.retrySync)
  const flushSyncQueue = useStore(s => s.flushSyncQueue)
  const [searchOpen, setSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)

  const activeMistakeCount = mistakes.filter(m => !m.reviewed).length

  // Close more drawer on outside click
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moreOpen])

  // Global / key shortcut
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setMoreOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Network and sync lifecycle
  useEffect(() => {
    const setOnline = () => {
      setNetworkStatus(true)
      flushSyncQueue()
    }
    const setOffline = () => setNetworkStatus(false)
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOffline)
    }
  }, [setNetworkStatus, flushSyncQueue])

  useEffect(() => {
    if (sync.networkStatus === 'online' && sync.queue.length > 0 && sync.syncStatus !== 'syncing') {
      flushSyncQueue()
    }
  }, [sync.networkStatus, sync.queue.length, sync.syncStatus, flushSyncQueue])

  const isMoreActive = MORE_ITEMS.some(item => location.pathname === item.path)

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
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => retrySync()}
            disabled={sync.syncStatus === 'syncing' || sync.queue.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              color: sync.networkStatus === 'offline' ? 'var(--color-orange)' : (sync.syncStatus === 'error' ? 'var(--color-red)' : 'var(--color-dim)'),
              opacity: sync.syncStatus === 'syncing' ? 0.8 : 1,
            }}
          >
            {sync.networkStatus === 'offline' ? <CloudOff size={12} /> : <Cloud size={12} />}
            {sync.networkStatus === 'offline'
              ? `Offline · ${sync.queue.length} queued`
              : sync.syncStatus === 'syncing'
                ? 'Syncing...'
                : sync.syncStatus === 'error'
                  ? `Sync error · ${sync.queue.length} queued`
                  : sync.queue.length > 0
                    ? `${sync.queue.length} pending`
                    : 'Synced'}
            {(sync.syncStatus === 'error' || (sync.queue.length > 0 && sync.networkStatus === 'online')) && (
              <RefreshCw size={12} />
            )}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-[880px] w-full mx-auto px-3 pb-24 animate-fadeUp">
        {children}
      </main>

      {/* More drawer */}
      {moreOpen && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div ref={moreRef}
            className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl p-4 pb-6 animate-fadeUp"
            style={{ background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">More</h3>
              <button onClick={() => setMoreOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-card)', color: 'var(--color-dim)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map(item => {
                const active = location.pathname === item.path
                const Icon = item.icon
                return (
                  <button key={item.path} onClick={() => navigate(item.path)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all relative"
                    style={{
                      background: active ? 'rgba(255,77,109,0.1)' : 'var(--color-card)',
                      border: '1px solid ' + (active ? 'var(--color-accent)' : 'var(--color-border)'),
                      color: active ? 'var(--color-accent)' : 'var(--color-text)',
                    }}>
                    <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                    <span className="text-[10px] font-semibold">{item.label}</span>
                    {item.path === '/mistakes' && activeMistakeCount > 0 && (
                      <span className="absolute top-1 right-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--color-red)', color: '#fff' }}>
                        {activeMistakeCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t flex justify-around items-center py-2 px-1"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        {NAV.map(item => {
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
        {/* More button */}
        <button onClick={() => setMoreOpen(!moreOpen)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[52px] relative"
          style={{
            color: isMoreActive || moreOpen ? 'var(--color-accent)' : 'var(--color-dim)',
            background: isMoreActive || moreOpen ? 'rgba(255,77,109,0.1)' : 'transparent',
          }}>
          <MoreHorizontal size={20} strokeWidth={isMoreActive || moreOpen ? 2.5 : 1.5} />
          <span className="text-[10px] font-semibold">More</span>
          {activeMistakeCount > 0 && (
            <span className="absolute -top-0.5 right-1 text-[7px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center"
              style={{ background: 'var(--color-red)', color: '#fff' }}>
              {activeMistakeCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  )
}
