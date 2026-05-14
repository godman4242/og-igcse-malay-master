import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X, WifiOff } from 'lucide-react'

// "New version available" toast. Driven by vite-plugin-pwa's React
// hook — `needRefresh` flips true the moment Workbox detects a new
// SW waiting to activate. The student is in charge: tap Reload to
// apply, X to dismiss. Matches the rest of the app's `var(--color-*)`
// palette and respects `.contrast-high` / `.font-dyslexic`.
//
// `offlineReady` fires once on first install — we surface a quiet
// confirmation so the student knows the app now works without Wi-Fi.
export default function PWAUpdateToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      // Re-check for updates every 60 minutes — covers the common case
      // of a student leaving the app open as a PWA across a school day.
      setInterval(() => { registration.update().catch(() => {}) }, 60 * 60 * 1000)
    },
    onRegisterError(err) {
      console.warn('PWA registration error:', err)
    },
  })

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
      style={{
        background: needRefresh ? 'var(--color-accent2)' : 'var(--color-card)',
        color: needRefresh ? '#fff' : 'var(--color-text)',
        border: '1.5px solid ' + (needRefresh ? 'var(--color-accent2)' : 'var(--color-border)'),
        maxWidth: 'calc(100vw - 32px)',
        minWidth: 280,
      }}
    >
      {needRefresh ? (
        <>
          <RefreshCw size={16} />
          <div className="flex-1">
            <div className="text-sm font-bold">New version available</div>
            <div className="text-[11px] opacity-80">Reload to get the latest improvements.</div>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: '#fff', color: 'var(--color-accent2)' }}
          >
            Reload
          </button>
          <button onClick={close} aria-label="Dismiss" className="p-1 rounded-full hover:opacity-70">
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <WifiOff size={16} style={{ color: 'var(--color-green)' }} />
          <div className="flex-1">
            <div className="text-sm font-bold">Ready for offline study</div>
            <div className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
              Flashcards, grammar, and word families work without Wi-Fi now.
            </div>
          </div>
          <button onClick={close} aria-label="Dismiss" className="p-1 rounded-full hover:opacity-70">
            <X size={14} style={{ color: 'var(--color-dim)' }} />
          </button>
        </>
      )}
    </div>
  )
}
