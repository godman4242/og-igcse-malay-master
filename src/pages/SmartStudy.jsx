import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import SmartSession from '../components/interleaved/SmartSession'
import { Mic, MicOff } from 'lucide-react'

/**
 * SmartStudy — thin route shell at /smart-study.
 * Handles the pre-session speaking toggle before handing off to SmartSession.
 */
export default function SmartStudy() {
  const navigate = useNavigate()
  const [configured, setConfigured] = useState(false)
  const [includeSpeaking, setIncludeSpeaking] = useState(false)

  // Pre-session config screen — shown once before session starts
  if (!configured) {
    return (
      <div className="space-y-5 animate-fadeUp">
        <div className="text-center pt-2 pb-4">
          <p className="text-2xl font-bold mb-1">Smart Session</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-dim)' }}>
            Each session builds from recognition to active production —
            thematic micro-cycles designed for deep, lasting recall.
          </p>
        </div>

        {/* Speaking toggle */}
        <div
          data-guide="smartstudy-speaking"
          className="rounded-2xl p-4"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-sm font-bold mb-3">Speaking tasks</p>
          <div className="flex gap-2">
            <button
              id="smart-study-public-mode"
              onClick={() => setIncludeSpeaking(false)}
              className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
              style={{
                background: !includeSpeaking ? 'rgba(68,138,255,0.12)' : 'var(--color-surface)',
                border: '2px solid ' + (!includeSpeaking ? 'var(--color-blue)' : 'var(--color-border)'),
              }}
            >
              <MicOff size={20} style={{ color: !includeSpeaking ? 'var(--color-blue)' : 'var(--color-dim)' }} />
              <span className="text-xs font-bold" style={{ color: !includeSpeaking ? 'var(--color-blue)' : 'var(--color-dim)' }}>
                Public Mode
              </span>
              <span className="text-[10px] text-center" style={{ color: 'var(--color-dim)' }}>
                No mic needed
              </span>
            </button>
            <button
              id="smart-study-mic-mode"
              onClick={() => setIncludeSpeaking(true)}
              className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
              style={{
                background: includeSpeaking ? 'rgba(255,82,82,0.1)' : 'var(--color-surface)',
                border: '2px solid ' + (includeSpeaking ? 'var(--color-red)' : 'var(--color-border)'),
              }}
            >
              <Mic size={20} style={{ color: includeSpeaking ? 'var(--color-red)' : 'var(--color-dim)' }} />
              <span className="text-xs font-bold" style={{ color: includeSpeaking ? 'var(--color-red)' : 'var(--color-dim)' }}>
                Mic Enabled
              </span>
              <span className="text-[10px] text-center" style={{ color: 'var(--color-dim)' }}>
                Speaking at cycle end
              </span>
            </button>
          </div>
        </div>

        {/* Start button */}
        <button
          id="smart-study-begin-btn"
          data-guide="smartstudy-begin"
          onClick={() => setConfigured(true)}
          className="w-full py-3.5 rounded-2xl font-bold text-base"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))',
            color: '#fff',
          }}
        >
          Begin Session
        </button>

        <button
          data-guide="smartstudy-manual"
          onClick={() => navigate('/study')}
          className="w-full py-2.5 rounded-2xl font-semibold text-sm"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}
        >
          Manual Study Mode
        </button>
      </div>
    )
  }

  // Once configured, hand off to SmartSession
  return (
    <SmartSession
      includeSpeaking={includeSpeaking}
      targetMinutes={20}
      onExit={() => navigate('/')}
    />
  )
}
