import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Sparkles, BookOpen, MessageSquare, Languages, LayoutGrid, Settings, Search, Cloud, CloudOff, RefreshCw, Sun, LogIn, LogOut, ChevronDown, Play } from 'lucide-react'
import useStore from '../store/useStore'
import useTheaterMode from '../hooks/useTheaterMode'
import useSavedWordHighlights from '../hooks/useSavedWordHighlights'
import useSavedWordTap from '../hooks/useSavedWordTap'
import SearchModal from './SearchModal'
import MistakeToast from './MistakeToast'
import MistakePromotedToast from './MistakePromotedToast'
import InstructSwitchToast from './InstructSwitchToast'
import GuideOffer from './GuideOffer'
import GuideHud from './guide/GuideHud'
import { useGuide } from '../hooks/useGuide'
import { PAGE_GUIDE_ROUTES } from '../lib/guide/pageGuideRoutes'
import SelectionToCard from './SelectionToCard'
import SavedWordPopover from './SavedWordPopover'

const NAV = [
  { path: '/', label: 'Home', icon: LayoutDashboard, tour: 'nav-home' },
  { path: '/for-you', label: 'For You', icon: Sparkles, tour: 'nav-for-you' },
  { path: '/study', label: 'Study', icon: BookOpen, tour: 'nav-study' },
  { path: '/grammar', label: 'Grammar', icon: Languages, tour: 'nav-grammar' },
  { path: '/roleplay', label: 'Roleplay', icon: MessageSquare, tour: 'nav-roleplay' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const getStreak = useStore(s => s.getStreak)
  const streak = getStreak()
  const mistakes = useStore(s => s.mistakes)
  const sync = useStore(s => s.sync)
  const setNetworkStatus = useStore(s => s.setNetworkStatus)
  const retrySync = useStore(s => s.retrySync)
  const flushSyncQueue = useStore(s => s.flushSyncQueue)
  const [searchOpen, setSearchOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef(null)
  const { theaterMode, setTheaterMode } = useTheaterMode()
  const { startPage } = useGuide()
  const hasPageGuide = PAGE_GUIDE_ROUTES.includes(location.pathname)
  useSavedWordHighlights() // Tier-2: persistently mark saved words in page prose
  const { popover: savedWordPopover, dismiss: dismissSavedWordPopover } = useSavedWordTap()

  const activeMistakeCount = mistakes.filter(m => !m.reviewed).length
  const authUser = useStore(s => s.auth?.user)
  const showAuthModal = useStore(s => s.showAuthModal)
  const clearAuthUser = useStore(s => s.clearAuthUser)

  const handleSignOut = async () => {
    setAccountMenuOpen(false)
    const { signOut } = await import('../config/supabase')
    await signOut()
    clearAuthUser()
  }

  // Close account menu on outside click
  useEffect(() => {
    if (!accountMenuOpen) return
    const handler = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountMenuOpen])

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

  // Kick off a flush when the queue gains an item or the network returns.
  // DELIBERATELY omits `sync.syncStatus` — a 'syncing' → 'error' transition
  // must NOT re-trigger this effect, or a failing-on-mobile flush retries
  // back-to-back with no backoff (the mobile sync loop). The store's
  // flushSyncQueue schedules its own setTimeout-driven retry via
  // nextScheduledRetryMs on failure.
  useEffect(() => {
    if (sync.networkStatus === 'online' && sync.queue.length > 0 && sync.syncStatus !== 'syncing') {
      flushSyncQueue()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.networkStatus, sync.queue.length, flushSyncQueue])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {searchOpen && <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />}

      {/* Select-any-word → translate → save-to-flashcards (global, transient). */}
      <SelectionToCard />

      {/* Tap/keyboard-select an already-saved word → READ-ONLY review popover. */}
      {savedWordPopover && (
        <SavedWordPopover {...savedWordPopover} onClose={dismissSavedWordPopover} />
      )}

      {/* Header */}
      <header
        data-no-select-card
        aria-hidden={theaterMode}
        className={
          'text-center pt-5 pb-3 px-4 relative transition-all duration-200 ease-out motion-reduce:transition-none ' +
          (theaterMode ? '-translate-y-full opacity-0 pointer-events-none h-0 overflow-hidden' : '')
        }
      >
        <div className="absolute right-4 top-5 flex items-center gap-2">
          {/* Full Page Guide (Phase 3): per-page deep dive on guided routes */}
          {hasPageGuide && (
            <button
              type="button"
              onClick={() => startPage(location.pathname)}
              aria-label="Tour this page — a guided walk through every control here"
              title="Tour this page"
              className="guide-page-btn"
            >
              <Play size={16} aria-hidden="true" />
            </button>
          )}
          {/* Auth status / Save Progress button */}
          {authUser ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(o => !o)}
                className="min-h-[44px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', color: 'var(--color-green)' }}
                title={authUser.email}
                aria-label="Account menu"
                aria-expanded={accountMenuOpen}
              >
                <Cloud size={11} />
                <span className="max-w-[80px] truncate hidden sm:inline">{authUser.email.split('@')[0]}</span>
                <ChevronDown size={11} className={accountMenuOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden z-50 shadow-xl"
                  style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                  <div className="px-3 py-2 text-[10px] truncate" style={{ color: 'var(--color-dim)', borderBottom: '1px solid var(--color-border)' }}>
                    Signed in as<br />
                    <span style={{ color: 'var(--color-text)' }}>{authUser.email}</span>
                  </div>
                  <button
                    onClick={() => { setAccountMenuOpen(false); navigate('/settings') }}
                    className="min-h-[44px] w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <Settings size={12} /> Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="min-h-[44px] w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-red)', borderTop: '1px solid var(--color-border)' }}
                  >
                    <LogOut size={12} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={showAuthModal}
              className="min-h-[44px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.18)', color: 'var(--color-accent)' }}
              aria-label="Save progress — sign in"
            >
              <LogIn size={11} />
              <span>Save</span>
            </button>
          )}
          <button onClick={() => setSearchOpen(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
            aria-label="Search">
            <Search size={14} />
          </button>
        </div>
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
            className="min-h-[44px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
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

      {/* Page content. Cloud hydration runs in the background via AuthGuard;
          children always render so the merge can land without unmounting the
          subtree (the unmount-during-hydration race was the source of the
          earlier sync loop). The header sync pill conveys hydration state. */}
      <main className="flex-1 max-w-[880px] w-full mx-auto px-3 pb-24 animate-fadeUp">
        {children}
      </main>

      {/* Mistake-saved toast — fires on any addMistake / logMistakeBatch */}
      <MistakeToast />

      {/* Phase 5 — fires when a mistake gets auto/manually promoted into the FSRS deck */}
      <MistakePromotedToast />

      {/* Multi-provider router — fires when callInstruct falls back to another provider */}
      <InstructSwitchToast />

      {/* First-run "App tour" offer — once-only, skippable; replayable in Settings */}
      <GuideOffer />

      {/* Guide HUD — drag dock-zones + a11y announcements (null when idle) */}
      <GuideHud />

      {/* Theater Mode "Lights On" exit pill */}
      {theaterMode && (
        <button
          onClick={() => setTheaterMode(false)}
          aria-label="Exit theater mode"
          title="Exit theater mode (Esc)"
          className="fixed top-3 right-3 z-[var(--z-pill)] w-11 h-11 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-200 ease-out motion-reduce:transition-none"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
        >
          <Sun size={14} />
        </button>
      )}

      {/* "Tour this page" ▶ — theater mode hides the header (where the header ▶
          lives), so on a guided page (e.g. /study during an active session) we
          surface the same entry as a floating pill beside the Lights-On exit so
          the deep dive stays reachable. Mutually exclusive with the header ▶. */}
      {theaterMode && hasPageGuide && (
        <button
          type="button"
          onClick={() => startPage(location.pathname)}
          aria-label="Tour this page — a guided walk through every control here"
          title="Tour this page"
          className="fixed top-3 right-16 z-[var(--z-pill)] w-11 h-11 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-200 ease-out motion-reduce:transition-none"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-accent)' }}
        >
          <Play size={14} aria-hidden="true" />
        </button>
      )}

      {/* Bottom Nav */}
      <nav
        data-no-select-card
        aria-hidden={theaterMode}
        className={
          'fixed bottom-0 left-0 right-0 z-50 border-t flex justify-around items-center py-2 px-1 transition-transform duration-200 ease-out motion-reduce:transition-none ' +
          (theaterMode ? 'translate-y-full opacity-0 pointer-events-none' : '')
        }
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        {NAV.map(item => {
          const active = location.pathname === item.path
          const NavIcon = item.icon
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              data-tour={item.tour}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[52px]"
              style={{
                color: active ? 'var(--color-accent)' : 'var(--color-dim)',
                background: active ? 'var(--color-accent-subtle)' : 'transparent',
              }}>
              <NavIcon size={20} strokeWidth={active ? 2.5 : 1.5} aria-hidden={true} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          )
        })}
        {/* Practice hub — replaces the old "More" drawer with a real page */}
        {(() => {
          const active = location.pathname === '/practice'
          return (
            <button onClick={() => navigate('/practice')}
              aria-label="Practice — all learning surfaces"
              data-tour="nav-practice"
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all min-w-[52px] relative"
              style={{
                color: active ? 'var(--color-accent)' : 'var(--color-dim)',
                background: active ? 'var(--color-accent-subtle)' : 'transparent',
              }}>
              <LayoutGrid size={20} strokeWidth={active ? 2.5 : 1.5} aria-hidden={true} />
              <span className="text-[10px] font-semibold">Practice</span>
              {activeMistakeCount > 0 && (
                <span className="absolute -top-0.5 right-1 text-[7px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center"
                  style={{ background: 'var(--color-red)', color: '#fff' }}>
                  {activeMistakeCount}
                </span>
              )}
            </button>
          )
        })()}
      </nav>
    </div>
  )
}
