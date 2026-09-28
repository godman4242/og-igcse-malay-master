import { Component } from 'react'
import { isChunkLoadError } from '../lib/lazyWithRetry'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError && this.props.fatal) return <FatalScreen />
    if (this.state.hasError) {
      // A page file that failed to download (offline, or a stale deploy the
      // one-shot reload couldn't heal): React.lazy caches the rejection, so
      // "Try Again" can't work — only a reload can (2026-09-28 bug hunt U5).
      const chunk = isChunkLoadError(this.state.error)
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fadeUp">
          <p className="text-5xl mb-4">:(</p>
          <h2 className="text-xl font-bold mb-2">{chunk ? "Couldn't load this page" : 'Something went wrong'}</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-dim)' }}>
            {chunk
              ? 'Check your connection, then tap Reload Page.'
              : (this.state.error?.message || 'An unexpected error occurred')}
          </p>
          <div className="flex gap-3">
            {!chunk && (
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ color: 'var(--color-on-bright)', background: 'var(--color-accent)' }}>
                Try Again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl font-bold text-sm"
              style={chunk
                ? { color: 'var(--color-on-bright)', background: 'var(--color-accent)' }
                : { background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// App-wide last resort (main.jsx wraps <App /> in <ErrorBoundary fatal>). The
// route boundary lives INSIDE Layout, so a crash in Layout / AuthGuard / the
// providers used to render nothing — a permanent blank page (2026-09-28 bug hunt
// U4). Offer the learner's data first, then a way out. Rendered outside the
// themed wrapper, so it relies only on the :root colour tokens.
const STORE_KEY = 'igcse-malay-store'

function saveCopy() {
  let raw = null
  try { raw = localStorage.getItem(STORE_KEY) } catch { /* storage blocked */ }
  if (!raw) return
  // The persisted `state` is the same shape Settings → Restore accepts.
  let text = raw
  try { text = JSON.stringify({ ...JSON.parse(raw).state, exportDate: new Date().toISOString() }) } catch { /* keep raw */ }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `igcse-malay-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function startFresh() {
  if (!window.confirm('Erase this device\'s study data and start fresh? Save a copy first if you want to keep it.')) return
  try { localStorage.removeItem(STORE_KEY) } catch { /* storage blocked */ }
  window.location.reload()
}

function FatalScreen() {
  const btn = 'min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm'
  const quiet = { background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
  return (
    <div role="alert" className="flex flex-col items-center justify-center min-h-screen text-center px-6"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-dim)' }}>
        The app hit an error while starting. Reload first. If it keeps happening, save a copy of your
        data, then start fresh — you can restore the copy in Settings.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => window.location.reload()} className={btn}
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-bright)' }}>Reload</button>
        <button onClick={saveCopy} className={btn} style={quiet}>Save a copy of my data</button>
        <button onClick={startFresh} className={btn} style={{ ...quiet, color: 'var(--color-red)' }}>Start fresh</button>
      </div>
    </div>
  )
}
