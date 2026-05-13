// Best-effort JSON parser that survives common LLM output quirks:
// - already-parsed objects pass through
// - bare JSON parses normally
// - JSON wrapped in surrounding prose is recovered by extracting the
//   first {...} block.
// Returns null when nothing parseable is found.

export function tryParseJSON(text) {
  if (!text) return null
  try {
    if (typeof text === 'object') return text
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { return null }
    }
    return null
  }
}
