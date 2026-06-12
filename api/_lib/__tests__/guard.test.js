// Pins the shared proxy guards: the JWT gate both serverless functions sit
// behind, and the per-uid daily cap's three outcomes (allow / trip+log /
// fail-open+log). The cap must NEVER fail silent and NEVER fail closed.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetUser = vi.fn()
const mockRpc = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}))

import { verifySession, enforceDailyCap } from '../guard.js'

const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const savedEnv = {}

beforeEach(() => {
  vi.clearAllMocks()
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k]
    process.env[k] = `test-${k}`
  }
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
})

describe('verifySession', () => {
  it('401s with no Authorization header', async () => {
    const out = await verifySession({ headers: {} })
    expect(out.errorStatus).toBe(401)
  })

  it('401s with a non-Bearer header', async () => {
    const out = await verifySession({ headers: { authorization: 'Basic abc' } })
    expect(out.errorStatus).toBe(401)
  })

  it('500s when server env is missing (and logs)', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const out = await verifySession({ headers: { authorization: 'Bearer tok' } })
    expect(out.errorStatus).toBe(500)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('401s when the token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } })
    const out = await verifySession({ headers: { authorization: 'Bearer bad-token' } })
    expect(out.errorStatus).toBe(401)
    expect(mockGetUser).toHaveBeenCalledWith('bad-token')
  })

  it('returns user + adminClient for a valid token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null })
    const out = await verifySession({ headers: { authorization: 'Bearer good' } })
    expect(out.errorStatus).toBeUndefined()
    expect(out.user.id).toBe('uid-1')
    expect(out.adminClient).toBeTruthy()
  })
})

describe('enforceDailyCap', () => {
  const user = { id: 'uid-1' }
  const client = { rpc: mockRpc }

  it('allows under the limit', async () => {
    mockRpc.mockResolvedValue({ data: 3, error: null })
    const out = await enforceDailyCap(client, user, 'gemini', 200)
    expect(out).toBeNull()
    expect(mockRpc).toHaveBeenCalledWith('increment_api_usage', {
      p_uid: 'uid-1',
      p_endpoint: 'gemini',
    })
  })

  it('429s over the limit AND logs the trip (never silent)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockRpc.mockResolvedValue({ data: 201, error: null })
    const out = await enforceDailyCap(client, user, 'gemini', 200)
    expect(out.errorStatus).toBe(429)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DAILY CAP TRIPPED'))
    expect(warnSpy.mock.calls[0][0]).toContain('uid=uid-1')
    expect(warnSpy.mock.calls[0][0]).toContain('count=201')
    warnSpy.mockRestore()
  })

  it('allows exactly at the limit (cap is >, not >=)', async () => {
    mockRpc.mockResolvedValue({ data: 200, error: null })
    const out = await enforceDailyCap(client, user, 'gemini', 200)
    expect(out).toBeNull()
  })

  it('fails OPEN on an RPC error AND logs it (never silent, never closed)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRpc.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } })
    const out = await enforceDailyCap(client, user, 'translate', 500)
    expect(out).toBeNull()
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('CAP CHECK FAILED (fail-open)'))
    errSpy.mockRestore()
  })

  it('fails OPEN on a thrown error AND logs it', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockRpc.mockRejectedValue(new Error('network down'))
    const out = await enforceDailyCap(client, user, 'translate', 500)
    expect(out).toBeNull()
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('network down'))
    errSpy.mockRestore()
  })
})
