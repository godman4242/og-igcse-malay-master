import { useState, useRef } from 'react'
import { Sparkles, Send, Loader2, AlertCircle, X } from 'lucide-react'
import { isGeminiAvailable } from '../lib/gemini'
import { callTextAI } from '../lib/aiText'
import { isOpenRouterAvailable, callOpenRouter } from '../lib/openrouter'
import useStore from '../store/useStore'

function buildSystemPrompt({ lang, formatLabel, band, subBands, metrics, findings }) {
  const isMalay = lang === 'malay'
  const langName = isMalay ? 'Bahasa Melayu' : 'English'

  // Pre-compute the heuristic evidence block — this is the rule engine's
  // findings, given to the LLM as ground truth so it stops inventing
  // issues that aren't there. Available for both English and Malay
  // essays now (separate engines: writingErrors.js, writingErrorsMalay.js).
  let evidenceBlock = ''
  if (findings?.length || subBands || metrics) {
    const lines = []
    if (subBands) {
      lines.push(`Heuristic sub-bands — Content ${subBands.content}, Accuracy ${subBands.accuracy}, Vocabulary ${subBands.vocab}, Sentence Variety ${subBands.variety}, Cohesion ${subBands.cohesion}, Format ${subBands.format}.`)
    }
    if (metrics) {
      lines.push(`Metrics — TTR ${metrics.ttr}, sentence-length σ ${metrics.sentLenStd}, complex/total ${metrics.complexRatio}, opener variety ${metrics.openerVariety}, errors/100w (high) ${metrics.errorsPer100}, errors/100w (all) ${metrics.allErrorsPer100}.`)
    }
    if (findings?.length) {
      const top = findings.slice(0, 25)
      lines.push(`Rule-engine findings (${findings.length} total, top ${top.length} below). These are pre-verified — agree or disagree, do not invent new ones.`)
      for (const f of top) {
        const fix = f.suggestion ? ` → "${f.suggestion}"` : ''
        lines.push(`  [${f.severity}|${f.type}] "${f.excerpt}"${fix} — ${f.message}`)
      }
    }
    evidenceBlock = '\nLOCAL HEURISTIC EVIDENCE (use this as ground truth for what is actually in the text):\n' + lines.join('\n') + '\n'
  }

  // Language-specific guidance — what to actually look for and call out.
  const langGuidance = isMalay
    ? `MALAY-SPECIFIC FOCUS:
- Imbuhan correctness: meN- (mem-, men-, meng-, meny-), ber-, di-, ter-, peN-, -an, -kan, -i. Wrong assimilation is a common error.
- Active vs passive voice (di- forms) — students often default to active when passive sounds more natural.
- Tense markers: sudah (completed), sedang (ongoing), akan (future), telah (formal completed), pernah (ever), belum (not yet).
- Connectors / kata hubung: kerana, tetapi, walaupun, supaya, apabila, jika, sambil, lalu, kemudian. Range matters at higher bands.
- Discourse markers (penanda wacana): selain itu, walau bagaimanapun, sebagai contoh, kesimpulannya, oleh itu — these lift band 4 essays into band 5/6 if used naturally.
- Register: formal Malay avoids je, lah, nak, takpe, etc. Slang use should be flagged.`
    : `ENGLISH-SPECIFIC FOCUS:
- Tense consistency: shifting between past and present mid-paragraph is a frequent error.
- Subject-verb agreement, especially with collective nouns (the team is/are) and indefinite pronouns (everyone has, not have).
- Punctuation precision: comma splices, run-ons, and missing apostrophes (it's vs its).
- Linking phrases: however, moreover, in contrast, consequently, despite, although. Range matters at higher bands.
- Sentence variety: monotony of simple sentences is a band-4 marker; complex/compound-complex variety lifts to band 5/6.
- Register match to format: directed writing (letter, report, article, speech) demands different register; an article shouldn't read like a personal diary.
- Vocabulary precision: replace vague "thing", "stuff", "very good" with specific nouns and verbs.`

  // Determine scaffolding intensity based on band.
  // Band 1-2: 1 fix (Overwhelming a struggling student is counter-productive).
  // Band 3-4: 2 fixes.
  // Band 5-6: 3 fixes + 1 "Nuance" upgrade.
  const fixLimit = band <= 2 ? 1 : band <= 4 ? 2 : 3
  const scaffoldTone = band <= 3 ? 'EXTREMELY ENCOURAGING & SIMPLE' : 'DIRECT & PROFESSIONAL'

  return `You are an IGCSE ${langName} Writing Coach. Your goal is NOT to fix everything, but to provide "Desirable Difficulty" — the smallest amount of feedback that helps the student level up.

Format: ${formatLabel || 'general writing'}
Student Current Band: ${band ?? 'unknown'} / 6
COGNITIVE BUDGET: You are restricted to exactly ${fixLimit} corrections. IGNORE all other errors.

${langGuidance}
${evidenceBlock}

INSTRUCTIONS:
1. Tone: ${scaffoldTone}. Use clear, simple language.
2. Structure:
   - **Status**: One sentence on their current progress vs Band 6 descriptors.
   - **One Thing You Nailed**: Highlight one specific success with a quote.
   - **The Focus Area (Coach's Choice)**: You have a budget of ${fixLimit} fixes. For each:
     - **Hint**: Give a Socratic hint or name the rule (e.g. "Look at your meN- prefix here...")
     - **The Issue**: Verbatim quote in \`backticks\` + one sentence explanation.
     - **The Solution**: The corrected version.
   - **Model Fragment**: Rewrite ONLY the most problematic sentence (or the opening) to show a Band 6 version.
   - **The 1-Minute Drill**: One specific, repetitive task for them to do now (e.g. "Find 3 other verbs starting with 'P' and apply the meN- rule").

Be a coach, not an examiner. Do not overwhelm. No emoji. No preamble.`
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
      // Routed: a user's own OpenRouter key (if set) takes over here too, else
      // the server Gemini default — so the tutor honours BYOK without forcing
      // the user to switch the provider toggle.
      return callTextAI({ systemPrompt, messages, signal, maxTokens: 1200 })
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
        subBands: results.subBands,
        metrics: results.metrics,
        findings: results.findings,
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
        subBands: results.subBands,
        metrics: results.metrics,
        findings: results.findings,
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
