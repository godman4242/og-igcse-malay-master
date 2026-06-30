import { useCallback, useRef } from 'react'
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
  '--color-on-bright', // primary-button label color (P1/G3 — #000 dark / #fff light)
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

  // The in-box ▶ "go deeper" button drops out of any running tour into the Full
  // Page Guide for the current route. Both start() and startPage() wire it to
  // the SAME startPage via this ref — a ref (not a direct call) so neither
  // useCallback depends on the other (no cycle, no exhaustive-deps churn).
  const startPageRef = useRef(null)

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
      onGoDeeper: (route) => startPageRef.current?.(route),
    })
  }, [navigate, location, markGuideSeen])

  // startPage — the Full Page Guide (Phase 3): a per-page deep dive on the
  // CURRENT route. Reuses the tour engine with tier:'page' and steps all stamped
  // with the same route, so the controller never navigates — it just spotlights
  // each control with the animated arrow. Controller + pageGuides are lazy.
  const startPage = useCallback(async (route) => {
    const path = route || location.pathname
    const [{ startTour }, { buildPageSteps }] = await Promise.all([
      import('../lib/guide/guideController'),
      import('../lib/guide/pageGuides'),
    ])
    const steps = buildPageSteps(path)
    if (!steps.length) return null
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return startTour(steps, {
      tier: 'page',
      navigate,
      onEvent: trackEvent,
      getPath: () => location.pathname,
      prefersReducedMotion,
      onPopoverRender: themePopover,
      onGoDeeper: (r) => startPageRef.current?.(r),
    })
  }, [navigate, location])

  // Keep the ref pointing at the latest startPage so the go-deeper closures
  // above always call the current one (deps capture navigate/location).
  startPageRef.current = startPage

  const stop = useCallback(async () => {
    const { stopActiveTour } = await import('../lib/guide/guideController')
    stopActiveTour()
  }, [])

  return { start, stop, startPage }
}

export default useGuide
