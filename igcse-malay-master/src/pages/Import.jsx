import { useState } from 'react'
import { Plus, Search, Volume2, FileText } from 'lucide-react'
import useStore from '../store/useStore'
import DICTIONARY from '../data/dictionary'
import { translateWord } from '../lib/translate'
import { speak } from '../lib/speech'

// Phrases sorted longest-first for detection
const PHRASES = Object.keys(DICTIONARY).filter(k => k.includes(' ') || k.includes('-')).sort((a, b) => b.length - a.length)

export default function Import() {
  const [text, setText] = useState('')
  const [words, setWords] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [translations, setTranslations] = useState({})
  const [deck, setDeck] = useState('Imported')
  const addCards = useStore(s => s.addCards)

  const processText = () => {
    if (!text.trim()) return
    const lower = text.toLowerCase()
    const found = []
    let processed = lower

    // Find phrases first
    for (const phrase of PHRASES) {
      if (processed.includes(phrase)) {
        found.push({ word: phrase, type: 'phrase', meaning: DICTIONARY[phrase] })
        processed = processed.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '___')
      }
    }

    // Then individual words
    const remaining = processed.split(/\s+/).filter(w => w !== '___' && w.length > 1)
    const seen = new Set(found.map(f => f.word))
    for (const raw of remaining) {
      const clean = raw.replace(/[^a-zA-Z\-]/g, '').toLowerCase()
      if (!clean || clean.length < 2 || seen.has(clean)) continue
      seen.add(clean)
      if (DICTIONARY[clean]) {
        found.push({ word: clean, type: 'dict', meaning: DICTIONARY[clean] })
      } else {
        found.push({ word: clean, type: 'unknown', meaning: null })
      }
    }

    setWords(found)
    setSelected(new Set())
    setTranslations({})
  }

  const translateUnknown = async (word) => {
    if (translations[word]) return
    setTranslations(t => ({ ...t, [word]: 'loading...' }))
    const result = await translateWord(word)
    setTranslations(t => ({ ...t, [word]: result.text }))
  }

  const toggleWord = (word) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  const addSelected = () => {
    const cards = words
      .filter(w => selected.has(w.word))
      .map(w => ({
        m: w.word,
        e: w.meaning || translations[w.word] || w.word,
        t: deck,
        p: 'n',
        ex: `${w.word} (${w.meaning || translations[w.word] || '?'}).`,
        mn: '',
      }))
    addCards(cards)
    setSelected(new Set())
    alert(`Added ${cards.length} cards to "${deck}"!`)
  }

  return (
    <div className="space-y-3 animate-fadeUp">
      <h2 className="text-lg font-bold">Import Text</h2>
      <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
        Paste any Malay text. Known words are highlighted — click to add to your deck.
      </p>

      <textarea value={text} onChange={e => setText(e.target.value)}
        className="w-full p-4 rounded-2xl text-sm outline-none resize-y"
        style={{
          background: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
          color: 'var(--color-text)', minHeight: 140,
        }}
        placeholder="Paste Malay text here..." />

      <div className="flex gap-2">
        <input type="text" value={deck} onChange={e => setDeck(e.target.value)}
          className="flex-1 p-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
          placeholder="Deck name..." />
        <button onClick={processText} className="px-5 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2"
          style={{ background: 'var(--color-accent)' }}>
          <Search size={14} /> Process
        </button>
      </div>

      {/* Processed words */}
      {words.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">{words.length} words found</h3>
            <div className="flex gap-2 text-[10px]">
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--color-green)' }}>
                Dict: {words.filter(w => w.type === 'dict').length}
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(179,136,255,0.15)', color: 'var(--color-purple)' }}>
                Phrase: {words.filter(w => w.type === 'phrase').length}
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(122,122,158,0.15)', color: 'var(--color-dim)' }}>
                Unknown: {words.filter(w => w.type === 'unknown').length}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {words.map((w, i) => {
              const isSelected = selected.has(w.word)
              const colors = {
                dict: 'var(--color-green)',
                phrase: 'var(--color-purple)',
                unknown: 'var(--color-dim)',
              }
              return (
                <button key={i} onClick={() => {
                  toggleWord(w.word)
                  if (w.type === 'unknown') translateUnknown(w.word)
                }}
                  className="px-2 py-1 rounded-lg text-sm transition-all"
                  style={{
                    background: isSelected ? 'var(--color-accent)' : 'transparent',
                    color: isSelected ? '#fff' : colors[w.type],
                    border: '1px solid ' + (isSelected ? 'var(--color-accent)' : 'var(--color-border)'),
                    cursor: 'pointer',
                  }}>
                  {w.word}
                </button>
              )
            })}
          </div>

          {/* Selected word details */}
          {Array.from(selected).map(word => {
            const w = words.find(x => x.word === word)
            if (!w) return null
            const meaning = w.meaning || translations[w.word] || '...'
            return (
              <div key={word} className="flex items-center gap-3 py-2 border-b last:border-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="font-bold text-sm" style={{ color: 'var(--color-cyan)' }}>{w.word}</span>
                <span className="text-xs" style={{ color: 'var(--color-dim)' }}>{meaning}</span>
                <button onClick={() => speak(w.word)} className="ml-auto" style={{ color: 'var(--color-cyan)' }}>
                  <Volume2 size={14} />
                </button>
              </div>
            )
          })}

          {selected.size > 0 && (
            <button onClick={addSelected}
              className="w-full mt-3 py-3 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2"
              style={{ background: 'var(--color-green)' }}>
              <Plus size={14} /> Add {selected.size} cards to "{deck}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
