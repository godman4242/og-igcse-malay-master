import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { hasUserOpenRouterKey } from '../lib/openrouter'
import { shouldShowAddKeyNudge } from '../lib/addKeyNudge'
import { trackEvent } from '../lib/telemetry'

// BYOK "add your own key" nudge — the way forward at an AI dead-end.
// Rendered only inside an already-AI-unavailable branch, so aiUnavailable is
// true at the call site; it self-hides for users who already have a key.
// Design: docs/superpowers/specs/2026-05-31-add-key-nudge-design.md
//
// Copy is a verb+object CTA that echoes the Settings field label ("…your own
// AI key") so it's recognised on arrival. Deep-links to /settings#byok, where
// Settings scrolls to and focuses the key input (recognition over recall).
export default function AddKeyNudge({ surface, message }) {
  const navigate = useNavigate()
  const show = shouldShowAddKeyNudge(true, hasUserOpenRouterKey())

  useEffect(() => {
    if (!show) return
    trackEvent('add_key_nudge_shown', { surface })
    // Once per mount — matches spec §Telemetry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!show) return null

  const label = message || 'Add your own free key to keep AI going →'

  const onClick = () => {
    trackEvent('add_key_nudge_clicked', { surface })
    navigate('/settings#byok')
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2 text-left"
      style={{
        background: 'rgba(255,145,0,0.08)',
        border: '1px solid rgba(255,145,0,0.25)',
        color: 'var(--color-orange)',
        minHeight: 44,
      }}
    >
      <KeyRound size={14} className="flex-shrink-0" aria-hidden={true} />
      <span>{label}</span>
    </button>
  )
}
