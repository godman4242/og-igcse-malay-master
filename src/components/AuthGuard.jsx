import { useEffect, useRef } from 'react'
import { initSupabase, pullStateBlob, pushStateBlob, SUPABASE_CONFIG } from '../config/supabase'
import useStore from '../store/useStore'

/**
 * App-level auth listener. Mounts once in App.jsx, invisible — no UI.
 *
 * On SIGNED_IN:
 *  1. Sets auth.user in the store (elevates userRole to 'enhanced').
 *  2. Attempts to pull the cloud JSONB blob.
 *  3. Decides which side wins based on card-count first, timestamp second:
 *     - New account (no cloud data) → push local state to cloud.
 *     - Cloud has materially MORE cards than local → restore cloud (don't lose work).
 *     - Cloud has materially FEWER cards than local → push local (don't let stale device wipe out a fuller deck).
 *     - Cards are roughly equal → tie-break by timestamp (newer wins).
 *
 * On SIGNED_OUT: clears auth.user and reverts to 'static' role.
 */
const CARD_DELTA_THRESHOLD = 5 // ignore differences smaller than this — treat as "equal"

export default function AuthGuard({ children }) {
  const setAuthUser = useStore(s => s.setAuthUser)
  const clearAuthUser = useStore(s => s.clearAuthUser)
  const backupState = useStore(s => s.backupState)
  const subscriptionRef = useRef(null)

  async function handleSignIn(user, isNewLogin) {
    setAuthUser({ id: user.id, email: user.email })

    if (!isNewLogin) return // session restored — no sync needed on every reload

    // Pull cloud blob and decide which data to keep
    try {
      const cloud = await pullStateBlob()

      if (!cloud?.state) {
        // Brand new account — upload the guest's local progress
        await pushStateBlob(useStore.getState())
        return
      }

      const localState = useStore.getState()
      const localCardCount = localState.cards?.length || 0
      const cloudCardCount = cloud.state.cards?.length || 0
      const cardDelta = cloudCardCount - localCardCount
      const cloudMs = new Date(cloud.updated_at).getTime()
      const localMs = localState.lastStudyDate
        ? new Date(localState.lastStudyDate).getTime()
        : 0

      const restoreFromCloud = () => {
        backupState()
        const merged = {
          ...cloud.state,
          auth: { ...cloud.state.auth, user: { id: user.id, email: user.email }, showModal: false },
          userRole: localState.userRole === 'static' ? 'enhanced' : localState.userRole,
        }
        useStore.setState(merged)
      }

      if (cardDelta > CARD_DELTA_THRESHOLD) {
        // Cloud has materially more cards → safe to restore
        restoreFromCloud()
      } else if (cardDelta < -CARD_DELTA_THRESHOLD) {
        // Local has materially more cards → push local (don't let this device wipe out a fuller deck)
        await pushStateBlob(localState)
      } else if (cloudMs > localMs && cloudCardCount > 0) {
        // Card counts are roughly equal → newer wins
        restoreFromCloud()
      } else {
        // Local is newer or equal → push local to cloud
        await pushStateBlob(localState)
      }
    } catch (e) {
      // Sync failure is non-fatal — guest mode keeps working
      console.warn('[AuthGuard] cloud sync error:', e.message)
    }
  }

  useEffect(() => {
    if (!SUPABASE_CONFIG.enabled) return
    let mounted = true

    initSupabase().then(async (client) => {
      if (!client || !mounted) return

      // Restore existing session on cold load (e.g. returning visitor)
      const { data: { session } } = await client.auth.getSession()
      if (session?.user && mounted) {
        await handleSignIn(session.user, false)
      }

      // Listen for future auth state changes (magic link redirect, sign out)
      const { data } = client.auth.onAuthStateChange(async (event, newSession) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' && newSession?.user) {
          await handleSignIn(newSession.user, true)
        } else if (event === 'SIGNED_OUT') {
          clearAuthUser()
        }
      })
      subscriptionRef.current = data?.subscription
    })

    return () => {
      mounted = false
      subscriptionRef.current?.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return children
}
