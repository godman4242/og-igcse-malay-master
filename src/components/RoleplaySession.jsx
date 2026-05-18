import { useState, useRef, useEffect } from 'react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { Mic, Volume2, Pause, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAI } from '../lib/ai'
import { speakWithBoundaries, tokenizeWithOffsets, startRecognition, hasSpeechRecognition } from '../lib/speech'
import useTheaterMode from '../hooks/useTheaterMode'
import RoleplayScorecard from './RoleplayScorecard'
import DictionaryIcon from './DictionaryIcon'

export default function RoleplaySession({ scenario, onExit }) {
  const [turn, setTurn] = useState(0)
  const [messages, setMessages] = useState(() => {
    const opening = scenario.turns[0]?.examiner || scenario.keyVocab?.[0] || 'Selamat datang!'
    return [{ role: 'examiner', text: opening }]
  })
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [phase, setPhase] = useState('playing') // playing | scoring | done
  const [scoreData, setScoreData] = useState(null)
  // Read-Along state — one in-flight playback at a time, attached to a
  // specific examiner-message index. -1 means nothing is reading.
  const [readingMessageIdx, setReadingMessageIdx] = useState(-1)
  const [readingWordIdx, setReadingWordIdx] = useState(-1)
  const speakerRef = useRef(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const ai = useAI()
  const scoringAI = useAI()
  const reducedMotion = useReducedMotion()
  const { setTheaterMode } = useTheaterMode()

  const sessionActive = phase !== 'done'
  useEffect(() => {
    if (sessionActive) setTheaterMode(true)
    return () => setTheaterMode(false)
  }, [sessionActive, setTheaterMode])

  // Cancel any in-flight read-along on unmount so navigation away (or the
  // scorecard taking over the tree when phase flips to 'done') never leaves
  // the speech synth queue running in the background.
  useEffect(() => {
    return () => {
      if (speakerRef.current) {
        speakerRef.current.cancel()
        speakerRef.current = null
      }
    }
  }, [])

  const stopReadAlong = () => {
    if (speakerRef.current) {
      speakerRef.current.cancel()
      speakerRef.current = null
    }
    setReadingMessageIdx(-1)
    setReadingWordIdx(-1)
  }

  const startReadAlong = (msgIdx, text) => {
    // Cancel anything in flight (including a tap on the same bubble — acts
    // as a restart) before starting fresh.
    if (speakerRef.current) {
      speakerRef.current.cancel()
      speakerRef.current = null
    }
    setReadingMessageIdx(msgIdx)
    setReadingWordIdx(-1)
    speakerRef.current = speakWithBoundaries({
      text,
      lang: scenario.lang === 'en' ? 'en-GB' : 'ms-MY',
      rate: 0.85,
      onWordChange: (idx) => setReadingWordIdx(idx),
      onEnd: () => {
        speakerRef.current = null
        setReadingMessageIdx(-1)
        setReadingWordIdx(-1)
      },
      onError: () => {
        speakerRef.current = null
        setReadingMessageIdx(-1)
        setReadingWordIdx(-1)
      },
    })
  }

  const totalTurns = scenario.totalTurns || scenario.turns.length

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, ai.streamedText])

  const submitResponse = async () => {
    const text = input.trim()
    if (!text || ai.isLoading) return

    // Add student message
    const studentMsg = { role: 'student', text }
    const newMessages = [...messages, studentMsg]
    setMessages(newMessages)
    setInput('')

    const nextTurn = turn + 1

    // Check if this was the last turn
    if (nextTurn >= totalTurns) {
      // Get AI response for final turn, then score
      try {
        const conversationMessages = buildConversationMessages(newMessages)
        const result = await ai.call({
          action: 'roleplay',
          payload: {
            messages: conversationMessages,
            scenarioContext: `${scenario.context} (${scenario.contextEn})`,
            turnInfo: `TURN: ${nextTurn} of ${totalTurns} (FINAL TURN). Wrap up naturally. ${scenario.keyVocab ? `KEY VOCAB: ${scenario.keyVocab.join(', ')}` : ''}`,
          },
        })

        const parsed = parseJSON(result.response)
        if (parsed) {
          setMessages(prev => [...prev, {
            role: 'examiner',
            text: parsed.examinerResponse || result.response,
            feedback: parsed.feedback,
          }])
        }
      } catch {
        // If AI fails, use static closing
        setMessages(prev => [...prev, {
          role: 'examiner',
          text: 'Terima kasih atas jawapan anda. Sesi tamat.',
        }])
      }

      setTurn(nextTurn)
      // Start scoring
      requestScore(newMessages)
      return
    }

    // Normal turn — get AI examiner response
    try {
      const conversationMessages = buildConversationMessages(newMessages)
      const result = await ai.call({
        action: 'roleplay',
        payload: {
          messages: conversationMessages,
          scenarioContext: `${scenario.context} (${scenario.contextEn})`,
          turnInfo: `TURN: ${nextTurn + 1} of ${totalTurns}. ${scenario.keyVocab ? `KEY VOCAB: ${scenario.keyVocab.join(', ')}` : ''} ${scenario.keyImbuhan ? `KEY IMBUHAN: ${scenario.keyImbuhan.join(', ')}` : ''}`,
        },
      })

      const parsed = parseJSON(result.response)
      if (parsed?.examinerResponse) {
        setMessages(prev => [...prev, {
          role: 'examiner',
          text: parsed.examinerResponse,
          feedback: parsed.feedback,
        }])
      } else {
        // Fallback: use response as plain text, or use static turn
        const fallbackText = typeof result.response === 'string' && result.response.length > 5
          ? result.response
          : scenario.turns[nextTurn]?.examiner || 'Sila teruskan.'
        setMessages(prev => [...prev, { role: 'examiner', text: fallbackText }])
      }
    } catch {
      // AI failed — use static examiner turn as fallback
      const fallback = scenario.turns[nextTurn]?.examiner || 'Boleh teruskan.'
      setMessages(prev => [...prev, { role: 'examiner', text: fallback }])
    }

    setTurn(nextTurn)
  }

  const requestScore = async (msgs) => {
    setPhase('scoring')
    try {
      const turns = []
      for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].role === 'examiner' && msgs[i + 1]?.role === 'student') {
          turns.push({ examiner: msgs[i].text, student: msgs[i + 1].text })
        }
      }

      const result = await scoringAI.call({
        action: 'roleplay-score',
        payload: {
          messages: [{
            role: 'user',
            content: `SCENARIO: ${scenario.context} (${scenario.contextEn})\n${scenario.keyVocab ? `EXPECTED VOCABULARY: ${scenario.keyVocab.join(', ')}` : ''}\n${scenario.keyImbuhan ? `EXPECTED IMBUHAN: ${scenario.keyImbuhan.join(', ')}` : ''}\n\nFULL CONVERSATION:\n${turns.map((t, i) => `Turn ${i + 1}:\nExaminer: ${t.examiner}\nStudent: ${t.student}`).join('\n\n')}`,
          }],
        },
        stream: false,
      })

      const parsed = parseJSON(result.response)
      setScoreData(parsed)
      setPhase('done')
    } catch {
      // Scoring failed — show basic completion
      setScoreData(null)
      setPhase('done')
    }
  }

  const handleSpeech = async () => {
    if (!hasSpeechRecognition()) return
    setListening(true)
    try {
      const locale = scenario.lang === 'en' ? 'en-GB' : 'ms-MY'
      const results = await startRecognition(locale)
      if (results.length > 0) {
        setInput(results[0].transcript)
        inputRef.current?.focus()
      }
    } catch (err) {
      console.error('Speech error:', err)
    }
    setListening(false)
  }

  // Show scorecard when done
  if (phase === 'done') {
    return (
      <RoleplayScorecard
        scenario={scenario}
        messages={messages}
        scoreData={scoreData}
        onRetry={() => {
          stopReadAlong()
          setTurn(0)
          setMessages([{ role: 'examiner', text: scenario.turns[0]?.examiner }])
          setInput('')
          setPhase('playing')
          setScoreData(null)
          ai.reset()
          scoringAI.reset()
        }}
        onExit={onExit}
      />
    )
  }

  const isLastTurn = turn >= totalTurns

  return (
    <div className="flex flex-col h-full animate-fadeUp" style={{ minHeight: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div className="rounded-2xl p-3 mb-2" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-sm">{scenario.title}</h3>
          <div className="flex items-center gap-2">
            {phase === 'scoring' && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-cyan)' }}>
                <Loader2 size={12} className="animate-spin" /> Scoring...
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'var(--color-accent2)', color: '#fff' }}>
              {Math.min(turn + 1, totalTurns)}/{totalTurns}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(Math.min(turn + 1, totalTurns) / totalTurns) * 100}%`, background: 'linear-gradient(90deg, var(--color-accent2), var(--color-accent))' }} />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {messages.map((msg, i) => (
          <Motion.div
            key={i}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {msg.role === 'examiner' ? (
              <div className="max-w-[85%]">
                <div className="rounded-xl p-3"
                  style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Pemeriksa</p>
                  <ExaminerText
                    text={msg.text}
                    active={readingMessageIdx === i}
                    wordIdx={readingMessageIdx === i ? readingWordIdx : -1}
                  />
                  {readingMessageIdx === i ? (
                    <button onClick={stopReadAlong}
                      className="mt-1.5 text-xs flex items-center gap-1 font-semibold"
                      style={{ color: 'var(--color-accent2)' }}
                      aria-label="Stop read-along">
                      <Pause size={11} /> {scenario.lang === 'en' ? 'Stop' : 'Berhenti'}
                    </button>
                  ) : (
                    <button onClick={() => startReadAlong(i, msg.text)}
                      className="mt-1.5 text-xs flex items-center gap-1"
                      style={{ color: 'var(--color-cyan)' }}
                      aria-label="Read examiner prompt aloud with word highlighting">
                      <Volume2 size={11} /> {scenario.lang === 'en' ? 'Read along' : 'Baca bersama'}
                    </button>
                  )}
                </div>
                {/* AI feedback panel */}
                {msg.feedback && (
                  <div className="mt-1 px-3 py-2 rounded-lg text-xs space-y-1"
                    style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)' }}>
                    {msg.feedback.grammarNote && (
                      <p className="flex items-start gap-1" style={{ color: 'var(--color-cyan)' }}>
                        <AlertCircle size={10} className="shrink-0 mt-0.5" />
                        {msg.feedback.grammarNote}
                      </p>
                    )}
                    {msg.feedback.vocabUsed?.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <CheckCircle size={10} style={{ color: 'var(--color-green)' }} />
                        <span style={{ color: 'var(--color-green)' }}>Good vocab:</span>
                        {msg.feedback.vocabUsed.map((v, j) => (
                          <span key={j} className="px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1"
                            style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-green)' }}>
                            <DictionaryIcon word={v} size={14} />
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.feedback.suggestion && (
                      <p style={{ color: 'var(--color-orange)' }}>
                        Tip: {msg.feedback.suggestion}
                      </p>
                    )}
                    {msg.feedback.missingPhrase && (
                      <p style={{ color: 'var(--color-orange)' }}>
                        Try using: <strong>{msg.feedback.missingPhrase}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-[85%] ml-auto">
                <div className="rounded-xl p-3"
                  style={{ background: 'var(--color-accent2)', borderBottomRightRadius: 3 }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Awak</p>
                  <p className="text-sm text-white">{msg.text}</p>
                </div>
                {/* Client-side per-turn analysis */}
                {(() => {
                  const analysis = analyzeStudentResponse(msg.text, scenario)
                  const hasContent = analysis.vocabUsed.length > 0 || analysis.imbuhanUsed.length > 0
                  if (!hasContent && analysis.wordCount < 3) return null
                  return (
                    <div className="mt-1 ml-auto max-w-[85%] space-y-1">
                      {analysis.vocabUsed.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap text-[10px]">
                          <CheckCircle size={10} style={{ color: 'var(--color-green)' }} />
                          {analysis.vocabUsed.map((v, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1"
                              style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--color-green)' }}>
                              <DictionaryIcon word={v} size={14} />
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                      {analysis.imbuhanUsed.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap text-[10px]">
                          <CheckCircle size={10} style={{ color: 'var(--color-cyan)' }} />
                          {analysis.imbuhanUsed.map((v, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded-full font-bold"
                              style={{ background: 'rgba(0,229,255,0.12)', color: 'var(--color-cyan)' }}>{v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </Motion.div>
        ))}

        {/* Streaming indicator */}
        {ai.isLoading && (
          <div className="max-w-[85%]">
            <div className="rounded-xl p-3"
              style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Pemeriksa</p>
              <p className="text-sm">
                {ai.streamedText || (
                  <span className="flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
                    <Loader2 size={12} className="animate-spin" /> Menaip...
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Hint for current turn */}
      {!isLastTurn && scenario.turns[turn] && (
        <div className="text-xs px-3 py-2 rounded-lg mb-2"
          style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)' }}>
          Hint: {scenario.turns[turn].hint}
        </div>
      )}

      {/* Input area */}
      {!isLastTurn && phase === 'playing' && (
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitResponse() } }}
            className="flex-1 p-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)', minHeight: 48 }}
            placeholder={scenario.lang === 'en' ? 'Type your response in English...' : 'Taip jawapan dalam Bahasa Melayu...'}
            disabled={ai.isLoading}
            autoFocus
          />
          {hasSpeechRecognition() && (
            <button onClick={handleSpeech} disabled={ai.isLoading}
              aria-pressed={listening}
              aria-label="Record voice response"
              className="w-12 rounded-xl flex items-center justify-center transition-colors"
              style={{
                background: listening ? 'var(--color-red)' : 'var(--color-accent2)',
                color: '#fff',
                opacity: ai.isLoading ? 0.5 : 1,
              }}>
              <Mic size={20} className={listening ? 'animate-pulse' : ''} />
            </button>
          )}
          <button onClick={submitResponse} disabled={!input.trim() || ai.isLoading}
            className="px-4 rounded-xl font-bold text-sm text-white flex items-center gap-1"
            style={{ background: 'var(--color-accent)', opacity: (!input.trim() || ai.isLoading) ? 0.5 : 1 }}>
            <Send size={14} />
          </button>
        </div>
      )}

      {/* AI error banner */}
      {ai.error && (
        <div className="mt-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.2)' }}>
          {ai.error.code === 'circuit_open'
            ? 'AI temporarily unavailable. Using static prompts as fallback.'
            : ai.error.code === 'rate_limited'
            ? 'Daily AI limit reached. Resets at midnight.'
            : 'AI connection issue. Falling back to static prompts.'}
        </div>
      )}
    </div>
  )
}

// ── Helpers ──

/**
 * Examiner-bubble text renderer. When `active` is true, splits the text via the
 * same tokeniser the boundary-mapper uses (so the highlight cursor lands on the
 * exact visible word) and tints the token at `wordIdx` with the ADHD-safe
 * purple Comprehension Read-Along uses. When inactive, renders plain text —
 * zero render churn until the user actually starts a Read-Along.
 */
function ExaminerText({ text, active, wordIdx }) {
  if (!active) return <p className="text-sm">{text}</p>
  const tokens = tokenizeWithOffsets(text)
  return (
    <p className="text-sm leading-relaxed">
      {tokens.map((t) => (
        <span key={t.index}>
          <span style={{
            background: wordIdx === t.index ? 'rgba(124,58,237,0.22)' : 'transparent',
            borderRadius: 3,
            padding: '0 2px',
            transition: 'background-color 120ms ease',
          }}>
            {t.word}
          </span>{' '}
        </span>
      ))}
    </p>
  )
}

/**
 * Client-side analysis of student response against scenario key vocab/imbuhan.
 * Used to provide per-turn feedback even when AI is unavailable.
 */
function analyzeStudentResponse(text, scenario) {
  const lower = text.toLowerCase()
  const vocabUsed = (scenario.keyVocab || []).filter(v => lower.includes(v.toLowerCase()))
  const vocabMissing = (scenario.keyVocab || []).filter(v => !lower.includes(v.toLowerCase()))
  const imbuhanUsed = (scenario.keyImbuhan || []).filter(v => lower.includes(v.toLowerCase()))
  const imbuhanMissing = (scenario.keyImbuhan || []).filter(v => !lower.includes(v.toLowerCase()))
  const wordCount = text.split(/\s+/).filter(w => w.length > 1).length
  return { vocabUsed, vocabMissing, imbuhanUsed, imbuhanMissing, wordCount }
}

function buildConversationMessages(messages) {
  // Build a conversation history for the AI
  const apiMessages = []

  for (const msg of messages) {
    if (msg.role === 'examiner') {
      apiMessages.push({ role: 'assistant', content: msg.text })
    } else if (msg.role === 'student') {
      apiMessages.push({ role: 'user', content: msg.text })
    }
  }

  return apiMessages
}

function parseJSON(text) {
  if (!text) return null
  try {
    // If already an object
    if (typeof text === 'object') return text
    // Try direct parse
    return JSON.parse(text)
  } catch {
    // Try extracting JSON from text
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { return null }
    }
    return null
  }
}
