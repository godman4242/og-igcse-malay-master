import { useState } from 'react'
import { Search, Plus, Volume2, X } from 'lucide-react'
import DICTIONARY from '../data/dictionary'
import useStore from '../store/useStore'
import { speak } from '../lib/speech'

const DICT_ENTRIES = Object.entries(DICTIONARY)

export default function SearchModal({ open, onClose }) {
  const [query, setQuery] = useState('')
  const addCard = useStore(s => s.addCard)
  const cards = useStore(s => s.cards)

  if (!open) return null

  const q = query.toLowerCase().trim()
  const results = q.length < 1 ? [] : DICT_ENTRIES
    .filter(([m, e]) => m.includes(q) || e.toLowerCase().includes(q))
    .slice(0, 20)

  // Also check user's cards
  const cardResults = q.length < 1 ? [] : cards
    .filter(c => c.m.toLowerCase().includes(q) || c.e.toLowerCase().includes(q))
    .filter(c => !results.some(([m]) => m === c.m))
    .slice(0, 5)

  const isInDeck = (malay) => cards.some(c => c.m === malay)

  const handleAdd = (malay, english) => {
    addCard({ m: malay, e: english, t: 'Search', p: 'n', ex: `${malay} (${english}).`, mn: '' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-[500px] rounded-2xl overflow-hidden animate-fadeUp"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Search size={18} style={{ color: 'var(--color-dim)' }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} autoFocus
            className="flex-1 text-sm outline-none"
            style={{ background: 'transparent', color: 'var(--color-text)' }}
            placeholder="Search Malay or English..." />
          <button onClick={onClose} style={{ color: 'var(--color-dim)' }}><X size={18} /></button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && cardResults.length === 0 && q.length > 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--color-dim)' }}>No results found</p>
          )}
          {q.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--color-dim)' }}>
              Type to search {DICT_ENTRIES.length} dictionary words...
            </p>
          )}

          {results.map(([malay, english]) => (
            <div key={malay} className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold" style={{ color: 'var(--color-cyan)' }}>{malay}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--color-dim)' }}>{english}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-green)' }}>Dict</span>
              <button onClick={() => speak(malay)} style={{ color: 'var(--color-cyan)' }}>
                <Volume2 size={14} />
              </button>
              {isInDeck(malay) ? (
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-green)' }}>In deck</span>
              ) : (
                <button onClick={() => handleAdd(malay, english)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}>
                  <Plus size={12} />
                </button>
              )}
            </div>
          ))}

          {cardResults.map(c => (
            <div key={c.m + c.t} className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold" style={{ color: 'var(--color-purple)' }}>{c.m}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--color-dim)' }}>{c.e}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(179,136,255,0.12)', color: 'var(--color-purple)' }}>Card</span>
              <button onClick={() => speak(c.m)} style={{ color: 'var(--color-cyan)' }}>
                <Volume2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
