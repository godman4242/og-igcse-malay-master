import { useState } from 'react'
import { score as gradeWriting } from '../lib/writingGrader'
import { isGeminiAvailable, fetchAIGrade } from '../lib/gemini'
import { useAI } from '../lib/ai'
import { harvestMistakesFromGrade, harvestAIImprovements } from '../lib/writingMistakeHarvest'
import useStore from '../store/useStore'
import { tryParseJSON } from '../lib/json'

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
export default function useWritingEvaluator({ lang, format, mlPaper }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [isAIGrading, setIsAIGrading] = useState(false)
  const ai = useAI()

  const logWritingFeedback = useStore(s => s.logWritingFeedback)
  const logMistakeBatch = useStore(s => s.logMistakeBatch)

  const analyze = async () => {
    const r = gradeWriting(text, {
      lang: lang === 'eng' ? 'eng' : 'malay',
      format,
      paper: mlPaper,
    })
    if (r.error) {
      alert(r.message)
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
        const aiResponse = await fetchAIGrade(text, r.formatHints, r.metrics, r.errorSummary, r.findings)
        setResults(prev => ({
          ...prev,
          aiGrade: aiResponse,
          band: aiResponse.band, // AI band overrides local band
        }))
        logWritingFeedback?.({
          lang: 'eng',
          format: r.format,
          band: aiResponse.band,
          words: r.words,
        })
        const aiHarvest = harvestAIImprovements(aiResponse, { format: r.format })
        if (aiHarvest.length && logMistakeBatch) logMistakeBatch(aiHarvest)
      } catch (err) {
        console.error('AI Grading failed', err)
        alert('AI Grading failed (falling back to local grade): ' + err.message)
        // Fallback to local band on AI failure.
        logWritingFeedback?.({
          lang: 'eng',
          format: r.format,
          band: r.band,
          words: r.words,
        })
      } finally {
        setIsAIGrading(false)
      }
      return
    }

    // Malay or no-Gemini path: local band only.
    setResults(r)
    logWritingFeedback?.({
      lang: lang === 'eng' ? 'eng' : 'malay',
      format: r.format,
      band: r.band,
      words: r.words,
    })
  }

  const getAIFeedback = async () => {
    if (!text || text.length < 30) return
    setAiFeedback(null)
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
    } catch {
      // Surface via ai.error in the hosting page.
    }
  }

  // Resetters for the page to call when the lang toggle flips.
  const reset = () => {
    setText('')
    setResults(null)
    setAiFeedback(null)
  }

  return {
    text, setText,
    results, setResults,
    aiFeedback, setAiFeedback,
    isAIGrading,
    analyze,
    getAIFeedback,
    ai,
    reset,
  }
}
