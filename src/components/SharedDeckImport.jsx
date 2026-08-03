import { useState, useRef, useMemo } from 'react'
import { Check, X, ArrowRight, Users } from 'lucide-react'
import useStore from '../store/useStore'
import { useFocusTrap } from '../lib/useFocusTrap'
// dictionaryExamples is dynamic-imported in handleAdd — SharedDeckGate mounts
// this on every route, so a static import would pin ~50 KB of example sentences
// into the eager entry chunk for a lookup that only runs on an actual import (C8).

// Review-gated import of a SHARED deck (review #15). The cards are already
// sanitised (src/lib/sharedDeck.js) — this is purely the "pick which words +
// name the deck + add" UX, mirroring MakeDeckPanel's DeckReview so it feels
// native. Never auto-adds; the recipient owns the deck name and the selection.

const LANG_LABEL = { ms: 'Malay', en: 'English' }

function commonDeckName(cards) {
  const counts = {}
  for (const c of cards) {
    const t = (c.t || '').trim()
    if (t) counts[t] = (counts[t] || 0) + 1
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : 'Shared deck'
}

export default function SharedDeckImport({ cards, onClose }) {
  const addCards = useStore(s => s.addCards)
  const studyLang = useStore(s => s.studyLang) || 'ms'

  const dialogRef = useRef(null)
  useFocusTrap(dialogRef, { active: true, onClose })

  const [selected, setSelected] = useState(() => new Set(cards.map((_, i) => i)))
  const [deckName, setDeckName] = useState(() => commonDeckName(cards))
  const [added, setAdded] = useState(null) // null | { count }

  // Which languages this deck carries (imports may be mixed) — used for the
  // "you're studying the other language" heads-up.
  const deckLangs = useMemo(() => [...new Set(cards.map(c => c.lang))], [cards])
  const langMismatch = deckLangs.length > 0 && !deckLangs.includes(studyLang)

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i); else next.add(i)
    return next
  })

  const chosenCount = selected.size

  const handleAdd = async () => {
    const name = deckName.trim() || 'Shared deck'
    // A failed chunk fetch must not silently swallow the tap — fall back to the
    // guard-recognised placeholder below so the cards are still created.
    let getExample = () => null
    try { ({ getExample } = await import('../data/dictionaryExamples')) } catch { /* offline before the SW precached it */ }
    const chosen = cards
      .filter((_, i) => selected.has(i))
      // C4: `ex` is a MODEL SENTENCE — Study → Speak reads it aloud in ms-MY and
      // scores the learner's pronunciation against it. The old `${m} — ${e}`
      // glue had no parentheses, so it slipped past speakTarget's PLACEHOLDER_EX
      // guard and the app spoke a bilingual fragment as if it were Malay.
      // sanitiseDeck whitelists only {m,e,t,lang}, so a shared payload can never
      // carry a real example — mirror SearchModal instead: a curated example
      // when the dictionary has one, else the guard-recognised placeholder.
      .map(c => ({ m: c.m, e: c.e, lang: c.lang, t: name, p: 'n', ex: getExample(c.m) || `${c.m} (${c.e}).`, mn: '' }))
    if (!chosen.length) return
    addCards(chosen)
    setAdded({ count: chosen.length })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-[500px] rounded-2xl overflow-hidden animate-fadeUp my-8"
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Import shared deck"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>

        {/* Header */}
        <div className="flex items-center gap-2.5 p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-accent-subtle)' }}>
            <Users size={18} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold leading-tight">Someone shared a deck</h2>
            <p className="text-[12px]" style={{ color: 'var(--color-dim)' }}>
              {cards.length} {cards.length === 1 ? 'word' : 'words'} — pick which to add.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
            <X size={16} style={{ color: 'var(--color-dim)' }} aria-hidden={true} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {added ? (
            <div className="space-y-3" aria-live="polite">
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-border)' }}>
                <Check size={16} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
                <p className="text-sm font-semibold">
                  Added {added.count} {added.count === 1 ? 'word' : 'words'} to “{deckName.trim() || 'Shared deck'}”.
                </p>
              </div>
              <button onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' }}>
                Done <ArrowRight size={15} aria-hidden={true} />
              </button>
            </div>
          ) : (
            <>
              {/* Deck name */}
              <div>
                <label htmlFor="shared-deck-name" className="text-[12px] font-semibold" style={{ color: 'var(--color-dim)' }}>
                  Save into deck
                </label>
                <input id="shared-deck-name" type="text" value={deckName} onChange={e => setDeckName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl text-sm"
                  style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
              </div>

              {langMismatch && (
                <p className="text-[11px] p-2.5 rounded-xl" style={{ background: 'var(--color-card2)', color: 'var(--color-dim)', border: '1px solid var(--color-border)' }}>
                  Heads up — this is a {deckLangs.map(l => LANG_LABEL[l]).join(' & ')} deck, but you’re studying{' '}
                  {LANG_LABEL[studyLang]}. It’ll be saved; switch your study language to review it.
                </p>
              )}

              {/* Word list */}
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                {cards.map((c, i) => (
                  <button key={i} onClick={() => toggle(i)} role="checkbox" aria-checked={selected.has(i)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left"
                    style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
                    <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                      style={{
                        background: selected.has(i) ? 'var(--color-accent)' : 'transparent',
                        border: selected.has(i) ? 'none' : '1.5px solid var(--color-border)',
                      }}>
                      {selected.has(i) && <Check size={13} className="text-white" aria-hidden={true} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-bold">{c.m}</span>
                      <span className="text-sm" style={{ color: 'var(--color-dim)' }}> — {c.e}</span>
                    </span>
                  </button>
                ))}
              </div>

              <button onClick={handleAdd} disabled={chosenCount === 0}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' }}>
                Add {chosenCount} {chosenCount === 1 ? 'word' : 'words'} <ArrowRight size={15} aria-hidden={true} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
