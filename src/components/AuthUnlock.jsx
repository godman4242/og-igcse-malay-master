// src/components/AuthUnlock.jsx
// Magic-link sign-in form + signed-in summary on the Settings page.
//
// Purely presentational. AuthGuard (at App root) owns all sign-in side effects:
// setAuthUser, checkUserRole + setUserRole, enableCloudTelemetry, cloud blob
// sync. AuthUnlock reads `auth.user` from the store to know whether to render
// the signed-in card or the magic-link form. No mount effect lives here.
//
// History: AuthUnlock used to run its own cold-load session restore, calling
// hydrateCloudData on mount. That flipped isHydratingCloud → Layout swapped
// children for a spinner → Settings unmounted → AuthUnlock unmounted →
// hydration resolved → children remounted → AuthUnlock remounted → its effect
// re-fired. Infinite loop. See src/components/__tests__/authUnlock.test.js.

import { useState } from 'react'
import { Mail, CheckCircle, XCircle, LogOut, Shield } from 'lucide-react'
import { SUPABASE_CONFIG } from '../config/supabaseConfig'
import useStore from '../store/useStore'

export default function AuthUnlock() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState(null)
  const user = useStore(s => s.auth?.user)
  const userRole = useStore(s => s.userRole)
  const setTranslationCacheToCloud = useStore(s => s.setTranslationCacheToCloud)

  const handleSendLink = async () => {
    if (!email.trim()) return
    setStatus('sending')
    setError(null)
    const { sendMagicLink } = await import('../config/supabase')
    const { error: sendError } = await sendMagicLink(email.trim())
    if (sendError) {
      setError(sendError)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  const handleSignOut = async () => {
    const { signOut } = await import('../config/supabase')
    await signOut()
    // AuthGuard's onAuthStateChange listener clears auth.user, role, and telemetry.
    setTranslationCacheToCloud(false)
    setStatus('idle')
    setEmail('')
  }

  if (!SUPABASE_CONFIG.enabled) {
    return (
      <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
        Enhanced mode not available (Supabase not configured).
      </div>
    )
  }

  // Signed in
  if (user) {
    const roleColors = { enhanced: 'var(--color-blue)', admin: 'var(--color-purple)', owner: 'var(--color-accent)' }
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield size={14} style={{ color: roleColors[userRole] || 'var(--color-dim)' }} />
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${roleColors[userRole] || 'var(--color-dim)'}15`, color: roleColors[userRole] || 'var(--color-dim)' }}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
          <button onClick={handleSignOut} className="text-xs flex items-center gap-1"
            style={{ color: 'var(--color-dim)' }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{user.email}</p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--color-green)' }}>
          Cloud sync active. Cards, writing history, and anonymous telemetry can sync across devices.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
        <Shield size={14} style={{ color: 'var(--color-accent)' }} />
        Unlock Enhanced Mode
      </h4>
      <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>
        Sign in to sync your progress across devices. Enhanced mode also enables XP tracking, streak freezes, and anonymous telemetry to help improve the app.
      </p>

      {status === 'idle' || status === 'error' ? (
        <>
          <div className="flex gap-2">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendLink()}
              className="flex-1 p-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
              placeholder="Your email..." />
            <button onClick={handleSendLink}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-1"
              style={{ background: 'var(--color-accent)' }}>
              <Mail size={14} /> Send Link
            </button>
          </div>
          {error && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--color-red)' }}>
              <XCircle size={12} /> {error}
            </p>
          )}
        </>
      ) : status === 'sending' ? (
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Sending magic link...</p>
      ) : status === 'sent' ? (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-green)' }}>
          <CheckCircle size={14} />
          <span>Magic link sent! Check your email (and spam folder).</span>
        </div>
      ) : null}
    </div>
  )
}
