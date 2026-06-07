// Faithful page render for the PDF Layout View (website-plan (a), Step 2).
//
// Renders each PDF page to a <canvas> on its own WHITE surface (so black-ink
// past-paper diagrams stay visible even in the app's dark theme), lazily: only
// pages near the viewport get a canvas bitmap; the rest are correct-height
// placeholders so the scroll position never jumps. Offscreen pages release their
// bitmap + call page.cleanup() so a 30–50pp paper can't exhaust canvas memory.
//
// Pure geometry (fit/visible-range) lives in ../../lib/pdfLayout.js (unit-tested).
// No overlay yet — the word-token overlay + Select v2 wiring is Step 3.

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { fitToWidthScale, visiblePageRange } from '../../lib/pdfLayout'

const MAX_DPR = 2 // cap render resolution so retina phones don't blow up memory
const PAGE_GAP = 16 // px between stacked pages (matches the reflow space-y-4)
const OVERSCAN = 1 // render this many pages beyond the viewport on each side

export default function LayoutView({ doc }) {
  const containerRef = useRef(null)
  const canvasEls = useRef({}) // pageIndex → <canvas> DOM node
  const renderTasks = useRef({}) // pageIndex → pdf.js RenderTask (cancellable)
  const renderedScale = useRef({}) // pageIndex → the scale we last rendered at

  const [dims, setDims] = useState(null) // [{ width, height }] natural CSS px @ scale 1
  const [containerW, setContainerW] = useState(0)
  const [range, setRange] = useState([0, -1]) // [firstIdx, lastIdx] to render

  const numPages = doc?.numPages ?? 0

  // --- 1. Load every page's natural size once (cheap; no rendering) ---
  useEffect(() => {
    let cancelled = false
    if (!doc) return
    ;(async () => {
      const out = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 1 })
        out.push({ width: vp.width, height: vp.height })
      }
      if (!cancelled) setDims(out)
    })()
    return () => { cancelled = true }
  }, [doc])

  // --- 2. Track the container width (fit-to-width base scale) ---
  // Depends on dims: the measured container only exists once dims load (before
  // that we render the loader, so containerRef.current is null).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setContainerW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [dims])

  // Fit the widest page into the container so no page overflows horizontally.
  const scale = useMemo(() => {
    if (!dims || !containerW) return 0
    return fitToWidthScale(Math.max(...dims.map((d) => d.width)), containerW)
  }, [dims, containerW])

  // Stacked vertical offsets (top of each page) at the current scale, for lazy range.
  const pageOffsets = useMemo(() => {
    if (!dims || !scale) return []
    const offs = []
    let y = 0
    for (let i = 0; i < dims.length; i++) {
      offs.push(y)
      y += dims[i].height * scale + PAGE_GAP
    }
    offs.push(y) // total height (bottom of last page)
    return offs
  }, [dims, scale])

  // --- 3. Recompute the visible page window on scroll / resize ---
  const recomputeRange = useCallback(() => {
    const el = containerRef.current
    if (!el || !pageOffsets.length) return
    const rect = el.getBoundingClientRect()
    const viewTop = Math.max(0, -rect.top)
    const viewportH = window.innerHeight
    const next = visiblePageRange(viewTop, viewportH, pageOffsets, OVERSCAN)
    setRange((prev) => (prev[0] === next[0] && prev[1] === next[1] ? prev : next))
  }, [pageOffsets])

  useEffect(() => {
    recomputeRange()
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(recomputeRange)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [recomputeRange])

  // --- 4. Render in-range pages to canvas (white-fill THEN page.render); release the rest ---
  const renderPage = useCallback(async (i) => {
    const canvas = canvasEls.current[i]
    if (!canvas || !doc || !scale) return
    if (renderedScale.current[i] === scale) return // already crisp at this scale
    renderTasks.current[i]?.cancel?.()
    const page = await doc.getPage(i + 1)
    const viewport = page.getViewport({ scale })
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    const ctx = canvas.getContext('2d')
    // White page surface FIRST so diagrams are visible regardless of app theme.
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    const task = page.render({
      canvasContext: ctx,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
    })
    renderTasks.current[i] = task
    try {
      await task.promise
      renderedScale.current[i] = scale
    } catch {
      // Render cancelled (newer scale / scrolled away) — leave it for the next pass.
    }
  }, [doc, scale])

  const releasePage = useCallback((i) => {
    renderTasks.current[i]?.cancel?.()
    delete renderTasks.current[i]
    delete renderedScale.current[i]
    doc?.getPage(i + 1).then((p) => p.cleanup()).catch(() => {})
  }, [doc])

  // When the visible window or scale changes, render in-range pages and free the rest.
  const [first, last] = range
  useEffect(() => {
    if (!dims) return
    for (let i = 0; i < numPages; i++) {
      if (i >= first && i <= last) renderPage(i)
      else releasePage(i)
    }
  }, [dims, numPages, first, last, scale, renderPage, releasePage])

  // A scale change invalidates every rendered bitmap (re-render at new crispness).
  useEffect(() => {
    renderedScale.current = {}
    recomputeRange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  // Cancel everything on unmount.
  useEffect(() => () => {
    Object.values(renderTasks.current).forEach((t) => t?.cancel?.())
  }, [])

  if (!doc || !dims) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-dim)' }}>
        <Loader2 size={28} className="mx-auto mb-2 animate-spin" style={{ color: 'var(--color-accent)' }} />
        <p className="text-sm font-bold">Rendering pages…</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center" style={{ gap: PAGE_GAP }}>
      {dims.map((d, i) => {
        const w = d.width * scale
        const h = d.height * scale
        const inRange = i >= first && i <= last
        return (
          <div key={i} className="relative shadow-lg" style={{ width: w || '100%' }}>
            {inRange ? (
              <canvas
                ref={(el) => { if (el) canvasEls.current[i] = el; else delete canvasEls.current[i] }}
                style={{ width: w, height: h, display: 'block', background: '#fff' }}
              />
            ) : (
              // Correct-height placeholder so scroll position stays stable.
              <div style={{ width: w, height: h, background: '#fff' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
