// guideState.js — a tiny framework-agnostic observable for the guide's
// full-screen HUD chrome (dock zones now; the Phase-3 pointer arrow later).
//
// WHY a separate module (vs. living in guideController): GuideHud is mounted in
// the always-eager Layout, but the controller + driver.js MUST stay in the lazy
// guide chunk. The HUD subscribes synchronously to know when to show the dock
// zones, so the seam must be importable WITHOUT pulling the heavy controller into
// the eager bundle. This module has ZERO imports → the eager cost is a few
// hundred bytes. The controller (lazy) writes; the HUD (eager) reads via
// useSyncExternalStore.
//
// Shape: { dragging:boolean, zone:Zone|null, docked:Zone|null, announce:string,
//          pointer:{box,target}|null }  (pointer = the Phase-3 page-guide arrow)

const INITIAL = { dragging: false, zone: null, docked: null, announce: '', pointer: null }

let state = INITIAL
const listeners = new Set()

export function getGuideState() {
  return state
}

export function setGuideState(patch) {
  const next = { ...state, ...patch }
  let changed = false
  for (const k in next) {
    if (next[k] !== state[k]) { changed = true; break }
  }
  if (!changed) return // keep the snapshot reference stable for React
  state = next
  for (const fn of listeners) fn(state)
}

export function resetGuideState() {
  setGuideState(INITIAL)
}

export function subscribeGuideState(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
