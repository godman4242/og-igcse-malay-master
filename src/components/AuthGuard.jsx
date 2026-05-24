import { useEffect, useRef } from 'react'
import { initSupabase, pullStateBlob, pushStateBlob, SUPABASE_CONFIG } from '../config/supabase'
import useStore from '../store/useStore'

/**
 * App-level auth listener. Mounts once in App.jsx, invisible — no UI.
 *
 * On SIGNED_IN:
 *  1. Sets auth.user in the store (elevates userRole to 'enhanced').
 *  2. Attempts to pull the cloud JSONB blob.
 *  3. Compares cloud vs local timestamps — newer wins.
 *     - New account (no cloud data) → push local state to cloud.
 *     - Cloud newer → backup local, restore from cloud.
 *     - Local newer → push local to cloud.
 *
 * On SIGNED_OUT: clears auth.user and reverts to 'static' role.
 */
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

      // Compare timestamps: cloud.updated_at vs local lastStudyDate
      const cloudMs = new Date(cloud.updated_at).getTime()
      const localState = useStore.getState()
      const localMs = localState.lastStudyDate
        ? new Date(localState.lastStudyDate).getTime()
        : 0

      if (cloudMs > localMs && cloud.state.cards?.length > 0) {
        // Cloud is demonstrably newer — restore it (backup local first)
        backupState()
        // Merge auth into cloud state so sign-in persists
        const merged = {
          ...cloud.state,
          auth: { ...cloud.state.auth, user: { id: user.id, email: user.email }, showModal: false },
          userRole: localState.userRole === 'static' ? 'enhanced' : localState.userRole,
        }
        useStore.setState(merged)
      } else {
        // Local is newer or equal — push local to cloud
        await pushStateBlob(useStore.getState())
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
