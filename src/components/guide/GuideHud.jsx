import { useSyncExternalStore, lazy, Suspense } from 'react'
import { subscribeGuideState, getGuideState } from '../../lib/guide/guideState'
import FeedbackLive from '../FeedbackLive'

// Always mounted in Layout, but cheap in the eager path: it subscribes to the
// tiny guideState observable and renders null until a drag begins. The dock-zone
// overlay is lazy-imported so its (and dragDock's) bytes only land when needed —
// the controller + driver.js stay in their own lazy chunk. Announcements reuse
// the shared polite live region (FeedbackLive) for WCAG 4.1.3 parity.
const GuideDockZones = lazy(() => import('./GuideDockZones'))

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
    </>
  )
}
