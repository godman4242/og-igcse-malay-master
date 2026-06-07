// Pure layout geometry for the PDF Layout View (website-plan (a)).
//
// No DOM and no pdf.js objects live here — the LayoutView component does the
// pdf.js work (getViewport / render / getTextContent) and feeds these functions
// plain numbers, so all the fiddly transform math is unit-testable in isolation.
//
// Coordinate model: pdf.js gives a page `viewport.transform` (a 6-element 2×3
// affine matrix mapping PDF user space → CSS px, with rotation already folded in)
// and, per text item, an `item.transform` (text space → user space, carrying the
// font size) plus `item.width`/`item.height` in user-space units. Composing the
// two lands a text item on the rendered canvas.

/**
 * Compose two 2×3 affine transforms, same convention as pdf.js `Util.transform`.
 * For V=[a,b,c,d,e,f] and I=[a',b',c',d',e',f'] returns V∘I.
 */
export function multiplyTransform(v, i) {
  return [
    v[0] * i[0] + v[2] * i[1],
    v[1] * i[0] + v[3] * i[1],
    v[0] * i[2] + v[2] * i[3],
    v[1] * i[2] + v[3] * i[3],
    v[0] * i[4] + v[2] * i[5] + v[4],
    v[1] * i[4] + v[3] * i[5] + v[5],
  ]
}

/**
 * Map a text item to a CSS-px rectangle over the rendered page canvas.
 * @param {number[]} viewportTransform - page viewport.transform (6 elems)
 * @param {number[]} itemTransform - item.transform (6 elems)
 * @param {number} width - item.width (user-space units)
 * @param {number} height - item.height (user-space units)
 * @returns {{left:number, top:number, width:number, height:number}}
 */
export function itemRect(viewportTransform, itemTransform, width, height) {
  const tx = multiplyTransform(viewportTransform, itemTransform)
  // Device-space scale factors of the viewport (rotation-safe).
  const scaleX = Math.hypot(viewportTransform[0], viewportTransform[1])
  const scaleY = Math.hypot(viewportTransform[2], viewportTransform[3])
  // Font height in device space — the baseline sits at tx[5], so the box top is
  // lifted by the ascent (≈ device font height) to cover the glyphs above it.
  const ascent = Math.hypot(tx[2], tx[3])
  return {
    left: tx[4],
    top: tx[5] - ascent,
    width: width * scaleX,
    height: height * scaleY,
  }
}

/**
 * Split an item rect into one rect per whitespace-delimited word, sized by the
 * word's character span (proportional char-width). Runs of spaces collapse (no
 * empty rects), and the proportional positions still leave room for the gap.
 * @returns {Array<{word:string, left:number, top:number, width:number, height:number}>}
 */
export function splitItemIntoWordRects(rect, str) {
  const out = []
  const total = str.length
  if (total === 0) return out
  const re = /\S+/g
  let m
  while ((m = re.exec(str)) !== null) {
    const start = m.index
    const len = m[0].length
    out.push({
      word: m[0],
      left: rect.left + (start / total) * rect.width,
      top: rect.top,
      width: (len / total) * rect.width,
      height: rect.height,
    })
  }
  return out
}

/**
 * Assign a single GLOBAL word index across every page's text items, so the
 * layout overlay shares the index semantics the reflow selection machinery uses
 * (selection / selIdx / tokensSlice). Each item records the global index of its
 * first word (startIndex) so the rendered word rects (from splitItemIntoWordRects,
 * same \S+ order) map back to global indices.
 * @param {Array<Array<{str:string, transform:number[], width:number, height:number}>>} pagesItems
 * @returns {{ tokens: Array<{word:string, i:number}>,
 *             pages: Array<{ items: Array<{str,transform,width,height,startIndex:number}>, wordCount:number }> }}
 */
export function buildPageTokenModel(pagesItems) {
  const tokens = []
  const pages = []
  let gi = 0
  for (const items of pagesItems) {
    const pageItems = []
    let wordCount = 0
    for (const it of items) {
      const words = it.str.match(/\S+/g) || []
      pageItems.push({
        str: it.str,
        transform: it.transform,
        width: it.width,
        height: it.height,
        startIndex: gi,
      })
      for (const w of words) {
        tokens.push({ word: w, i: gi })
        gi++
        wordCount++
      }
    }
    pages.push({ items: pageItems, wordCount })
  }
  return { tokens, pages }
}

/** Scale that fits a page (natural CSS px at scale 1) into the container width. */
export function fitToWidthScale(pageWidthPx, containerWidthPx) {
  if (!(pageWidthPx > 0)) return 1
  return containerWidthPx / pageWidthPx
}

/** Clamp a scale into [min, max]. */
export function clampScale(scale, { min, max }) {
  return Math.min(max, Math.max(min, scale))
}

/**
 * Double-tap target scale: if we're sitting near fit, zoom in to ~2×fit;
 * otherwise (already zoomed in some) snap back to fit.
 */
export function doubleTapNextScale(current, fit) {
  const nearFit = Math.abs(current - fit) <= fit * 0.05
  return nearFit ? fit * 2 : fit
}

/**
 * Which page indices to render for a given scroll position.
 * @param {number} scrollTop
 * @param {number} viewportH
 * @param {number[]} pageOffsets - length n+1; pageOffsets[i] = top of page i,
 *   pageOffsets[n] = total stacked height.
 * @param {number} [overscan=1] - extra pages to render on each side.
 * @returns {[number, number]} [firstIdx, lastIdx]; [0,-1] when nothing is visible.
 */
export function visiblePageRange(scrollTop, viewportH, pageOffsets, overscan = 1) {
  const n = pageOffsets.length - 1
  if (n <= 0) return [0, -1]
  const viewTop = scrollTop
  const viewBottom = scrollTop + viewportH
  let first = -1
  let last = -1
  for (let i = 0; i < n; i++) {
    const top = pageOffsets[i]
    const bottom = pageOffsets[i + 1]
    if (bottom > viewTop && top < viewBottom) {
      if (first === -1) first = i
      last = i
    }
  }
  if (first === -1) return [0, -1]
  const clamp = (x) => Math.min(n - 1, Math.max(0, x))
  return [clamp(first - overscan), clamp(last + overscan)]
}
