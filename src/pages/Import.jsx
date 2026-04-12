import { useState } from 'react'
import { Plus, Search, Volume2, FileText, Languages, Undo2 } from 'lucide-react'
import useStore from '../store/useStore'
import DICTIONARY from '../data/dictionary'
import { translateWord } from '../lib/translate'
import { speak } from '../lib/speech'

// Phrases sorted longest-first for detection
const PHRASES = Object.keys(DICTIONARY).filter(k => k.includes(' ') || k.includes('-')).sort((a, b) => b.length - a.length)

// Simple stemming for Malay — strip common prefixes/suffixes to find root
function stem(word) {
  let w = word.toLowerCase()
  // Strip prefixes
  for (const p of ['memper','menge','meny','meng','mem','men','me','ber','di','ter','pe','se','ke']) {
    if (w.startsWith(p) && w.length > p.length + 2) {
      const root = w.slice(p.length)
      if (DICTIONARY[root]) return root
      // Try restoring dropped consonants (meN- rules)
      if (p === 'men' && DICTIONARY['t' + root]) return 't' + root
      if (p === 'meny' && DICTIONARY['s' + root]) return 's' + root
      if (p === 'mem' && DICTIONARY['p' + root]) return 'p' + root
      if (p === 'meng' && DICTIONARY['k' + root]) return 'k' + root
    }
  }
  // Strip suffixes
  for (const s of ['kan','an','i']) {
    if (w.endsWith(s) && w.length > s.length + 2) {
      const root = w.slice(0, -s.length)
      if (DICTIONARY[root]) return root
    }
  }
  return null
}

export default function Import() {
  const [text, setText] = useState('')
  const [words, setWords] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [translations, setTranslations] = useState({})
  const [deck, setDeck] = useState('Imported')
  const [wordByWord, setWordByWord] = useState(null)
  const [wbwLoading, setWbwLoading] = useState(false)
  const [lastAdded, setLastAdded] = useState(null)
  const addCards = useStore(s => s.addCards)

  const processWordByWord = async () => {
    if (!text.trim()) return
    setWbwLoading(true)
    const rawWords = text.split(/\s+/).filter(w => w.length > 0)
    const result = []
    for (const raw of rawWords) {
      const clean = raw.replace(/[^a-zA-Z-]/g, '').toLowerCase()
      if (!clean) { result.push({ word: raw, meaning: null, source: 'skip' }); continue }
      // 1. Direct dictionary lookup
      if (DICTIONARY[clean]) {
        result.push({ word: raw, meaning: DICTIONARY[clean], source: 'dict' })
        continue
      }
      // 2. Stemming
      const stemmed = stem(clean)
      if (stemmed) {
        result.push({ word: raw, meaning: DICTIONARY[stemmed], source: 'stem' })
        continue
      }
      // 3. Google Translate fallback
      try {
        const t = await translateWord(clean)
        result.push({ word: raw, meaning: t.text, source: 'google' })
      } catch {
        result.push({ word: raw, meaning: '?', source: 'unknown' })
      }
    }
    setWordByWord(result)
    setWbwLoading(false)
  }

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
      const clean = raw.replace(/[^a-zA-Z-]/g, '').toLowerCase()
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
    const newCards = words
      .filter(w => selected.has(w.word))
      .map(w => ({
        m: w.word,
        e: w.meaning || translations[w.word] || w.word,
        t: deck,
        p: 'n',
        ex: `${w.word} (${w.meaning || translations[w.word] || '?'}).`,
        mn: '',
      }))
    addCards(newCards)
    setLastAdded({ cards: newCards, time: Date.now() })
    setSelected(new Set())
    // Auto-clear undo after 10 seconds
    setTimeout(() => setLastAdded(prev => prev && Date.now() - prev.time >= 9500 ? null : prev), 10000)
  }

  const undoLastAdd = () => {
    if (!lastAdded) return
    const store = useStore.getState()
    const keysToRemove = new Set(lastAdded.cards.map(c => `${c.m}::${c.t}`))
    const filtered = store.cards.filter(c => !keysToRemove.has(`${c.m}::${c.t}`))
    useStore.setState({ cards: filtered })
    setLastAdded(null)
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

      {/* Word-by-word button */}
      <button onClick={processWordByWord} disabled={!text.trim() || wbwLoading}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-cyan)',
          opacity: !text.trim() || wbwLoading ? 0.5 : 1,
        }}>
        <Languages size={14} /> {wbwLoading ? 'Translating...' : 'Word-by-Word Translation'}
      </button>

      {/* Word-by-word display */}
      {wordByWord && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Languages size={14} style={{ color: 'var(--color-cyan)' }} /> Word-by-Word
          </h3>
          <div className="flex flex-wrap gap-1 leading-relaxed">
            {wordByWord.map((w, i) => {
              if (w.source === 'skip') return <span key={i} className="text-sm">{w.word} </span>
              const color = w.source === 'dict' ? 'var(--color-green)'
                : w.source === 'stem' ? 'var(--color-cyan)'
                : 'var(--color-orange)'
              return (
                <span key={i} className="text-sm inline" style={{ color }}>
                  {w.word}
                  <span className="text-[10px]" style={{ color: 'var(--color-dim)' }}>
                    ({w.meaning})
                  </span>{' '}
                </span>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3 text-[10px]">
            <span style={{ color: 'var(--color-green)' }}>● Dictionary</span>
            <span style={{ color: 'var(--color-cyan)' }}>● Stemmed</span>
            <span style={{ color: 'var(--color-orange)' }}>● Google Translate</span>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {lastAdded && (
        <button onClick={undoLastAdd}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ background: 'rgba(255,145,0,0.15)', border: '1px solid var(--color-orange)', color: 'var(--color-orange)' }}>
          <Undo2 size={14} /> Undo — remove {lastAdded.cards.length} cards
        </button>
      )}

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
              <Plus size={14} /> Add {selected.size} cards to &quot;{deck}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
