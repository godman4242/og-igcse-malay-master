import { arrowPath } from '../../lib/guide/pointerGeometry'

// The Full Page Guide's animated arrow: a fixed full-viewport SVG that draws a
// curve from the guide box to the spotlighted control, with an arrowhead at the
// control. Decorative (aria-hidden — the popover copy carries the meaning) and
// pointer-events:none so it never blocks clicks. The "draw-on" animation +
// reduced-motion handling live in index.css (.guide-pointer-path). Hosted by
// GuideHud, lazy-loaded.
export default function GuidePointer({ pointer }) {
  if (!pointer || !pointer.box || !pointer.target) return null
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const { path, end, headDeg } = arrowPath(pointer.box, pointer.target, { width: vw, height: vh })
  // A small triangle arrowhead, rotated to the line's heading, positioned at end.
  const head = `${end.x},${end.y} ${end.x - 12},${end.y - 5} ${end.x - 12},${end.y + 5}`
  return (
    <svg className="guide-pointer" aria-hidden="true" width={vw} height={vh}
         viewBox={`0 0 ${vw} ${vh}`}>
      <path className="guide-pointer-path" d={path} fill="none" />
      <polygon className="guide-pointer-head" points={head}
               transform={`rotate(${headDeg} ${end.x} ${end.y})`} />
    </svg>
  )
}
