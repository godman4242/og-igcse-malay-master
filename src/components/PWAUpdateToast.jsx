import { useRegisterSW } from 'virtual:pwa-register/react'
import { X, WifiOff } from 'lucide-react'

// Service-worker lifecycle surface. The app uses vite-plugin-pwa's
// `registerType: 'autoUpdate'`, so a new deploy activates and reloads
// SILENTLY — there is no "new version available, tap to reload" step
// (and `needRefresh` never flips). PWA users no longer need to swipe-kill
// and reopen to get the latest build.
//
// We still mount this for two jobs:
//   1. Register the SW (injectRegister is false) and re-check for updates
//      hourly, so a long-open PWA session picks up new deploys.
//   2. Show a one-time quiet "ready for offline study" confirmation on the
//      first install via `offlineReady`.
export default function PWAUpdateToast() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return
      // Re-check for updates every 60 minutes — covers the common case
      // of a student leaving the app open as a PWA across a school day.
      // In autoUpdate mode a found update activates + reloads automatically.
      setInterval(() => { registration.update().catch(() => {}) }, 60 * 60 * 1000)
    },
    onRegisterError(err) {
      console.warn('PWA registration error:', err)
    },
  })

  if (!offlineReady) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
      style={{
        background: 'var(--color-card)',
        color: 'var(--color-text)',
        border: '1.5px solid var(--color-border)',
        maxWidth: 'calc(100vw - 32px)',
        minWidth: 280,
      }}
    >
      <WifiOff size={16} style={{ color: 'var(--color-green)' }} />
      <div className="flex-1">
        <div className="text-sm font-bold">Ready for offline study</div>
        <div className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
          Flashcards, grammar, and word families work without Wi-Fi now.
        </div>
      </div>
      <button onClick={() => setOfflineReady(false)} aria-label="Dismiss" className="p-1 rounded-full hover:opacity-70">
        <X size={14} style={{ color: 'var(--color-dim)' }} />
      </button>
    </div>
  )
}
