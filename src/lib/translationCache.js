// IndexedDB-backed translation cache. Keys are `${from}:${to}:${normalizedText}`.
// Phase A is local-only. The `cacheToCloud` toggle in store is a no-op stub
// here; Phase B (upg-igcse-malay-master) replaces these calls with a
// Supabase upsert/select pair.

const DB_NAME = 'igcse-translations'
const STORE_NAME = 'cache'
const DB_VERSION = 1

let dbPromise = null

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null) // degrade silently
  })
  return dbPromise
}

function makeKey(text, from, to) {
  // Normalize whitespace + case for cache lookup. We keep the original cased
  // text in the value so consumers see what they asked for.
  return `${from}:${to}:${text.trim().toLowerCase()}`
}

// In-memory shadow so synchronous lookups (Map.get during render) work too.
const memCache = new Map()

export async function readCache(text, from, to) {
  const key = makeKey(text, from, to)
  if (memCache.has(key)) return memCache.get(key)
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => {
        const value = req.result?.value || null
        if (value) memCache.set(key, value)
        resolve(value)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export function readCacheSync(text, from, to) {
  return memCache.get(makeKey(text, from, to)) || null
}

export async function writeCache(text, from, to, value) {
  const key = makeKey(text, from, to)
  memCache.set(key, value)
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ key, value, ts: Date.now() })
  } catch {
    // ignore
  }
}

export async function clearCache() {
  memCache.clear()
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch {
    // ignore
  }
}

export async function cacheSize() {
  const db = await openDb()
  if (!db) return 0
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).count()
      req.onsuccess = () => resolve(req.result || 0)
      req.onerror = () => resolve(0)
    } catch {
      resolve(0)
    }
  })
}
