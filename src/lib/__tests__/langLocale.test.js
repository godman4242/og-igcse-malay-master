import { describe, it, expect } from 'vitest'
import { localeFor } from '../langLocale'

describe('localeFor', () => {
  it('maps ms → ms-MY (Malay)', () => { expect(localeFor('ms')).toBe('ms-MY') })
  it('maps en → en-GB (IGCSE = British English)', () => { expect(localeFor('en')).toBe('en-GB') })
  it('defaults missing/unknown lang to Malay (back-compat with un-tagged cards)', () => {
    expect(localeFor(undefined)).toBe('ms-MY')
    expect(localeFor('zz')).toBe('ms-MY')
  })
})
