import { useSyncExternalStore, lazy, Suspense } from 'react'
import { subscribeGuideState, getGuideState } from '../../lib/guide/guideState'
import FeedbackLive from '../FeedbackLive'

// Always mounted in Layout, but cheap in the eager path: it subscribes to the
// tiny guideState observable and renders null until needed. The dock-zone overlay
// (Phase 2) and the page-guide arrow (Phase 3) are both lazy-imported so their
// bytes only land when used — the controller + driver.js stay in their own lazy
// chunk. Announcements reuse the shared polite live region (FeedbackLive) for
// WCAG 4.1.3 parity.
const GuideDockZones = lazy(() => import('./GuideDockZones'))
const GuidePointer = lazy(() => import('./GuidePointer'))

export default function GuideHud() {
  const state = useSyncExternalStore(subscribeGuideState, getGuideState, getGuideState)
  return (
    <>
      <FeedbackLive text={state.announce} />
      {state.dragging && (
        <Suspense fallback={null}>
          <GuideDockZones activeZone={state.zone} />
        </Suspense>
      )}
      {state.pointer && state.pointer.target && (
        <Suspense fallback={null}>
          <GuidePointer pointer={state.pointer} />
        </Suspense>
      )}
    </>
  )
}
