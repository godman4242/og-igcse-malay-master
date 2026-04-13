import { Volume2, Plus } from 'lucide-react'
import { speak } from '../lib/speech'
import useStore from '../store/useStore'

const POS_COLORS = {
  verb: { bg: 'rgba(68,138,255,0.12)', color: 'var(--color-blue)', label: 'Kata Kerja' },
  noun: { bg: 'rgba(0,230,118,0.12)', color: 'var(--color-green)', label: 'Kata Nama' },
  adj: { bg: 'rgba(179,136,255,0.12)', color: 'var(--color-purple)', label: 'Kata Sifat' },
}

export default function WordFamilyCard({ family, compact = false }) {
  const addCard = useStore(s => s.addCard)

  const handleAddCard = (form) => {
    addCard({
      m: form.word,
      e: form.meaning,
      t: 'Word Families',
      p: form.pos,
      ex: `${form.word} (${form.type}) — from root "${family.root}"`,
      mn: '',
    })
  }

  // Group forms by POS
  const grouped = { verb: [], noun: [], adj: [] }
  family.forms.forEach(f => {
    const group = grouped[f.pos] || grouped.verb
    group.push(f)
  })

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {/* Root word header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{family.root}</span>
            <button onClick={() => speak(family.root)}
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
              <Volume2 size={12} />
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Root meaning: {family.meaning}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-accent)20', color: 'var(--color-accent)' }}>
          {family.forms.length} forms
        </span>
      </div>

      {/* Forms grouped by POS */}
      {Object.entries(grouped).map(([pos, forms]) => {
        if (forms.length === 0) return null
        const posInfo = POS_COLORS[pos] || POS_COLORS.verb

        return (
          <div key={pos} className="mb-3 last:mb-0">
            <div className="text-[10px] font-bold uppercase mb-1.5 px-1" style={{ color: posInfo.color }}>
              {posInfo.label}
            </div>
            <div className="space-y-1">
              {forms.map(form => (
                <div key={form.word}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: posInfo.bg }}>
                  <button onClick={() => speak(form.word)}
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ color: posInfo.color }}>
                    <Volume2 size={10} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold">{form.word}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded font-mono"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-dim)' }}>
                        {form.type}
                      </span>
                    </div>
                    {!compact && (
                      <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>{form.meaning}</p>
                    )}
                  </div>
                  <button onClick={() => handleAddCard(form)}
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-green)' }}
                    title="Add to flashcards">
                    <Plus size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
