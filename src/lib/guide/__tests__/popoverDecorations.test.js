// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { decoratePopover, splitButtonIconLabel } from '../popoverDecorations'

function fakePopover() {
  const footerButtons = document.createElement('div')
  const progress = document.createElement('div')
  progress.className = 'driver-popover-progress-text'
  progress.textContent = '2 of 5'
  const wrapper = document.createElement('div')
  wrapper.className = 'driver-popover guide-theme'
  wrapper.append(footerButtons, progress)
  document.body.append(wrapper)
  return { wrapper, footerButtons, progress }
}

afterEach(() => { document.body.innerHTML = '' })

describe('decoratePopover', () => {
  it('adds a Pause button wired to onTogglePause', () => {
    const p = fakePopover()
    const onTogglePause = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 2, total: 5, onTogglePause, onJump: vi.fn() })
    const btn = p.wrapper.querySelector('.guide-pause-btn')
    expect(btn).toBeTruthy()
    expect(btn.textContent).toContain('Pause')
    btn.click()
    expect(onTogglePause).toHaveBeenCalledTimes(1)
  })

  it('labels the button Resume in explore mode', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'explore', current: 2, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    expect(p.wrapper.querySelector('.guide-pause-btn').textContent).toContain('Resume')
  })

  it('progress becomes an input that calls onJump(n) on Enter', () => {
    const p = fakePopover()
    const onJump = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 2, total: 5, onTogglePause: vi.fn(), onJump })
    const jump = p.wrapper.querySelector('.guide-progress-jump')
    expect(jump.textContent).toBe('2')
    jump.click()
    const input = p.wrapper.querySelector('.guide-progress-input')
    expect(input).toBeTruthy()
    input.value = '4'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onJump).toHaveBeenCalledWith(4)
  })

  it('ignores an out-of-range jump value', () => {
    const p = fakePopover()
    const onJump = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 2, total: 5, onTogglePause: vi.fn(), onJump })
    p.wrapper.querySelector('.guide-progress-jump').click()
    const input = p.wrapper.querySelector('.guide-progress-input')
    input.value = '99'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onJump).not.toHaveBeenCalled()
  })

  it('is idempotent — re-decorating does not add a second button', () => {
    const p = fakePopover()
    const opts = { mode: 'spotlight', current: 2, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() }
    decoratePopover(p, opts)
    decoratePopover(p, opts)
    expect(p.wrapper.querySelectorAll('.guide-pause-btn')).toHaveLength(1)
  })

  it('adds a drag handle; pointerdown calls onDragStart', () => {
    const p = fakePopover()
    const onDragStart = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), onDragStart })
    const handle = p.wrapper.querySelector('.guide-drag-handle')
    expect(handle).toBeTruthy()
    handle.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(onDragStart).toHaveBeenCalledTimes(1)
  })

  it('arrow keys on the handle dock to each edge', () => {
    const p = fakePopover()
    const onDock = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), onDock })
    const handle = p.wrapper.querySelector('.guide-drag-handle')
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    }
    expect(onDock.mock.calls.map((c) => c[0])).toEqual(['top', 'bottom', 'left', 'right'])
  })

  it('reflects docked state on the handle via aria-pressed', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), docked: 'top' })
    expect(p.wrapper.querySelector('.guide-drag-handle').getAttribute('aria-pressed')).toBe('true')
  })

  it('is idempotent — re-decorating does not add a second drag handle', () => {
    const p = fakePopover()
    const opts = { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), onDragStart: vi.fn() }
    decoratePopover(p, opts)
    decoratePopover(p, opts)
    expect(p.wrapper.querySelectorAll('.guide-drag-handle')).toHaveLength(1)
  })
})

describe('decoratePopover — go deeper (in-box ▶)', () => {
  it('adds a ▶ go-deeper button when canGoDeeper and onGoDeeper are given', () => {
    const p = fakePopover()
    const onGoDeeper = vi.fn()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), canGoDeeper: true, onGoDeeper })
    const btn = p.wrapper.querySelector('.guide-go-deeper')
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('aria-label')).toMatch(/page|deeper|tour/i)
    btn.click()
    expect(onGoDeeper).toHaveBeenCalledTimes(1)
  })

  it('does NOT add a ▶ button when canGoDeeper is false (route has no page guide)', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), canGoDeeper: false, onGoDeeper: vi.fn() })
    expect(p.wrapper.querySelector('.guide-go-deeper')).toBeNull()
  })

  it('does NOT add a ▶ button when no onGoDeeper is wired', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), canGoDeeper: true })
    expect(p.wrapper.querySelector('.guide-go-deeper')).toBeNull()
  })

  it('removes the ▶ button on a later render that is no longer canGoDeeper (route changed mid-tour)', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), canGoDeeper: true, onGoDeeper: vi.fn() })
    expect(p.wrapper.querySelector('.guide-go-deeper')).toBeTruthy()
    decoratePopover(p, { mode: 'spotlight', current: 2, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), canGoDeeper: false, onGoDeeper: vi.fn() })
    expect(p.wrapper.querySelector('.guide-go-deeper')).toBeNull()
  })

  it('is idempotent — re-decorating does not add a second ▶ button', () => {
    const p = fakePopover()
    const opts = { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), canGoDeeper: true, onGoDeeper: vi.fn() }
    decoratePopover(p, opts)
    decoratePopover(p, opts)
    expect(p.wrapper.querySelectorAll('.guide-go-deeper')).toHaveLength(1)
  })

  it('keeps the drag handle and ▶ in one header row (both inside .guide-header-controls)', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn(), onDragStart: vi.fn(), canGoDeeper: true, onGoDeeper: vi.fn() })
    const row = p.wrapper.querySelector('.guide-header-controls')
    expect(row).toBeTruthy()
    expect(row.querySelector('.guide-drag-handle')).toBeTruthy()
    expect(row.querySelector('.guide-go-deeper')).toBeTruthy()
  })
})

describe('decoratePopover — minimize-to-icons split (R4 / T2)', () => {
  // driver.js's real popover footer holds Back/Next (and Done on the last step);
  // the e2e gives them .driver-popover-*-btn classes. Mirror that here.
  function withFooterButtons(p) {
    const prev = document.createElement('button')
    prev.className = 'driver-popover-prev-btn'
    prev.textContent = '← Back'
    const next = document.createElement('button')
    next.className = 'driver-popover-next-btn'
    next.textContent = 'Next →'
    p.footerButtons.append(prev, next)
    return { prev, next }
  }

  it('splits a label-then-icon button into an icon span + a label span, order preserved', () => {
    const p = fakePopover()
    const { next } = withFooterButtons(p)
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    expect(next.querySelector('.guide-btn-label').textContent.trim()).toBe('Next')
    expect(next.querySelector('.guide-btn-ico').textContent.trim()).toBe('→')
    // label still comes first visually so "Next →" reads identically when expanded
    expect(next.firstElementChild.className).toBe('guide-btn-label')
  })

  it('splits an icon-then-label button (← Back) and keeps the icon first', () => {
    const p = fakePopover()
    const { prev } = withFooterButtons(p)
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    expect(prev.querySelector('.guide-btn-ico').textContent.trim()).toBe('←')
    expect(prev.querySelector('.guide-btn-label').textContent.trim()).toBe('Back')
    expect(prev.firstElementChild.className).toBe('guide-btn-ico')
  })

  it('gives the nav button a stable aria-label (the word) so it has a name when icon-only', () => {
    const p = fakePopover()
    const { prev, next } = withFooterButtons(p)
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    expect(prev.getAttribute('aria-label')).toMatch(/^Back$/i)
    expect(next.getAttribute('aria-label')).toMatch(/^Next$/i)
  })

  it('splits the Pause button (⏸ + Pause) WITHOUT clobbering its descriptive aria-label', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    const pause = p.wrapper.querySelector('.guide-pause-btn')
    expect(pause.querySelector('.guide-btn-ico').textContent).toContain('⏸')
    expect(pause.querySelector('.guide-btn-label').textContent).toContain('Pause')
    expect(pause.getAttribute('aria-label')).toMatch(/explore/i) // the rich one survives
  })

  it('is idempotent — re-decorating does not double-split a button', () => {
    const p = fakePopover()
    const { next } = withFooterButtons(p)
    const opts = { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() }
    decoratePopover(p, opts)
    decoratePopover(p, opts)
    expect(next.querySelectorAll('.guide-btn-label')).toHaveLength(1)
    expect(next.querySelectorAll('.guide-btn-ico')).toHaveLength(1)
  })

  it('leaves a pure-icon button (no word) alone', () => {
    const p = fakePopover()
    const close = document.createElement('button')
    close.className = 'driver-popover-close-btn'
    close.textContent = '×'
    p.footerButtons.append(close)
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    expect(close.querySelector('.guide-btn-label')).toBeNull()
    expect(close.textContent).toBe('×')
  })

  it('splitButtonIconLabel re-splits after textContent is reset (pause toggle path)', () => {
    const p = fakePopover()
    decoratePopover(p, { mode: 'spotlight', current: 1, total: 5, onTogglePause: vi.fn(), onJump: vi.fn() })
    const pause = p.wrapper.querySelector('.guide-pause-btn')
    // the controller resets textContent on a pause/resume toggle, wiping the spans
    pause.textContent = '▶ Resume'
    expect(pause.querySelector('.guide-btn-label')).toBeNull()
    splitButtonIconLabel(pause)
    expect(pause.querySelector('.guide-btn-ico').textContent).toContain('▶')
    expect(pause.querySelector('.guide-btn-label').textContent).toContain('Resume')
  })
})
