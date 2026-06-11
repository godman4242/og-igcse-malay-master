import { useEffect, useId, useRef, useState } from 'react'
import { HelpCircle } from 'lucide-react'

/**
 * InfoPreview — a small (?) info icon for jargon-y controls. On TAP (mobile,
 * where hover doesn't exist) and on HOVER (desktop) it opens a popover showing
 * `children` — typically a tiny CSS/SVG mock of what the control does, so a
 * setting that reads like jargon "to a 5-year-old" becomes intuitive.
 *
 * Interaction model decouples hover ("transient") from click ("pinned") so
 * open = hovered || pinned. That makes a desktop mouse-click (which fires a
 * hover-enter first) keep the popover open instead of toggling it shut, while a
 * touch tap (no hover events) simply toggles the pin. Keyboard users activate
 * the native <button> with Enter/Space (= click).
 *
 * a11y: real <button> trigger (focusable); aria-expanded reflects open state;
 * aria-controls points at the panel; Esc closes; an outside pointerdown
 * dismisses. Theme-safe — colours come from CSS custom properties.
 */
export default function InfoPreview({
  label,
  children,
  testId = 'info-preview',
  align = 'center', // popover anchor: 'center' | 'left' | 'right'
  className = '',
}) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned
  const wrapRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const close = () => { setPinned(false); setHovered(false) }
    const onKey = (e) => { if (e.key === 'Escape') close() }
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  // Hover only for real mouse pointers — touch must not auto-open on a stray
  // pointerenter; it relies on the click toggle below.
  const hoverOn = (e) => { if (e.pointerType === 'mouse') setHovered(true) }
  const hoverOff = (e) => { if (e.pointerType === 'mouse') setHovered(false) }

  // Centering uses a negative margin (half of w-64 = 8rem), NOT transform —
  // the animate-fadeUp keyframe ends at `transform: translateY(0)`, which would
  // clobber a translateX(-50%) and let the panel overflow the viewport edge.
  const anchor = align === 'left' ? { left: 0 }
    : align === 'right' ? { right: 0 }
    : { left: '50%', marginLeft: '-8rem' }

  return (
    <span ref={wrapRef} className={`relative inline-flex align-middle ${className}`}
      onPointerEnter={hoverOn} onPointerLeave={hoverOff}>
      <button type="button"
        data-testid={testId}
        aria-label={label ? `What does “${label}” mean?` : 'More info'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPinned(p => !p) }}
        className="inline-flex items-center justify-center rounded-full transition-colors"
        style={{ color: open ? 'var(--color-cyan)' : 'var(--color-dim)', width: 20, height: 20 }}>
        <HelpCircle size={15} />
      </button>
      {open && (
        <div id={panelId} role="tooltip" data-testid={`${testId}-panel`}
          className="absolute top-7 z-50 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl p-3 animate-fadeUp text-left"
          style={{
            ...anchor,
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
          }}>
          {children}
        </div>
      )}
    </span>
  )
}
