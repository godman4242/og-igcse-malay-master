import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { decodeDeckParam } from '../lib/sharedDeck'
import SharedDeckImport from './SharedDeckImport'

// Watches for a `?deck=` share link on ANY route (mounted in Layout). On a valid
// payload it opens the review modal; a malformed link shows a brief, dismissible
// notice. Either way the param is stripped immediately (replace history) so a
// reload/back doesn't re-trigger and the long base64 doesn't linger in the URL.
export default function SharedDeckGate() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [deckCards, setDeckCards] = useState(null)
  const [error, setError] = useState(false)
  const deckParam = searchParams.get('deck')

  useEffect(() => {
    if (!deckParam) return
    const decoded = decodeDeckParam(deckParam)
    // Strip the param first so the modal can't re-open on a re-render / reload.
    const next = new URLSearchParams(searchParams)
    next.delete('deck')
    setSearchParams(next, { replace: true })
    if (decoded && decoded.cards.length) setDeckCards(decoded.cards)
    else setError(true)
    // deckParam is the trigger; searchParams/setSearchParams are stable enough
    // and re-running on the strip just no-ops (deckParam becomes null).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckParam])

  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => setError(false), 5000)
    return () => clearTimeout(id)
  }, [error])

  return (
    <>
      {deckCards && <SharedDeckImport cards={deckCards} onClose={() => setDeckCards(null)} />}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-semibold animate-fadeUp"
          role="status"
          style={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
          That share link is invalid or corrupted.
        </div>
      )}
    </>
  )
}
