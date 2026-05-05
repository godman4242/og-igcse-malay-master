import { useState, useRef } from 'react'
import { Sparkles, Send, Loader2, AlertCircle, X } from 'lucide-react'
import { isGeminiAvailable, callGemini } from '../lib/gemini'
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

  return `You are an IGCSE ${langName} writing tutor for a 16-year-old student.
Format expected: ${formatLabel || 'general writing'}
Current heuristic band (from local rules): ${band ?? 'unknown'} / 6. Treat this as a hint, not a verdict — your reading of the essay is what matters.

CALIBRATION (abbreviated band descriptors):
- Band 6: ideas developed with detail and originality; consistent control of complex structures; varied precise vocabulary; format conventions handled fluently; few errors and none that obscure meaning.
- Band 5: clear ideas with some development; mostly accurate complex structures; some range in vocabulary; format conventions mostly observed; minor errors don't impede understanding.
- Band 4: ideas present but underdeveloped; mostly simple sentences with attempts at complex; functional vocabulary; format partially controlled; errors sometimes affect clarity.
- Band 3: limited ideas; basic sentences; high-frequency vocabulary; weak format awareness; frequent errors.
- Band 2 and below: minimal communication of ideas; severe error density.

${langGuidance}
${evidenceBlock}
Give feedback in this EXACT structure (no preamble, no "great job!" intro):

1) **Band & one-sentence verdict** — your honest band 1-6 anchored on the descriptors above.
2) **Strengths (2 bullets)** — specific things the student did well, with a short quote in backticks for each.
3) **Top 3 fixes** — for each: quote 4-8 words from the essay in backticks, explain the issue in one sentence, give a corrected version. Prioritise issues that move the band up, not minor typos.
4) **Format check** — one sentence on whether the essay matches ${formatLabel || 'expected conventions'} and what's missing.
5) **Model rewrite of the opening paragraph** — show how a band 6 student would open this essay. 2-3 sentences. Natural, not over-polished.
6) **Next step** — one specific drill the student should do tomorrow (e.g., "Practise three meN- transformations from neutral verbs", "Rewrite the third paragraph using only complex sentences"). Not vague encouragement.

Be honest. Soft-grading helps no one. No marketing fluff. No emoji.`
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
