import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import useStore from '../store/useStore'
import { TheaterModeContext } from './TheaterModeContext'

function TheaterModeInner({ children, enabled }) {
  const [internal, setInternal] = useState(false)
  const theaterMode = enabled && internal

  const setTheaterMode = useCallback((v) => {
    setInternal(prev => (typeof v === 'function' ? v(prev) : !!v))
  }, [])

  // Esc key escape hatch — event handler setState fires async, not in effect body.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (!theaterMode) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      setInternal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [theaterMode])

  return (
    <TheaterModeContext.Provider value={{ theaterMode, setTheaterMode }}>
      {children}
    </TheaterModeContext.Provider>
  )
}

export function TheaterModeProvider({ children }) {
  const enabled = useStore(s => s.theaterModeEnabled ?? true)
  const location = useLocation()
  // Remount on route change → resets internal state cleanly without setState-in-effect.
  return (
    <TheaterModeInner key={location.pathname} enabled={enabled}>
      {children}
    </TheaterModeInner>
  )
}
