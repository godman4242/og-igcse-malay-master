// popoverDecorations.js — injects the guide popover's extra controls:
//   • a Pause/Resume toggle (enter/leave Explore mode)
//   • a tap-to-jump progress counter ("4 of 22" → type a number → jump)
//   • a drag grip (Phase 2) + the in-box ▶ "go deeper" button (Phase 3b)
// Pure DOM, no React/store — mirrors the onPopoverRender DOM-injection pattern
// already used for theming. Called per step render by guideController's wrapper.
// Idempotent: guards stop a second button/input if driver re-renders the popover.

export function decoratePopover(popover, {
  mode = 'spotlight',
  current = 1,
  total = 1,
  onTogglePause,
  onJump,
  onDragStart,
  onDock,
  onRestore,
  onResizeStart,
  onResizeKey,
  docked = null,
  canGoDeeper = false,
  onGoDeeper = null,
} = {}) {
  if (!popover) return
  addPauseButton(popover, mode, onTogglePause)
  makeProgressJumpable(popover, current, total, onJump)
  addDragHandle(popover, { onDragStart, onDock, docked })
  addResizeHandle(popover, { onResizeStart, onResizeKey })
  syncGoDeeper(popover, canGoDeeper && typeof onGoDeeper === 'function' ? onGoDeeper : null)
  wireRestoreOnDblClick(popover, onRestore)
  splitFooterLabels(popover)
}

// Double-click to restore (Phase 3b★ / T6 / R5d). When the box is docked/
// minimized it no longer re-expands on hover (T2★ — persistent icons), so a
// DOUBLE-CLICK on the box returns it to the default centred position. Wired once
// per popover (idempotent via a wrapper dataset flag) since driver reuses the
// same wrapper across step renders. Double-clicks that land on an ACTION control
// (Next/Back/Done/Pause/▶/the N-of-M jumper) are ignored so a fast double-tap on
// a button never also yanks the box back to centre — the move-grip and the box
// body remain valid restore surfaces.
const RESTORE_IGNORE = [
  '.driver-popover-next-btn',
  '.driver-popover-prev-btn',
  '.driver-popover-close-btn',
  '.guide-pause-btn',
  '.guide-go-deeper',
  '.guide-progress-jump',
  '.guide-progress-input',
  '.guide-resize-handle',   // Tresize★ — a dbl-tap on the resize grip must not yank the box to centre
].join(',')

function wireRestoreOnDblClick(popover, onRestore) {
  if (typeof onRestore !== 'function') return
  const host = popover.wrapper
  if (!host || typeof host.addEventListener !== 'function') return
  if (host.dataset && host.dataset.guideRestoreWired) return
  if (host.dataset) host.dataset.guideRestoreWired = '1'
  host.addEventListener('dblclick', (e) => {
    if (e.target?.closest?.(RESTORE_IGNORE)) return // don't fight an action control
    onRestore()
  })
}

// Minimize-to-icons (Phase 3b / R4 / T2): split each footer control's
// "icon + word" text into a `.guide-btn-ico` span + a `.guide-btn-label` span,
// so CSS can collapse the box to ICONS ONLY when it is docked (labels return on
// hover/focus). Pure DOM, idempotent. driver.js recreates its Back/Next/Done
// buttons each render and resets the Pause button's text on a toggle — both wipe
// the spans — so we re-run this every decorate (and the controller re-runs
// `splitButtonIconLabel` after a pause toggle).
export function splitFooterLabels(popover) {
  const host = popover.footerButtons || popover.footer || popover.wrapper
  if (!host || typeof host.querySelectorAll !== 'function') return
  host.querySelectorAll('button').forEach(splitButtonIconLabel)
}

// Split ONE button's text into icon + label spans, order-preserved, with the
// separating space tucked INSIDE the label span so hiding the label hides the
// gap too. A pure-icon (no word) or pure-word (no symbol) button is left alone.
export function splitButtonIconLabel(btn) {
  if (!btn || typeof btn.querySelector !== 'function') return
  if (btn.querySelector('.guide-btn-label')) return // already split
  const raw = (btn.textContent || '').replace(/\s+/g, ' ').trim()
  if (!raw) return
  const tokens = raw.split(' ')
  const isWord = (t) => /\p{L}/u.test(t)
  const labelText = tokens.filter(isWord).join(' ')
  const iconText = tokens.filter((t) => !isWord(t)).join(' ')
  if (!labelText || !iconText) return // nothing to collapse

  const iconFirst = !isWord(tokens[0])
  const icon = document.createElement('span')
  icon.className = 'guide-btn-ico'
  icon.textContent = iconText
  const label = document.createElement('span')
  label.className = 'guide-btn-label'
  label.textContent = iconFirst ? ' ' + labelText : labelText + ' '

  btn.textContent = ''
  if (iconFirst) btn.append(icon, label)
  else btn.append(label, icon)

  // Icon-only buttons need an accessible name when docked. Driver's nav buttons
  // have none → give them the word; never clobber a richer existing label (the
  // Pause button's "…explore the page").
  if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', labelText)
}

// The header controls row (drag grip + the in-box ▶ "go deeper" button) sits at
// the very top of the popover. Created once, idempotent. The grip fills the row
// (flex:1 via CSS) so a lone grip looks identical to the pre-3b grab bar.
function headerControls(popover) {
  const host = popover.wrapper
  if (!host || typeof host.querySelector !== 'function') return null
  let row = host.querySelector('.guide-header-controls')
  if (!row) {
    row = document.createElement('div')
    row.className = 'guide-header-controls'
    host.insertBefore(row, host.firstChild)
  }
  return row
}

function addPauseButton(popover, mode, onTogglePause) {
  const host = popover.footerButtons || popover.footer || popover.wrapper
  if (!host || host.querySelector?.('.guide-pause-btn')) return
  const explore = mode === 'explore'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'guide-pause-btn'
  btn.textContent = explore ? '▶ Resume' : '⏸ Pause'
  btn.setAttribute('aria-label', explore ? 'Resume the guided tour' : 'Pause the tour to explore the page')
  btn.setAttribute('aria-pressed', String(explore))
  btn.addEventListener('click', (e) => { e.preventDefault(); onTogglePause?.() })
  host.insertBefore(btn, host.firstChild)
}

function makeProgressJumpable(popover, current, total, onJump) {
  const prog = popover.progress
  if (!prog || prog.querySelector?.('.guide-progress-jump')) return
  prog.textContent = ''

  const jump = document.createElement('button')
  jump.type = 'button'
  jump.className = 'guide-progress-jump'
  jump.textContent = String(current)
  jump.setAttribute('aria-label', `Step ${current} of ${total}. Tap to jump to a step.`)

  const rest = document.createElement('span')
  rest.textContent = ` of ${total}`
  prog.append(jump, rest)

  jump.addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'number'
    input.min = '1'
    input.max = String(total)
    input.value = String(current)
    input.className = 'guide-progress-input'
    input.setAttribute('aria-label', `Jump to step (1 to ${total})`)
    jump.replaceWith(input)
    input.focus()
    input.select?.()

    const commit = () => {
      const n = Math.round(Number(input.value))
      if (Number.isFinite(n) && n >= 1 && n <= total) onJump?.(n)
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit() }
      else if (e.key === 'Escape') { e.preventDefault(); input.replaceWith(jump) }
    })
    input.addEventListener('blur', commit)
  })
}

// Drag grip (Phase 2). Pointer drag → onDragStart; keyboard parity → arrow keys
// dock to the 4 edges (press the same edge's arrow again to float — the toggle
// lives in the controller). Escape is left to driver.js (exits the tour). Corners
// are a pointer-only nicety. The impure drag loop + geometry live in
// guideController/dragDock — this only wires the handle's intents. Idempotent: a
// second render won't add a second handle.
function addDragHandle(popover, { onDragStart, onDock, docked }) {
  const row = headerControls(popover)
  if (!row || row.querySelector('.guide-drag-handle')) return
  const handle = document.createElement('button')
  handle.type = 'button'
  handle.className = 'guide-drag-handle'
  handle.textContent = '⠿'
  handle.setAttribute(
    'aria-label',
    'Move guide. Drag to reposition, or press arrow keys to dock to an edge (same arrow again to float).',
  )
  handle.setAttribute('aria-pressed', String(!!docked))
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    onDragStart?.(e)
  })
  handle.addEventListener('keydown', (e) => {
    const map = { ArrowUp: 'top', ArrowDown: 'bottom', ArrowLeft: 'left', ArrowRight: 'right' }
    if (map[e.key]) {
      e.preventDefault()
      e.stopPropagation() // don't let driver scroll / re-key
      onDock?.(map[e.key])
    }
  })
  row.appendChild(handle)
}

// Resize grip (Phase 3b★ / Tresize★ — PowerPoint-style resize). A small corner
// handle at the bottom-right of the popover: pointer-drag → onResizeStart (the
// impure resize loop + clampBoxSize live in guideController/dragDock, mirroring
// the drag grip); arrow keys → onResizeKey(dw, dh) for keyboard/switch parity
// (Right/Down grow, Left/Up shrink). Idempotent: a second render won't add a
// second grip. The impure handlers stopPropagation so a resize never also starts
// the move-drag or (via the wrapper dblclick) the restore.
const RESIZE_STEP = 24 // px per arrow-key press

function addResizeHandle(popover, { onResizeStart, onResizeKey }) {
  const host = popover.wrapper
  if (!host || typeof host.querySelector !== 'function') return
  if (host.querySelector('.guide-resize-handle')) return
  const grip = document.createElement('button')
  grip.type = 'button'
  grip.className = 'guide-resize-handle'
  grip.textContent = '⤡'
  grip.setAttribute(
    'aria-label',
    'Resize guide. Drag, or press arrow keys to grow or shrink the box (right/down bigger, left/up smaller).',
  )
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation() // don't also start the move-drag
    onResizeStart?.(e)
  })
  grip.addEventListener('keydown', (e) => {
    const map = {
      ArrowRight: [RESIZE_STEP, 0], ArrowLeft: [-RESIZE_STEP, 0],
      ArrowDown: [0, RESIZE_STEP], ArrowUp: [0, -RESIZE_STEP],
    }
    if (map[e.key]) {
      e.preventDefault()
      e.stopPropagation() // don't let driver scroll / re-key, or the grip dock
      onResizeKey?.(map[e.key][0], map[e.key][1])
    }
  })
  host.appendChild(grip)
}

// The in-box ▶ "go deeper" button (Phase 3b / R2): leave the current tour and
// drop into the Full Page Guide for the current route. Present ONLY when the
// route HAS a page guide (canGoDeeper) — otherwise it would be a dead button, so
// `onGoDeeper === null` removes any existing one. Presence is re-synced every
// render because canGoDeeper changes as a whole-app tour navigates routes. The
// click is reassigned (not addEventListener) so it always targets the latest
// goDeeper closure without stacking listeners across re-renders.
function syncGoDeeper(popover, onGoDeeper) {
  const row = headerControls(popover)
  if (!row) return
  let btn = row.querySelector('.guide-go-deeper')
  if (!onGoDeeper) {
    if (btn) btn.remove()
    return
  }
  if (!btn) {
    btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'guide-go-deeper'
    btn.textContent = '▶'
    btn.setAttribute('aria-label', 'Tour this page in depth — a guided walk through every control here')
    btn.title = 'Tour this page in depth'
    row.appendChild(btn)
  }
  btn.onclick = (e) => { e.preventDefault(); onGoDeeper() }
}
