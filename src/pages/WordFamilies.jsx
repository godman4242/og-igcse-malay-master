import { useState, useMemo, useDeferredValue } from 'react'
import { Search, BookOpen, AlertTriangle } from 'lucide-react'
import WORD_FAMILIES from '../data/wordFamilies'
import WordFamilyTree from '../components/WordFamilyTree'
import useStore from '../store/useStore'
import Meta from '../components/Meta'

const allRoots = Object.keys(WORD_FAMILIES).sort()

export default function WordFamilies() {
  const [search, setSearch] = useState('')
  // Keep the input responsive — defer the filter recomputation so a fast typist
  // doesn't block on the 41-root list re-render between keystrokes.
  const deferredSearch = useDeferredValue(search)
  const [expanded, setExpanded] = useState(null)
  const mistakes = useStore(s => s.mistakes)

  // Find root words related to mistakes
  const relatedRoots = useMemo(() => {
    const roots = new Set()
    const activeMistakes = mistakes.filter(m => !m.reviewed)
    activeMistakes.forEach(m => {
      const word = m.word.toLowerCase()
      // Check if any root is contained in the mistake word
      allRoots.forEach(root => {
        if (word.includes(root)) roots.add(root)
        // Also check if any derived form matches
        const family = WORD_FAMILIES[root]
        family.forms.forEach(f => {
          if (f.word.toLowerCase() === word || word.includes(f.word.toLowerCase())) {
            roots.add(root)
          }
        })
      })
    })
    return Array.from(roots)
  }, [mistakes])

  // Filter by search — driven by the deferred value so React can keep the
  // input field responsive while the list updates.
  const filtered = useMemo(() => {
    if (!deferredSearch.trim()) return allRoots
    const q = deferredSearch.toLowerCase().trim()
    return allRoots.filter(root => {
      if (root.includes(q)) return true
      const family = WORD_FAMILIES[root]
      if (family.meaning.toLowerCase().includes(q)) return true
      return family.forms.some(f =>
        f.word.toLowerCase().includes(q) || f.meaning.toLowerCase().includes(q)
      )
    })
  }, [deferredSearch])

  return (
    <div className="space-y-4 animate-fadeUp">
      <Meta 
        title="Word Families | IGCSE Malay Master" 
        description="Explore Malay root words and their derived forms (imbuhan). Visual family trees to help you master vocabulary."
      />
      <h2 className="text-lg font-bold flex items-center gap-2">
        <BookOpen size={18} style={{ color: 'var(--color-accent)' }} />
        Word Families
      </h2>
      <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
        Each root branches into its imbuhan-derived forms — tap any node to hear it, tap the + to add it to your deck.
      </p>

      {/* Search */}
      <div className="relative" data-guide="wordfamilies-search">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-dim)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          placeholder="Search root, word, or meaning..." />
      </div>

      {/* Related to your mistakes */}
      {relatedRoots.length > 0 && !search && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,145,0,0.06)', border: '1px solid rgba(255,145,0,0.2)' }}>
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-orange)' }}>
            <AlertTriangle size={14} /> Related to Your Mistakes
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {relatedRoots.map(root => (
              <button key={root} onClick={() => { setExpanded(expanded === root ? null : root); setSearch('') }}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: expanded === root ? 'var(--color-orange)' : 'rgba(255,145,0,0.12)',
                  color: expanded === root ? '#fff' : 'var(--color-orange)',
                }}>
                {root}
              </button>
            ))}
          </div>
          {expanded && WORD_FAMILIES[expanded] && (
            <div className="mt-3">
              <WordFamilyTree family={WORD_FAMILIES[expanded]} />
            </div>
          )}
        </div>
      )}

      {/* Root word grid */}
      <div className="space-y-2">
        {filtered.map((root, idx) => {
          const family = WORD_FAMILIES[root]
          const isExpanded = expanded === root

          return (
            <div key={root}>
              <button onClick={() => setExpanded(isExpanded ? null : root)}
                {...(idx === 0 ? { 'data-guide': 'wordfamilies-roots' } : {})}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                style={{
                  background: isExpanded ? 'var(--color-accent)' : 'var(--color-card)',
                  border: '1px solid ' + (isExpanded ? 'var(--color-accent)' : 'var(--color-border)'),
                  color: isExpanded ? '#fff' : 'var(--color-text)',
                }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{root}</span>
                  <span className="text-[10px]" style={{ color: isExpanded ? 'rgba(255,255,255,0.7)' : 'var(--color-dim)' }}>
                    {family.meaning}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: isExpanded ? 'rgba(255,255,255,0.2)' : 'var(--color-surface)',
                    color: isExpanded ? '#fff' : 'var(--color-dim)',
                  }}>
                  {family.forms.length}
                </span>
              </button>
              {isExpanded && (
                <div className="mt-2">
                  <WordFamilyTree family={family} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: 'var(--color-dim)' }}>No word families found for "{search}"</p>
        </div>
      )}
    </div>
  )
}
