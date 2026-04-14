import { useState, useRef, useEffect } from 'react'
import { Mic, Volume2, Send, Loader2 } from 'lucide-react'
import { useAI } from '../lib/ai'
import { buildRoleplayPrompt } from '../data/systemPrompts'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import RoleplayScorecard from './RoleplayScorecard'

export default function RoleplaySession({ scenario, onExit }) {
  const [turn, setTurn] = useState(0)
  const [messages, setMessages] = useState([]) // { role: 'examiner'|'student', text, feedback? }
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [phase, setPhase] = useState('playing') // playing | scoring | done
  const [scoreData, setScoreData] = useState(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const ai = useAI()
  const scoringAI = useAI()

  const totalTurns = scenario.totalTurns || scenario.turns.length

  // Start with first examiner prompt
  useEffect(() => {
    const opening = scenario.turns[0]?.examiner || scenario.keyVocab?.[0] || 'Selamat datang!'
    setMessages([{ role: 'examiner', text: opening }])
  }, [scenario])

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
        const conversationMessages = buildConversationMessages(newMessages, text)
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
      const conversationMessages = buildConversationMessages(newMessages, text)
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
      const results = await startRecognition('ms-MY')
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
  const lastExaminerMsg = messages.filter(m => m.role === 'examiner').slice(-1)[0]
  const lastStudentFeedback = messages.filter(m => m.role === 'examiner' && m.feedback).slice(-1)[0]?.feedback

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
          <div key={i}>
            {msg.role === 'examiner' ? (
              <div className="max-w-[85%]">
                <div className="rounded-xl p-3"
                  style={{ background: 'var(--color-card2)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--color-cyan)' }}>Pemeriksa</p>
                  <p className="text-sm">{msg.text}</p>
                  <button onClick={() => speak(msg.text)} className="mt-1.5 text-xs flex items-center gap-1"
                    style={{ color: 'var(--color-cyan)' }}>
                    <Volume2 size={11} /> Dengar
                  </button>
                </div>
                {/* Feedback chip */}
                {msg.feedback && (
                  <div className="mt-1 px-3 py-1.5 rounded-lg text-xs inline-block"
                    style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.12)' }}>
                    {msg.feedback.grammarNote && (
                      <p style={{ color: 'var(--color-cyan)' }}>{msg.feedback.grammarNote}</p>
                    )}
                    {msg.feedback.vocabUsed?.length > 0 && (
                      <p className="mt-0.5" style={{ color: 'var(--color-green)' }}>
                        Vocab: {msg.feedback.vocabUsed.join(', ')}
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
              </div>
            )}
          </div>
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
            placeholder="Taip jawapan dalam Bahasa Melayu..."
            disabled={ai.isLoading}
            autoFocus
          />
          {hasSpeechRecognition() && (
            <button onClick={handleSpeech} disabled={ai.isLoading}
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

function buildConversationMessages(messages, latestStudentText) {
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
