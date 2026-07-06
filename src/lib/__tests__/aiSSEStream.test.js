// @vitest-environment jsdom
//
// Review #14: the SSE reader had no cross-chunk line buffer. When the network
// split a `data:` line across two reader.read() chunks, the partial first half
// failed JSON.parse and the catch APPENDED THE RAW JSON FRAGMENT to the visible
// reply, while the tail (no `data: ` prefix) was silently dropped. A proper
// buffer holds the incomplete tail until the rest of the chunk arrives.

import { describe, it, expect } from 'vitest'
import { readSSEStream } from '../ai.js'

// A fake Response whose body yields the given string chunks in order — each an
// independent reader.read() result, exactly as a chunked network stream would.
function fakeSSEResponse(chunks) {
  const encoder = new TextEncoder()
  let i = 0
  return {
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length
            ? { done: false, value: encoder.encode(chunks[i++]) }
            : { done: true, value: undefined },
        releaseLock: () => {},
      }),
    },
  }
}

describe('readSSEStream — cross-chunk line buffering (#14)', () => {
  it('reassembles a data: line split mid-JSON across two chunks (no raw leak, no dropped tail)', async () => {
    // One content delta "Hello world" whose JSON is split across the chunk edge.
    const chunks = [
      'data: {"type":"content_block_delta","delta":{"text":"Hello ',
      'world"}}\n',
      'data: {"type":"message_stop","usage":{"output_tokens":7}}\n',
    ]
    const seen = []
    const out = await readSSEStream(fakeSSEResponse(chunks), (t) => seen.push(t))

    expect(out.response).toBe('Hello world')
    expect(seen.join('')).toBe('Hello world')
    expect(out.tokensUsed).toBe(7)
  })

  it('handles a final data: line that arrives without a trailing newline', async () => {
    const chunks = ['data: {"type":"content_block_delta","delta":{"text":"bye"}}']
    const out = await readSSEStream(fakeSSEResponse(chunks), () => {})
    expect(out.response).toBe('bye')
  })
})
