// Faithful page render + invisible word-token overlay for the PDF Layout View
// (website-plan (a), Steps 2–3).
//
// Render: each page → <canvas> on its own WHITE surface (black-ink past-paper
// diagrams stay visible even in the app's dark theme), lazily — only pages near
// the viewport hold a bitmap; the rest are correct-height placeholders so scroll
// never jumps. Offscreen pages release their bitmap + page.cleanup() so a 30–50pp
// paper can't exhaust canvas memory.
//
// Overlay: for each rendered page, each text item → itemRect → per-word rects →
// a TRANSPARENT <span data-token-i={globalIdx}> over the canvas. ONE global token
// index across all pages (buildPageTokenModel) so Select v2's index math
// (selection / selIdx highlight / group) matches the reflow view. The selection
// hook (in PDFReader) hit-tests by coordinates, so it works over this overlay
// unchanged. Scanned/image-only pages have no text items → a "no selectable text"
// note instead of an overlay.
//
// Pure geometry lives in ../../lib/pdfLayout.js (unit-tested).

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import {
  fitToWidthScale, visiblePageRange, itemRect, splitItemIntoWordRects, buildPageTokenModel,
} from '../../lib/pdfLayout'

const MAX_DPR = 2 // cap render resolution so retina phones don't blow up memory
const PAGE_GAP = 16 // px between stacked pages (matches the reflow space-y-4)
const OVERSCAN = 1 // render this many pages beyond the viewport on each side

const EMPTY_SEL = new Map()

export default function LayoutView({ doc, onTokens, selIdx }) {
  const containerRef = useRef(null)
  const canvasEls = useRef({}) // pageIndex → <canvas> DOM node
  const renderTasks = useRef({}) // pageIndex → pdf.js RenderTask (cancellable)
  const renderedScale = useRef({}) // pageIndex → the scale we last rendered at

  // model: { dims:[{width,height,transform1}], pages:[{items,wordCount}], tokens }
  const [model, setModel] = useState(null)
  const [containerW, setContainerW] = useState(0)
  const [range, setRange] = useState([0, -1]) // [firstIdx, lastIdx] to render

  const dims = model?.dims
  const sel = selIdx || EMPTY_SEL

  // --- 1. Load page sizes + text items once; build the global token model ---
  useEffect(() => {
    let cancelled = false
    if (!doc) { setModel(null); return }
    ;(async () => {
      const d = []
      const pagesItems = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp = page.getViewport({ scale: 1 })
        d.push({ width: vp.width, height: vp.height, transform1: vp.transform })
        const tc = await page.getTextContent({ includeMarkedContent: false })
        const items = (tc.items || [])
          .filter((it) => typeof it.str === 'string')
          .map((it) => ({ str: it.str, transform: it.transform, width: it.width, height: it.height }))
        pagesItems.push(items)
      }
      if (cancelled) return
      const tm = buildPageTokenModel(pagesItems)
      setModel({ dims: d, pages: tm.pages, tokens: tm.tokens })
    })()
    return () => { cancelled = true }
  }, [doc])

  // Lift the flat token list so PDFReader's selection machinery can slice it.
  useEffect(() => { if (model) onTokens?.(model.tokens) }, [model, onTokens])

  // --- 2. Track the container width (fit-to-width base scale). Depends on model:
  // the measured container only exists once the model loads (loader before that). ---
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setContainerW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [model])

  // Fit the widest page into the container so no page overflows horizontally.
  const scale = useMemo(() => {
    if (!dims || !containerW) return 0
    return fitToWidthScale(Math.max(...dims.map((p) => p.width)), containerW)
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
    offs.push(y)
    return offs
  }, [dims, scale])

  // --- 3. Recompute the visible page window on scroll / resize ---
  const recomputeRange = useCallback(() => {
    const el = containerRef.current
    if (!el || !pageOffsets.length) return
    const rect = el.getBoundingClientRect()
    const viewTop = Math.max(0, -rect.top)
    const next = visiblePageRange(viewTop, window.innerHeight, pageOffsets, OVERSCAN)
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

  // --- 4. Render in-range pages to canvas (white-fill THEN page.render); release rest ---
  const renderPage = useCallback(async (i) => {
    const canvas = canvasEls.current[i]
    if (!canvas || !doc || !scale) return
    if (renderedScale.current[i] === scale) return
    renderTasks.current[i]?.cancel?.()
    const page = await doc.getPage(i + 1)
    const viewport = page.getViewport({ scale })
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    const ctx = canvas.getContext('2d')
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
      // cancelled (newer scale / scrolled away) — left for the next pass
    }
  }, [doc, scale])

  const releasePage = useCallback((i) => {
    renderTasks.current[i]?.cancel?.()
    delete renderTasks.current[i]
    delete renderedScale.current[i]
    doc?.getPage(i + 1).then((p) => p.cleanup()).catch(() => {})
  }, [doc])

  const [first, last] = range
  useEffect(() => {
    if (!dims) return
    for (let i = 0; i < dims.length; i++) {
      if (i >= first && i <= last) renderPage(i)
      else releasePage(i)
    }
  }, [dims, first, last, scale, renderPage, releasePage])

  // A scale change invalidates every rendered bitmap (re-render at new crispness).
  useEffect(() => {
    renderedScale.current = {}
    recomputeRange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  useEffect(() => () => {
    Object.values(renderTasks.current).forEach((t) => t?.cancel?.())
  }, [])

  // Per-page word rects (transparent overlay spans), derived from the page's text
  // items at the current scale. Only built for in-range pages (cheap, no DOM here).
  const overlayFor = useCallback((i) => {
    if (!model || !dims || !scale) return []
    const vpT = dims[i].transform1.map((x) => x * scale)
    const out = []
    for (const item of model.pages[i].items) {
      const rect = itemRect(vpT, item.transform, item.width, item.height)
      const words = splitItemIntoWordRects(rect, item.str)
      for (let j = 0; j < words.length; j++) {
        out.push({ ...words[j], gi: item.startIndex + j })
      }
    }
    return out
  }, [model, dims, scale])

  if (!doc || !model) {
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
        const noText = model.pages[i].wordCount === 0
        return (
          <div key={i} className="relative shadow-lg" style={{ width: w || '100%' }}>
            {inRange ? (
              <canvas
                ref={(el) => { if (el) canvasEls.current[i] = el; else delete canvasEls.current[i] }}
                style={{ width: w, height: h, display: 'block', background: '#fff' }}
              />
            ) : (
              <div style={{ width: w, height: h, background: '#fff' }} />
            )}

            {/* Transparent word-token overlay (only for rendered pages with text). */}
            {inRange && !noText && (
              <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                {overlayFor(i).map((wr) => {
                  const t = sel.get(wr.gi)
                  const isPhrase = t === 'phrase'
                  return (
                    <span
                      key={wr.gi}
                      data-token-i={wr.gi}
                      title={isPhrase ? 'grouped phrase' : t ? 'selected word' : undefined}
                      aria-label={isPhrase ? 'grouped phrase' : t ? 'selected word' : undefined}
                      className="absolute rounded-sm cursor-pointer"
                      style={{
                        left: wr.left, top: wr.top, width: wr.width, height: wr.height,
                        pointerEvents: 'auto',
                        background: t
                          ? (isPhrase ? 'color-mix(in srgb, var(--color-purple) 38%, transparent)' : 'color-mix(in srgb, var(--color-accent) 32%, transparent)')
                          : 'transparent',
                        borderBottom: isPhrase ? '2px solid var(--color-purple)' : undefined,
                      }}
                    />
                  )
                })}
              </div>
            )}

            {/* Scanned / image-only page: no selectable text. */}
            {inRange && noText && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-bold"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', pointerEvents: 'none' }}>
                No selectable text on this page
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
