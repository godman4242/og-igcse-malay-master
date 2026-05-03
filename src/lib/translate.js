// Translation router. Picks a provider (DeepL > Google Cloud > Free `gtx`),
// caches results in IndexedDB, and falls back gracefully on per-provider
// failures. Public API is backward compatible with the previous one-line
// translator: `translateWord`, `translateSentence`, `getFromCache`.

import useStore from '../store/useStore'
import {
  deeplTranslateOne, deeplTranslateBatch,
  isDeepLAvailable, isDeepLPairSupported, deeplCompareUrl,
} from './translate/providers/deepl'
import {
  googleTranslateOne, googleTranslateBatch,
  isGoogleAvailable, googleCompareUrl,
} from './translate/providers/google'
import {
  gtxTranslateOne, gtxTranslateBatch, isGtxAvailable,
} from './translate/providers/gtx'
import {
  readCache, readCacheSync, writeCache,
} from './translationCache'

function getStorePref() {
  try {
    const state = useStore.getState()
    return {
      ...(state.translation || {}),
      userRole: state.userRole || 'static',
    }
  } catch {
    return {}
  }
}

function getCacheOpts(storePref, opts) {
  return {
    cacheToCloud: Boolean((opts.cacheToCloud ?? storePref.cacheToCloud) && storePref.userRole !== 'static'),
  }
}

function providerOrder(preferred, from, to) {
  // Build the ordered list of providers to try, given the user's preference
  // and which ones have keys / support the language pair.
  const all = []
  const tryDeepL = isDeepLAvailable() && isDeepLPairSupported(from, to)
  const tryGoogle = isGoogleAvailable()
  const tryGtx = isGtxAvailable()

  if (preferred === 'deepl' && tryDeepL) all.push('deepl')
  else if (preferred === 'google' && tryGoogle) all.push('google')
  else if (preferred === 'gtx') all.push('gtx')
  // 'auto' or fallback chain
  if (!all.includes('deepl') && tryDeepL) all.push('deepl')
  if (!all.includes('google') && tryGoogle) all.push('google')
  if (!all.includes('gtx') && tryGtx) all.push('gtx')
  return all
}

const PROVIDERS = {
  deepl: { one: deeplTranslateOne, batch: deeplTranslateBatch },
  google: { one: googleTranslateOne, batch: googleTranslateBatch },
  gtx: { one: gtxTranslateOne, batch: gtxTranslateBatch },
}

export async function translateWord(text, from = 'ms', to = 'en', opts = {}) {
  if (!text || !text.trim()) return { text: '', source: 'empty', provider: null }
  const storePref = getStorePref()
  const cacheOpts = getCacheOpts(storePref, opts)

  // Cache hit short-circuits everything.
  const cached = readCacheSync(text, from, to) || (await readCache(text, from, to, cacheOpts))
  if (cached && !opts.forceFresh) return cached

  const pref = (opts.provider || storePref.preferredProvider || 'auto').toLowerCase()
  const order = providerOrder(pref, from, to)
  let lastErr = null
  for (const name of order) {
    try {
      const result = await PROVIDERS[name].one(text, from, to)
      writeCache(text, from, to, result, cacheOpts) // fire-and-forget
      return result
    } catch (e) {
      lastErr = e
      // If the failure is "unsupported pair" for DeepL we just continue.
      // For HTTP errors we also continue — next provider gets a shot.
    }
  }
  return { text, source: 'error', provider: null, error: lastErr?.message || 'no provider' }
}

// `translateSentence` is just an alias kept for backward compatibility with
// existing call sites that want to convey intent.
export const translateSentence = translateWord

export async function translateBatch(texts, from = 'ms', to = 'en', opts = {}) {
  if (!texts?.length) return []
  const storePref = getStorePref()
  const cacheOpts = getCacheOpts(storePref, opts)

  // Pull cached results out first so we only hit the API for the rest.
  const out = new Array(texts.length).fill(null)
  const indexes = []
  const missing = []
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i]
    if (!t || !t.trim()) {
      out[i] = { text: '', source: 'empty', provider: null }
      continue
    }
    const cached = readCacheSync(t, from, to) || (await readCache(t, from, to, cacheOpts))
    if (cached && !opts.forceFresh) {
      out[i] = cached
    } else {
      indexes.push(i)
      missing.push(t)
    }
  }
  if (!missing.length) return out

  const pref = (opts.provider || storePref.preferredProvider || 'auto').toLowerCase()
  const order = providerOrder(pref, from, to)

  for (const name of order) {
    try {
      const results = await PROVIDERS[name].batch(missing, from, to)
      for (let j = 0; j < indexes.length; j++) {
        const result = results[j] || { text: missing[j], source: 'error', provider: name }
        out[indexes[j]] = result
        writeCache(missing[j], from, to, result, cacheOpts)
      }
      return out
    } catch {
      // try next provider
    }
  }
  // All providers failed; fill with original text
  for (let j = 0; j < indexes.length; j++) {
    out[indexes[j]] = { text: missing[j], source: 'error', provider: null }
  }
  return out
}

// Used by Import.jsx existing code — kept as a sync best-effort lookup.
export function getFromCache(word, from = 'ms', to = 'en') {
  return readCacheSync(word, from, to)
}

// Comparison links for the "compare on the other translator" affordance.
export function getDeepLCompareUrl(text, from = 'ms', to = 'en') {
  return deeplCompareUrl(text, from, to)
}

export function getGoogleCompareUrl(text, from = 'ms', to = 'en') {
  return googleCompareUrl(text, from, to)
}

// Surface which providers are usable so Settings can grey out missing ones.
export function getProviderHealth() {
  return {
    deepl: isDeepLAvailable(),
    google: isGoogleAvailable(),
    gtx: isGtxAvailable(),
  }
}
