// src/lib/useFocusTrap.js
//
// Reusable dialog focus trap (spec §6, D9). First consumer: SearchModal.
//
//  1. on `active`: remembers the trigger (document.activeElement) and moves
//     focus into the dialog — unless something inside (e.g. an autoFocus
//     input) already has it
//  2. Tab / Shift+Tab wrap first ↔ last within the dialog's focusables
//  3. Escape → onClose()
//  4. on deactivate/unmount: focus returns to the trigger
//
// Deliberately ~40 lines (YAGNI): no sentinel nodes, no aria-hidden fencing
// of the rest of the page — aria-modal="true" on the consumer covers that.

import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(ref, { active, onClose }) {
  // Keep the latest onClose without re-arming the trap when its identity
  // changes (callers often pass inline arrows).
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return
    const trigger = document.activeElement

    if (!node.contains(document.activeElement)) {
      const first = node.querySelector(FOCUSABLE)
      ;(first || node).focus?.()
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = node.querySelectorAll(FOCUSABLE)
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === first || !node.contains(current))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }

    // Capture phase so the trap sees the key before any inner stopPropagation.
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      trigger?.focus?.()
    }
  }, [active, ref])
}
