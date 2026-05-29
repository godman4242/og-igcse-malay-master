import { useEffect, useRef } from 'react'
import { SUPABASE_CONFIG } from '../config/supabaseConfig'
import { enableCloudTelemetry, disableCloudTelemetry } from '../lib/telemetry'
import useStore from '../store/useStore'

// Fire-and-forget cloud pull — merges per-table data (cards, writing,
// speaking) into the local store via the store's hydrateCloudData action.
// Always runs after sign-in (fresh login OR session restore) so a second
// device picks up cards reviewed on the first device. Safe because the
// merge is key-based (adds missing, never removes), and AuthGuard sits at
// the App root — flipping isHydratingCloud cannot unmount AuthGuard, so the
// old AuthUnlock loop class is impossible from here.
async function pullCloudData() {
  try {
    await useStore.getState().hydrateCloudData()
  } catch (e) {
    console.warn('[AuthGuard] hydrate failed:', e?.message || e)
  }
}

/**
 * App-level auth listener. Mounts once in App.jsx, invisible — no UI.
 *
 * On SIGNED_IN (cold restore OR magic-link callback):
 *  1. Sets auth.user in the store (elevates userRole to 'enhanced').
 *  2. Resolves the real role via checkUserRole (owner/admin promotion).
 *  3. Enables cloud telemetry.
 *  4. On EVERY sign-in (cold restore included), syncs state:
 *     - New account (no cloud data) → push local state to cloud.
 *     - Cloud has materially MORE cards → restore cloud (don't lose work).
 *     - Cloud has materially FEWER cards → push local (don't let stale device wipe out a fuller deck).
 *     - Cards are roughly equal → tie-break by timestamp (newer wins).
 *  The earlier `if (!isNewLogin) return` short-circuit (Round 3, e9b205a) meant
 *  the blob never restored on session restore, so a second device kept its
 *  local (empty) state for everything not in the per-table tables — streak,
 *  XP, settings, identity, dailyChallenge. The newer-wins logic below is the
 *  safety net for unconditional pull.
 *
 * On SIGNED_OUT: clears auth.user, reverts to 'static' role, disables telemetry.
 *
 * Owning all sign-in side effects here is deliberate: AuthGuard sits at the
 * App root and never unmounts. Earlier, a duplicate listener inside the
 * Settings page (AuthUnlock) triggered hydrateCloudData on its mount effect,
 * which flipped isHydratingCloud and unmounted Settings via Layout's spinner
 * swap — an infinite mount/remount loop. See
 * `src/components/__tests__/authUnlock.test.js` for the structural guard.
 */
const CARD_DELTA_THRESHOLD = 5 // ignore differences smaller than this — treat as "equal"

export default function AuthGuard({ children }) {
  const setAuthUser = useStore(s => s.setAuthUser)
  const setUserRole = useStore(s => s.setUserRole)
  const clearAuthUser = useStore(s => s.clearAuthUser)
  const backupState = useStore(s => s.backupState)
  const subscriptionRef = useRef(null)

  async function handleSignIn(user, _isNewLogin, supa) {
    setAuthUser({ id: user.id, email: user.email })

    // Promote admin/owner via the allowlist before any further work.
    // checkUserRole is allowlist-lookup only — no network race with the blob pull.
    try {
      const { role } = await supa.checkUserRole(user.email)
      if (role) setUserRole(role)
    } catch (e) {
      console.warn('[AuthGuard] role check failed:', e.message)
    }

    enableCloudTelemetry(user.id)

    // Always pull per-table data (cards/writing/speaking) so cross-device
    // sync works on session restore too — not only on fresh magic-link
    // logins. Runs in the background.
    pullCloudData()

    // Pull cloud blob and decide which data to keep. Runs on EVERY sign-in
    // (session restore included) so a second device picks up streak / XP /
    // settings / identity / dailyChallenge from the blob — fields that do
    // NOT live in the per-table tables that hydrateCloudData covers above.
    // The newer-wins logic (cardDelta + timestamp) prevents this from wiping
    // a fuller local deck.
    try {
      const cloud = await supa.pullStateBlob()

      if (!cloud?.state) {
        // Brand new account — upload the guest's local progress
        await supa.pushStateBlob(useStore.getState())
        return
      }

      const localState = useStore.getState()
      const localCardCount = localState.cards?.length || 0
      const cloudCardCount = cloud.state.cards?.length || 0
      const cardDelta = cloudCardCount - localCardCount
      const cloudMs = new Date(cloud.updated_at).getTime()
      // Tie-break on lastMutationAt (bumped on every sync-relevant mutation)
      // vs the blob's updated_at — both are "last changed" wall-clocks, so
      // this is apples-to-apples. The old lastStudyDate was a coarse day-string
      // that could read as far older than the blob even when local was current,
      // causing cloud to wrongly overwrite newer local blob-only fields.
      const localMs = localState.lastMutationAt
        ? new Date(localState.lastMutationAt).getTime()
        : 0

      const restoreFromCloud = () => {
        backupState()
        // Re-read live state — pullCloudData() (hydrateCloudData) runs
        // concurrently and may already have merged the deck.
        const live = useStore.getState()
        // Exclude cards / writingHistory / speakingHistory: hydrateCloudData
        // owns those via a key-based UNION (adds missing, never removes).
        // Writing them here too made two async writers race on `cards` with a
        // nondeterministic winner, and could undo the union. The blob's copy
        // is redundant with the per-table tables.
        // Exclude `sync`: pushStateBlob sanitizes the stored blob to
        // `queue: []`, so spreading cloud.state.sync would DROP un-flushed
        // local sync events. Keep the device-local sync slice instead.
        // eslint-disable-next-line no-unused-vars
        const { cards, writingHistory, speakingHistory, sync, ...cloudBlobOnly } = cloud.state
        useStore.setState({
          ...cloudBlobOnly,
          auth: { ...cloud.state.auth, user: { id: user.id, email: user.email }, showModal: false },
          userRole: live.userRole === 'static' ? 'enhanced' : live.userRole,
          sync: live.sync,
        })
      }

      if (cardDelta > CARD_DELTA_THRESHOLD) {
        // Cloud has materially more cards → safe to restore
        restoreFromCloud()
      } else if (cardDelta < -CARD_DELTA_THRESHOLD) {
        // Local has materially more cards → push local (don't let this device wipe out a fuller deck)
        await supa.pushStateBlob(localState)
      } else if (cloudMs > localMs && cloudCardCount > 0) {
        // Card counts are roughly equal → newer wins
        restoreFromCloud()
      } else {
        // Local is newer or equal → push local to cloud
        await supa.pushStateBlob(localState)
      }
    } catch (e) {
      // Sync failure is non-fatal — guest mode keeps working
      console.warn('[AuthGuard] cloud sync error:', e.message)
    }
  }

  useEffect(() => {
    if (!SUPABASE_CONFIG.enabled) return
    let mounted = true

    ;(async () => {
      // Defer supabase.js until cold-load critical path is done. Until this
      // chunk lands the user is in guest mode — the auth pill in the header
      // shows "Save" and reflects the unauthenticated state.
      const supa = await import('../config/supabase')
      if (!mounted) return
      const client = await supa.initSupabase()
      if (!client || !mounted) return

      // Restore existing session on cold load (e.g. returning visitor)
      const { data: { session } } = await client.auth.getSession()
      if (session?.user && mounted) {
        await handleSignIn(session.user, false, supa)
      }

      // Listen for future auth state changes (magic link redirect, sign out)
      const { data } = client.auth.onAuthStateChange(async (event, newSession) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' && newSession?.user) {
          await handleSignIn(newSession.user, true, supa)
        } else if (event === 'SIGNED_OUT') {
          clearAuthUser()
          disableCloudTelemetry()
        }
      })
      subscriptionRef.current = data?.subscription
    })()

    return () => {
      mounted = false
      subscriptionRef.current?.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return children
}
