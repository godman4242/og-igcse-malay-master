// Browser-installation state for the PWA.
//
// Chromium fires a `beforeinstallprompt` event once the manifest meets
// the install criteria; we capture it, hide the default mini-info bar,
// and surface our own "Install App" button in Settings. The native
// `prompt()` can only be called from a user gesture, so we expose it
// through the captured event without proxy wrappers.
//
// Module-scope state is the right level here — there's only one
// install event per page session, and components from different
// branches of the tree (App.jsx, Settings.jsx) need to share it. A
// tiny pub/sub keeps React subscribers in sync.

import { useEffect, useState } from 'react'

let deferredPrompt = null
let installed = false
const listeners = new Set()

function emit() {
  for (const cb of listeners) cb()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    emit()
  })
}

export function useInstallPrompt() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const cb = () => setTick(t => t + 1)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])

  const canInstall = !!deferredPrompt && !installed
  const isInstalled = installed
    || (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches)
    || (typeof navigator !== 'undefined' && navigator.standalone === true)

  const promptInstall = async () => {
    if (!deferredPrompt) return { outcome: 'unavailable' }
    const ev = deferredPrompt
    deferredPrompt = null
    emit()
    ev.prompt()
    const choice = await ev.userChoice
    return choice
  }

  return { canInstall, isInstalled, promptInstall }
}
