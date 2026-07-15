// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import Meta from '../Meta'

let root, host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const attr = (sel, a) => document.head.querySelector(sel)?.getAttribute(a)

describe('Meta', () => {
  it('sets title, description, canonical and OG for the current path', () => {
    window.history.pushState({}, '', '/writing')
    act(() => root.render(React.createElement(Meta, { title: 'Writing Analyzer | IGCSE Malay Master', description: 'Analyze your IGCSE writing.' })))
    expect(document.title).toBe('Writing Analyzer | IGCSE Malay Master')
    expect(attr('meta[name="description"]', 'content')).toBe('Analyze your IGCSE writing.')
    expect(attr('link[rel="canonical"]', 'href')).toMatch(/\/writing$/)
    expect(attr('meta[property="og:title"]', 'content')).toBe('Writing Analyzer | IGCSE Malay Master')
    expect(attr('meta[property="og:url"]', 'content')).toMatch(/\/writing$/)
  })
})
