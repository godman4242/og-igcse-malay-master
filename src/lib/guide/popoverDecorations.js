// popoverDecorations.js — injects the guide popover's extra controls:
//   • a Pause/Resume toggle (enter/leave Explore mode)
//   • a tap-to-jump progress counter ("4 of 22" → type a number → jump)
// Pure DOM, no React/store — mirrors the onPopoverRender DOM-injection pattern
// already used for theming. Called per step render by guideController's wrapper.
// Idempotent: guards stop a second button/input if driver re-renders the popover.

export function decoratePopover(popover, {
  mode = 'spotlight',
  current = 1,
  total = 1,
  onTogglePause,
  onJump,
} = {}) {
  if (!popover) return
  addPauseButton(popover, mode, onTogglePause)
  makeProgressJumpable(popover, current, total, onJump)
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
