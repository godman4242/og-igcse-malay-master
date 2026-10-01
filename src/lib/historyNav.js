// Header ← → greying (A6 Phase 1). React Router stamps every history entry
// with `history.state.idx` (0 on a fresh tab); "anything ahead" needs the
// highest index this tab has reached, kept in sessionStorage so a reload keeps
// the browser's own forward entries. A PUSH drops the forward entries (the
// stack now ends here); so does a typed URL in a used tab (document navigation
// type 'navigate'); a reload / history traversal keeps them. Pure part first,
// pinned by historyNav.test.js; trackNavState() is the thin browser shell.
export const MAX_IDX_KEY = 'igcse-nav-max-idx'

export function readNavState(historyState, storedMax, navType, docNavType) {
  const idx = Number.isInteger(historyState?.idx) && historyState.idx >= 0 ? historyState.idx : 0
  let max = Number.parseInt(storedMax, 10)
  if (!Number.isFinite(max) || max < 0) max = 0
  max = navType === 'PUSH' || docNavType === 'navigate' ? idx : Math.max(max, idx)
  return { idx, max, canBack: idx > 0, canForward: idx < max }
}

let docNavTypeRead = false
export function trackNavState(navType) {
  // The Navigation API (Chromium, Safari 26+, Firefox 147+) knows the whole
  // same-origin stack, across documents too — a typed URL, an OAuth return or a
  // browser Back into an older document restart `history.state.idx` at 0, which
  // the index heuristic below cannot see (review 2026-10-01). Prefer it.
  const nav = typeof window !== 'undefined' ? window.navigation : undefined
  if (nav && typeof nav.canGoBack === 'boolean') {
    return { canBack: nav.canGoBack, canForward: nav.canGoForward === true }
  }
  let docNavType
  if (!docNavTypeRead) {
    docNavTypeRead = true
    docNavType = performance.getEntriesByType?.('navigation')?.[0]?.type
  }
  let stored = null
  try { stored = sessionStorage.getItem(MAX_IDX_KEY) } catch { /* storage blocked */ }
  const s = readNavState(window.history.state, stored, navType, docNavType)
  try { sessionStorage.setItem(MAX_IDX_KEY, String(s.max)) } catch { /* storage blocked */ }
  return s
}
