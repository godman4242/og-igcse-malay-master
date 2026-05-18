import { useState } from 'react'
import { Mail, CheckCircle, X, Sparkles, Shield } from 'lucide-react'
import { sendMagicLink, SUPABASE_CONFIG } from '../config/supabase'
import useStore from '../store/useStore'

export default function AuthModal() {
  const showModal = useStore(s => s.auth?.showModal)
  const hideAuthModal = useStore(s => s.hideAuthModal)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState(null)

  if (!showModal) return null
  if (!SUPABASE_CONFIG.enabled) return null

  const handleClose = () => {
    hideAuthModal()
    setStatus('idle')
    setErrorMsg(null)
  }

  const handleSend = async () => {
    const addr = email.trim()
    if (!addr) return
    setStatus('sending')
    setErrorMsg(null)
    const { error } = await sendMagicLink(addr)
    if (error) {
      setErrorMsg(error)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl p-6 animate-fadeUp"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,77,109,0.08)',
        }}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'var(--color-surface)', color: 'var(--color-dim)' }}
          aria-label="Close sign-in modal"
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255,77,109,0.15), rgba(124,58,237,0.15))',
              border: '1px solid rgba(255,77,109,0.2)',
            }}>
            <Shield size={28} style={{ color: 'var(--color-accent)' }} />
          </div>
        </div>

        {status === 'sent' ? (
          /* ── Success state ── */
          <div className="text-center py-2">
            <CheckCircle size={44} className="mx-auto mb-3" style={{ color: 'var(--color-green)' }} />
            <h2 className="text-lg font-bold mb-2">Check your inbox</h2>
            <p className="text-sm mb-1" style={{ color: 'var(--color-dim)' }}>Magic link sent to</p>
            <p className="text-sm font-bold mb-4" style={{ color: 'var(--color-accent)' }}>{email}</p>
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              Click the link to sign in. If it doesn't arrive in 60 seconds, check your spam folder.
            </p>
          </div>
        ) : (
          /* ── Input state ── */
          <>
            <h2 className="text-xl font-bold text-center mb-1">Save Your Progress</h2>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-dim)' }}>
              Free account · No password · Just a magic link
            </p>

            {/* Feature callout */}
            <div className="flex items-start gap-3 mb-5 p-3 rounded-xl"
              style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)' }}>
              <Sparkles size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-cyan)' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-cyan)' }}>
                Cards, streaks, grammar mastery, and speaking scores sync securely across all your devices.
              </p>
            </div>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="student@email.com"
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm mb-3 outline-none"
              style={{
                background: 'var(--color-surface)',
                border: `1.5px solid ${errorMsg ? 'var(--color-red)' : 'var(--color-border)'}`,
                color: 'var(--color-text)',
              }}
            />

            {errorMsg && (
              <p className="text-xs mb-3" style={{ color: 'var(--color-red)' }}>{errorMsg}</p>
            )}

            <button
              onClick={handleSend}
              disabled={status === 'sending' || !email.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: 'var(--color-accent)',
                opacity: status === 'sending' || !email.trim() ? 0.55 : 1,
              }}
            >
              <Mail size={15} />
              {status === 'sending' ? 'Sending…' : 'Send Magic Link'}
            </button>

            <p className="text-[10px] text-center mt-3" style={{ color: 'var(--color-dim)' }}>
              Your learning data is stored securely. No marketing emails.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
