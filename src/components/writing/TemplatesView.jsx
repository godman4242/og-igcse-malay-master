import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { KARANGAN_TEMPLATES } from '../../data/writing'

export default function TemplatesView() {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
        Paper 4 Q3 karangan structures with penanda wacana and example phrases.
      </p>
      {KARANGAN_TEMPLATES.map(t => {
        const isOpen = expanded === t.id
        return (
          <div key={t.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <button onClick={() => setExpanded(isOpen ? null : t.id)}
              className="w-full flex items-center justify-between p-4">
              <div className="text-left">
                <h3 className="font-bold text-sm">{t.title}</h3>
                <p className="text-xs" style={{ color: 'var(--color-dim)' }}>{t.titleEn} · {t.wordTarget} words</p>
              </div>
              {isOpen ? <ChevronUp size={16} style={{ color: 'var(--color-dim)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-dim)' }} />}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                {/* Structure */}
                <div className="space-y-2">
                  {t.structure.map((s, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: 'var(--color-accent2)' }}>{i + 1}</span>
                        <span className="text-sm font-bold">{s.section}</span>
                      </div>
                      <p className="text-xs mb-1" style={{ color: 'var(--color-dim)' }}>{s.hint}</p>
                      <p className="text-xs italic px-2 py-1.5 rounded-lg" style={{ background: 'rgba(0,229,255,0.08)', color: 'var(--color-cyan)' }}>
                        {s.example}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Penanda Wacana */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)' }}>
                  <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--color-green)' }}>Penanda Wacana to use:</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {t.markers.map((m, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full font-semibold"
                        style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--color-green)' }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
