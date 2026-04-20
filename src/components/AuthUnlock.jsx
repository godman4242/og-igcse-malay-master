// src/components/AuthUnlock.jsx
// Magic link auth flow — appears in Settings for users wanting Enhanced mode

import { useState, useEffect } from 'react'
import { Mail, CheckCircle, XCircle, LogOut, Shield } from 'lucide-react'
import { sendMagicLink, checkUserRole, getCurrentUser, signOut, onAuthStateChange, initSupabase, SUPABASE_CONFIG } from '../config/supabase'
import { enableCloudTelemetry, disableCloudTelemetry } from '../lib/telemetry'
import useStore from '../store/useStore'

export default function AuthUnlock() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | checking | done | error
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const userRole = useStore(s => s.userRole)
  const setUserRole = useStore(s => s.setUserRole)

  // Check for existing session on mount
  useEffect(() => {
    if (!SUPABASE_CONFIG.enabled) return

    initSupabase().then(async () => {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        const { role } = await checkUserRole(currentUser.email)
        if (role) {
          setUserRole(role)
          enableCloudTelemetry()
          setStatus('done')
        }
      }
    })

    // Listen for auth state changes (magic link callback)
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setStatus('checking')
        const { role, error: roleError } = await checkUserRole(session.user.email)
        if (role) {
          setUserRole(role)
          enableCloudTelemetry()
          setStatus('done')
        } else {
          setError(roleError || 'Your email is not on the allowlist. Contact Kheshav.')
          setStatus('error')
        }
      }
    })

    return () => subscription?.unsubscribe()
  }, [setUserRole])

  const handleSendLink = async () => {
    if (!email.trim()) return
    setStatus('sending')
    setError(null)
    const { error: sendError } = await sendMagicLink(email.trim())
    if (sendError) {
      setError(sendError)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setUserRole('static')
    disableCloudTelemetry()
    setUser(null)
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

  // Signed in and authorized
  if (status === 'done' && user) {
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
          Telemetry active. Your anonymous usage data helps improve the app for everyone.
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
        Enhanced mode enables XP tracking, streak freezes, and helps improve the app through anonymous telemetry.
        Requires an invitation from the app owner.
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
      ) : status === 'checking' ? (
        <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Verifying access...</p>
      ) : null}
    </div>
  )
}
