import { useState, useRef } from 'react'
import { Sparkles, Send, Loader2, AlertCircle, X } from 'lucide-react'
import { isGeminiAvailable, callGemini } from '../lib/gemini'
import { isOpenRouterAvailable, callOpenRouter } from '../lib/openrouter'
import useStore from '../store/useStore'

function buildSystemPrompt({ lang, formatLabel, band }) {
  const langName = lang === 'malay' ? 'Bahasa Melayu' : 'English'
  return `You are an IGCSE ${langName} writing tutor for a 16-year-old student.
The essay below is being graded for the IGCSE ${langName} exam.
Format expected: ${formatLabel || 'general writing'}
Current heuristic band: ${band ?? 'unknown'} / 6.

Give feedback in this exact structure:

1) **Strengths (2 bullets)** — concrete things the student already did well.
2) **Top 3 fixes** — for each: quote 4-8 words from the essay (in backticks), explain the issue in one short sentence, and give a corrected version.
3) **Model rewrite of the opening paragraph** — show how a band 6 student would open this essay. Keep it short (2-3 sentences).
4) **Next step** — one sentence telling the student what to practise next.

Be specific, not generic. Address ${langName} grammar issues (imbuhan, tense markers, kata hubung) when relevant. No marketing fluff.`
}

export default function WritingTutor({ text, results, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [response, setResponse] = useState(null)
  const [followUp, setFollowUp] = useState('')
  const [history, setHistory] = useState([]) // [{role, content}]
  const provider = useStore(s => s.writingTutor?.provider ?? 'gemini')
  const setProvider = useStore(s => s.setWritingTutorProvider)
  const abortRef = useRef(null)

  const callProvider = async (messages, systemPrompt) => {
    const signal = (abortRef.current = new AbortController()).signal
    if (provider === 'gemini') {
      if (!isGeminiAvailable()) throw new Error('Add VITE_GEMINI_KEY to .env.local to use Gemini.')
      return callGemini({ systemPrompt, messages, signal, maxTokens: 1200 })
    }
    if (provider === 'openrouter') {
      if (!isOpenRouterAvailable()) throw new Error('Add VITE_OPENROUTER_KEY to .env.local to use OpenRouter.')
      return callOpenRouter({ systemPrompt, messages, signal, maxTokens: 1200 })
    }
    throw new Error('Unsupported tutor provider')
  }

  const runInitial = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const systemPrompt = buildSystemPrompt({
        lang: results.isMalay ? 'malay' : 'eng',
        formatLabel: results.formatLabel,
        band: results.band,
      })
      const messages = [{ role: 'user', content: text }]
      const out = await callProvider(messages, systemPrompt)
      setResponse(out)
      setHistory([...messages, { role: 'assistant', content: out }])
    } catch (e) {
      setError(e?.message || 'Tutor request failed.')
    } finally {
      setLoading(false)
    }
  }

  const ask = async () => {
    if (!followUp.trim()) return
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = buildSystemPrompt({
        lang: results.isMalay ? 'malay' : 'eng',
        formatLabel: results.formatLabel,
        band: results.band,
      })
      const userMsg = { role: 'user', content: followUp }
      const messages = [...history, userMsg]
      const out = await callProvider(messages, systemPrompt)
      setHistory([...messages, { role: 'assistant', content: out }])
      setResponse(out)
      setFollowUp('')
    } catch (e) {
      setError(e?.message || 'Tutor request failed.')
    } finally {
      setLoading(false)
    }
  }

  const noProvider =
    (provider === 'gemini' && !isGeminiAvailable()) ||
    (provider === 'openrouter' && !isOpenRouterAvailable())

  return (
    <div className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-accent2)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--color-accent2)' }} /> AI Writing Tutor
        </h3>
        <div className="flex items-center gap-2">
          <select value={provider} onChange={(e) => setProvider?.(e.target.value)}
            className="text-xs px-2 py-1 rounded outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <option value="gemini">Gemini Flash</option>
            <option value="openrouter">OpenRouter (free)</option>
          </select>
          {onClose && (
            <button onClick={onClose} style={{ color: 'var(--color-dim)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {noProvider && (
        <div className="rounded-lg p-3 text-xs flex items-start gap-2"
          style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)', border: '1px solid rgba(255,145,0,0.2)' }}>
          <AlertCircle size={12} className="mt-0.5" />
          <span>
            {provider === 'gemini' ? 'Add VITE_GEMINI_KEY to .env.local to enable the Gemini tutor.' : 'Add VITE_OPENROUTER_KEY to .env.local to enable OpenRouter.'}
          </span>
        </div>
      )}

      {!response && !loading && !noProvider && (
        <button onClick={runInitial}
          className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent2)' }}>
          <Sparkles size={14} /> Get tutor feedback
        </button>
      )}

      {loading && (
        <div className="text-sm flex items-center gap-2" style={{ color: 'var(--color-dim)' }}>
          <Loader2 size={14} className="animate-spin" /> Tutor is thinking…
        </div>
      )}

      {error && (
        <div className="rounded-lg p-3 text-xs flex items-start gap-2"
          style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.2)' }}>
          <AlertCircle size={12} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {response && (
        <div className="text-sm whitespace-pre-wrap leading-relaxed"
          style={{ color: 'var(--color-text)' }}>
          {response}
        </div>
      )}

      {response && (
        <div className="flex gap-2">
          <input value={followUp} onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) ask() }}
            placeholder="Ask a follow-up — 'why did you change X?'"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <button onClick={ask} disabled={loading || !followUp.trim()}
            className="px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1"
            style={{ background: 'var(--color-accent)', color: '#fff', opacity: loading || !followUp.trim() ? 0.5 : 1 }}>
            <Send size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
