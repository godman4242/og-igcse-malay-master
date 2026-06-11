import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useStore from '../store/useStore'
import { trackEvent } from '../lib/telemetry'

// The controller, step data, and driver.js are ALL loaded lazily (inside
// start/stop), so this hook — and the always-eager Layout that mounts
// GuideOffer — add nothing to the eager `index` chunk. The whole guide is its
// own chunk that arrives the moment a tour starts.

// useGuide — the thin React seam between the pure guideController and the app.
// Supplies the live `navigate`, telemetry `onEvent`, reduced-motion preference,
// current path, and the theming hook the controller forwards to driver.js.
//
// Theming: driver.js mounts its popover under <body>, OUTSIDE the App's `.light`
// subtree, so `var(--color-*)` would resolve to the dark tokens even in light
// mode. We copy the active token values off the themed app root onto the
// popover element each time it renders — so the .guide-theme CSS resolves
// correctly and tracks the current theme (incl. a mid-tour theme swap on the
// next step). Fully contained here — no global theming change.

const THEME_VARS = [
  '--color-card', '--color-card2', '--color-text', '--color-dim',
  '--color-accent', '--color-accent-subtle', '--color-border', '--color-green',
]

function themePopover(popover) {
  if (typeof document === 'undefined' || !popover?.wrapper) return
  const src = document.querySelector('#root')?.firstElementChild || document.documentElement
  if (!src) return
  const cs = getComputedStyle(src)
  for (const name of THEME_VARS) {
    const value = cs.getPropertyValue(name)
    if (value) popover.wrapper.style.setProperty(name, value.trim())
  }
}

export function useGuide() {
  const navigate = useNavigate()
  const location = useLocation()
  const markGuideSeen = useStore(s => s.markGuideSeen)

  const start = useCallback(async (tierArg) => {
    const tier = tierArg === 'full' ? 'full' : 'quick'
    // Starting a tour from anywhere counts as "seen" so the first-run offer
    // never nags afterwards.
    markGuideSeen(tier)
    const [{ startTour }, { QUICK_TOUR, FULL_TOUR }] = await Promise.all([
      import('../lib/guide/guideController'),
      import('../lib/guide/tourSteps'),
    ])
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return startTour(tier === 'full' ? FULL_TOUR : QUICK_TOUR, {
      tier,
      navigate,
      onEvent: trackEvent,
      getPath: () => location.pathname,
      prefersReducedMotion,
      onPopoverRender: themePopover,
    })
  }, [navigate, location, markGuideSeen])

  const stop = useCallback(async () => {
    const { stopActiveTour } = await import('../lib/guide/guideController')
    stopActiveTour()
  }, [])

  return { start, stop }
}

export default useGuide
