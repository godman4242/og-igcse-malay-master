import { useState } from 'react'
import { score as gradeWriting } from '../lib/writingGrader'
import { isGeminiAvailable, fetchAIGrade } from '../lib/gemini'
import { useAI } from '../lib/ai'
import { harvestMistakesFromGrade, harvestAIImprovements } from '../lib/writingMistakeHarvest'
import { buildAttemptEntry } from '../lib/writingReattempt'
import useStore from '../store/useStore'
import { tryParseJSON } from '../lib/json'
import { buildLearnerProfile } from '../lib/learnerProfile'
import { parseWritingFeedbackV2 } from '../lib/writingFeedbackV2Parser'

/**
 * Owns the Writing page's evaluator state machine. Inputs are the
 * page-level controls (`lang`, `format`, `mlPaper`); outputs are the
 * essay text, the grader/AI results, and the action functions.
 *
 * Two AI paths run independently:
 *   - English Gemini hybrid grader (overrides local band when available)
 *     fires automatically inside `analyze()`.
 *   - Claude-via-Edge-Function `getAIFeedback()` is opt-in (the user
 *     clicks the button and uses one of their daily quota calls).
 */
export default function useWritingEvaluator({ lang, format, mlPaper, task }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [aiFeedbackV2, setAiFeedbackV2] = useState(null)
  const [v2ParseRejected, setV2ParseRejected] = useState(null)
  const [isAIGrading, setIsAIGrading] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null) // inline notice (replaces blocking alerts)
  const [aiGradeUnavailable, setAiGradeUnavailable] = useState(false) // true only on AI-grade failure (drives the BYOK nudge)
  const ai = useAI()

  const logWritingFeedback = useStore(s => s.logWritingFeedback)
  const logMistakeBatch = useStore(s => s.logMistakeBatch)
  const useAdaptiveScaffolding = useStore(s => s.ui?.useAdaptiveScaffolding ?? true)

  const analyze = async () => {
    // A fresh local grade replaces the prior AI artifacts — otherwise stale
    // v2 annotations from a previous analysis would paint over the new text.
    setAiFeedback(null)
    setAiFeedbackV2(null)
    setV2ParseRejected(null)
    setAnalyzeError(null)
    setAiGradeUnavailable(false)
    const r = gradeWriting(text, {
      lang: lang === 'eng' ? 'eng' : 'malay',
      format,
      paper: mlPaper,
    })
    if (r.error) {
      setAnalyzeError(r.message)
      return
    }
    const harvested = harvestMistakesFromGrade(r, { lang, format })
    if (harvested.length && logMistakeBatch) logMistakeBatch(harvested)

    // English path: if Gemini is configured, run the AI hybrid grader.
    if (lang === 'eng' && isGeminiAvailable()) {
      r.aiGrade = null
      setResults(r)
      setIsAIGrading(true)
      try {
        // `task` is optional: undefined → byte-identical to the pre-Task-3 call
        // (no Content axis requested). Only an English task picked in Writing.jsx
        // makes fetchAIGrade ask for content_band / content_justification / coverage.
        const aiResponse = await fetchAIGrade(text, r.formatHints, r.metrics, r.errorSummary, r.findings, undefined, task)
        setResults(prev => ({
          ...prev,
          aiGrade: aiResponse,
          band: aiResponse.band, // AI band overrides local band
        }))
        // Durably capture the task gap (act-on-feedback loop). buildAttemptEntry
        // adds taskId/contentBand/coverage ONLY when a task was graded; with no
        // task it yields exactly today's {lang,format,band,words} (no migration).
        logWritingFeedback?.(buildAttemptEntry({
          lang: 'eng', format: r.format, band: aiResponse.band, words: r.words,
          task, aiResponse,
        }))
        const aiHarvest = harvestAIImprovements(aiResponse, { format: r.format })
        if (aiHarvest.length && logMistakeBatch) logMistakeBatch(aiHarvest)
      } catch (err) {
        console.error('AI Grading failed', err)
        setAnalyzeError('AI grade unavailable right now — showing your local grade instead.')
        setAiGradeUnavailable(true)
        // Fallback to local band on AI failure. AI down → no Content band; an
        // honest null contentBand is recorded when a task was selected.
        logWritingFeedback?.(buildAttemptEntry({
          lang: 'eng', format: r.format, band: r.band, words: r.words,
          task, aiResponse: null,
        }))
      } finally {
        setIsAIGrading(false)
      }
      return
    }

    // Malay or no-Gemini path: local band only. For Malay, `task` is undefined
    // (Writing.jsx only sets a task for English) → buildAttemptEntry yields
    // exactly today's {lang,format,band,words}. For English-without-Gemini a task
    // may be selected → it records taskId with contentBand:null (honest).
    setResults(r)
    logWritingFeedback?.(buildAttemptEntry({
      lang: lang === 'eng' ? 'eng' : 'malay', format: r.format, band: r.band, words: r.words,
      task, aiResponse: null,
    }))
  }

  const getAIFeedback = async () => {
    if (!text || text.length < 30) return
    setAiFeedback(null)
    setAiFeedbackV2(null)
    setV2ParseRejected(null)

    // v2 path — annotated feedback, scaffold-aware. Gated behind the user's
    // adaptive-scaffolding toggle (Settings). On any parse/network failure we
    // fall through to the v1 path so the user always sees feedback.
    if (useAdaptiveScaffolding) {
      let profile = null
      try {
        profile = buildLearnerProfile(useStore.getState(), {
          lang: lang === 'eng' ? 'en' : 'ms',
        })
      } catch (err) {
        console.warn('[writing-feedback-v2] buildLearnerProfile threw, sending null:', err)
      }
      try {
        const result = await ai.call({
          action: 'writing-feedback-v2',
          payload: {
            text,
            format: format && format !== 'auto' ? format : (results?.format || 'general'),
            lang: lang === 'eng' ? 'en' : 'ms',
            maxTokens: 2048,
            learnerProfile: profile,
          },
          stream: false,
        })
        const parsed = parseWritingFeedbackV2(result.response, text)
        if (parsed.ok) {
          setAiFeedbackV2(parsed.data)
          return
        }
        console.warn('[writing-feedback-v2] parser rejected:', parsed.reason)
        setV2ParseRejected(parsed.reason || 'unknown')
      } catch (err) {
        // 404 (function not deployed), 429 (rate limit), network — all funnel
        // into the v1 path below; `ai.error` carries surfaceable detail.
        console.warn('[writing-feedback-v2] request failed, trying v1:', err?.message || err)
      }
    }

    // v1 path — preserved as the fallback (and the only path when the user
    // has the adaptive-scaffolding toggle off).
    try {
      const result = await ai.call({
        action: 'writing-feedback',
        payload: {
          messages: [{ role: 'user', content: text }],
          scenarioContext: lang === 'malay'
            ? `The essay is written in Malay. Focus on Malay grammar, imbuhan, and IGCSE criteria. Paper ${mlPaper}.`
            : 'The essay is written in English. Focus on English grammar and IGCSE criteria.',
        },
        stream: false,
      })
      const parsed = typeof result.response === 'string' ? tryParseJSON(result.response) : result.response
      setAiFeedback(parsed)
    } catch (err) {
      // Surface via ai.error in the hosting page. Log too so a developer
      // reading DevTools can tell v1 also failed (not just v2).
      console.warn('[writing-feedback v1] also failed:', err?.message || err)
    }
  }

  // Resetters for the page to call when the lang toggle flips.
  const reset = () => {
    setText('')
    setResults(null)
    setAiFeedback(null)
    setAiFeedbackV2(null)
    setV2ParseRejected(null)
    setAnalyzeError(null)
    setAiGradeUnavailable(false)
  }

  return {
    text, setText,
    results, setResults,
    aiFeedback, setAiFeedback,
    aiFeedbackV2,
    v2ParseRejected,
    isAIGrading,
    analyzeError,
    aiGradeUnavailable,
    analyze,
    getAIFeedback,
    ai,
    reset,
  }
}
