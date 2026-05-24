import { useState } from 'react'
import { Mail, CheckCircle, X, Sparkles, Shield } from 'lucide-react'
import { sendMagicLink, signInWithGoogle, SUPABASE_CONFIG } from '../config/supabase'
import useStore from '../store/useStore'

export default function AuthModal() {
  const showModal = useStore(s => s.auth?.showModal)
  const hideAuthModal = useStore(s => s.hideAuthModal)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  if (!showModal) return null
  if (!SUPABASE_CONFIG.enabled) return null

  const handleClose = () => {
    hideAuthModal()
    setStatus('idle')
    setErrorMsg(null)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    if (error) {
      setErrorMsg(error)
      setGoogleLoading(false)
    }
    // On success Supabase redirects — component unmounts
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

            {/* Google OAuth — primary path */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading || status === 'sending'}
              className="w-full flex items-center justify-center gap-3 rounded-xl py-3 mb-3 text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)',
                opacity: googleLoading ? 0.7 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <span className="text-xs" style={{ color: 'var(--color-dim)' }}>or use email</span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
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
