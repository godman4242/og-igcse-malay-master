// Unit suite for Bring-Your-Own-Key (BYOK): the OpenRouter user-key layer,
// the callTextAI provider router, and the speaking-coach prompt builder.
// Design: docs/superpowers/specs/2026-05-30-byok-design.md

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  setUserOpenRouterKey, getUserOpenRouterKey, hasUserOpenRouterKey,
  isOpenRouterAvailable,
} from '../openrouter.js'

describe('openrouter user-key layer', () => {
  beforeEach(() => {
    setUserOpenRouterKey('') // reset to no user key
  })

  it('stores and reflects a user key', () => {
    expect(hasUserOpenRouterKey()).toBe(false)
    setUserOpenRouterKey('sk-or-test')
    expect(hasUserOpenRouterKey()).toBe(true)
    expect(getUserOpenRouterKey()).toBe('sk-or-test')
  })

  it('trims whitespace and clears on empty/whitespace input', () => {
    setUserOpenRouterKey('  sk-or-spaced  ')
    expect(getUserOpenRouterKey()).toBe('sk-or-spaced')
    setUserOpenRouterKey('   ')
    expect(hasUserOpenRouterKey()).toBe(false)
    expect(getUserOpenRouterKey()).toBe(null)
  })

  it('isOpenRouterAvailable is true once a user key is set', () => {
    setUserOpenRouterKey('sk-or-test')
    expect(isOpenRouterAvailable()).toBe(true)
  })
})
