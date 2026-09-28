import { useSyncExternalStore, lazy, Suspense } from 'react'
import { subscribeGuideState, getGuideState } from '../../lib/guide/guideState'
import FeedbackLive from '../FeedbackLive'

// Always mounted in Layout, but cheap in the eager path: it subscribes to the
// tiny guideState observable and renders null until needed. The dock-zone overlay
// (Phase 2) is lazy-imported so its bytes only land when used — the controller + driver.js stay in their own lazy
// chunk. Announcements reuse the shared polite live region (FeedbackLive) for
// WCAG 4.1.3 parity.
const GuideDockZones = lazy(() => import('./GuideDockZones'))

// Tpause★ — when the tour is paused AND not docked, the popover box is hidden by
// CSS, so this lone pill is the one way to bring the guide back. The controller
// chunk is already loaded while a tour runs, so the dynamic import resolves
// instantly from cache and adds nothing to the eager `index` bundle.
function resumePausedTour() {
  import('../../lib/guide/guideController').then((m) => m.resumeActiveTour?.())
}

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
      {state.paused && !state.docked && (
        <button
          type="button"
          className="guide-resume-fab"
          aria-label="Resume the guided tour"
          onClick={resumePausedTour}
        >
          ▶ Resume tour
        </button>
      )}
    </>
  )
}
