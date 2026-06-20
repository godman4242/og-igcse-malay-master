// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { decoratePopover } from '../popoverDecorations'

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
