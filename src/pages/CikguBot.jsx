import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Volume2, Trash2, Mic, AlertCircle, BookOpen } from 'lucide-react'
import { useAI, getRemainingCalls } from '../lib/ai'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import useStore from '../store/useStore'

const SUGGESTED_PROMPTS = [
  { text: 'Explain the difference between meN- and peN-', icon: BookOpen },
  { text: "How do I use 'telah' vs 'sudah'?", icon: BookOpen },
  { text: "Give me 5 example sentences with 'ber-'", icon: BookOpen },
  { text: "What's the passive form of 'menulis'?", icon: BookOpen },
  { text: 'Help me prepare for Paper 3 speaking', icon: BookOpen },
  { text: 'What are the most common imbuhan mistakes?', icon: BookOpen },
]

// Static FAQ fallback when AI is unavailable
const FAQ = {
  'men- pen-': 'meN- creates active verbs (menulis = to write), peN- creates nouns for the doer (penulis = writer). Both follow the same nasal rules: p→m, t→n, k→ng, s→ny.',
  'telah sudah': '"Telah" and "sudah" both mean "already/has done". "Telah" is more formal (written/essays). "Sudah" is everyday speech. For IGCSE writing, use "telah".',
  'ber-': 'ber- prefix indicates: (1) having something: berkereta = having a car, (2) doing an activity: bermain = playing, (3) reciprocal action: berjumpa = meeting each other.',
  'passive': 'Passive voice in Malay uses di- prefix: menulis → ditulis (written), membaca → dibaca (read). The object becomes the subject: "Surat itu ditulis oleh Ali."',
  'paper 3': 'Paper 3 tips: (1) Always greet politely, (2) Use imbuhan correctly, (3) Ask questions back, (4) Use kata hubung (kerana, tetapi, selain itu), (5) Speak clearly with proper pronunciation.',
  'imbuhan mistakes': 'Common imbuhan mistakes: (1) Forgetting meN- on active verbs (tulis→menulis), (2) Wrong nasal: membantu not menbantu, (3) Confusing ber- and meN-, (4) Missing -kan/-an suffixes.',
}

function findFAQAnswer(query) {
  const q = query.toLowerCase()
  for (const [key, answer] of Object.entries(FAQ)) {
    if (key.split(' ').some(k => q.includes(k))) return answer
  }
  return null
}

export default function CikguBot() {
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const ai = useAI()
  const messages = useStore(s => s.ai.cikguHistory)
  const addMessage = useStore(s => s.addCikguMessage)
  const clearHistory = useStore(s => s.clearCikguHistory)
  const mistakes = useStore(s => s.mistakes)

  const aiAvailable = getRemainingCalls() > 0

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, ai.streamedText])

  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || ai.isLoading) return

    addMessage({ role: 'user', content })
    setInput('')

    if (!aiAvailable && import.meta.env.VITE_AI_MOCK !== 'true') {
      // Try FAQ fallback
      const faqAnswer = findFAQAnswer(content)
      if (faqAnswer) {
        addMessage({ role: 'assistant', content: faqAnswer })
      } else {
        addMessage({ role: 'assistant', content: "I'm offline right now. Try asking about: imbuhan (meN-, peN-, ber-), tense markers (telah/sudah), passive voice, or Paper 3 tips." })
      }
      return
    }

    try {
      // Build conversation context for AI
      const recentMistakes = mistakes.filter(m => !m.reviewed).slice(0, 5)
      const weakTopics = [...new Set(recentMistakes.map(m => m.source))].slice(0, 3)

      const contextNote = recentMistakes.length > 0
        ? `\n\nSTUDENT CONTEXT: Recent mistakes include ${recentMistakes.map(m => `${m.type}: "${m.word}"`).join(', ')}. Weak areas: ${weakTopics.join(', ')}.`
        : ''

      // Include last few messages for context
      const recentMessages = messages.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const result = await ai.call({
        action: 'chat',
        payload: {
          messages: [...recentMessages, { role: 'user', content: content }],
          scenarioContext: contextNote,
        },
      })

      addMessage({ role: 'assistant', content: result.response })
    } catch {
      // Try FAQ as fallback
      const faqAnswer = findFAQAnswer(content)
      addMessage({
        role: 'assistant',
        content: faqAnswer || "Sorry, I couldn't connect to the AI. Try again in a moment, or ask about common topics like imbuhan, tense markers, or Paper 3 tips.",
      })
    }
  }

  const handleSpeech = async () => {
    if (!hasSpeechRecognition() || listening) return
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

  return (
    <div className="flex flex-col animate-fadeUp" style={{ minHeight: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold">Cikgu Maya</h2>
          <p className="text-xs" style={{ color: 'var(--color-dim)' }}>Your Malay language tutor</p>
        </div>
        <div className="flex items-center gap-2">
          {!aiAvailable && import.meta.env.VITE_AI_MOCK !== 'true' && (
            <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,145,0,0.1)', color: 'var(--color-orange)' }}>
              Offline Mode
            </span>
          )}
          {messages.length > 0 && (
            <button onClick={clearHistory} className="p-2 rounded-xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Trash2 size={14} style={{ color: 'var(--color-dim)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {messages.length === 0 ? (
          <div className="space-y-3">
            {/* Welcome */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--color-accent2)', color: '#fff' }}>CM</div>
                <span className="font-bold text-sm">Cikgu Maya</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
                Hai! I'm Cikgu Maya, your Malay language tutor. Ask me anything about Malay grammar, imbuhan, vocabulary, or IGCSE exam prep. What would you like to learn today?
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button key={i} onClick={() => sendMessage(prompt.text)}
                  className="w-full text-left p-3 rounded-xl text-xs flex items-center gap-2 transition-colors"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <prompt.icon size={14} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
              {msg.role === 'assistant' ? (
                <div>
                  <div className="rounded-xl p-3"
                    style={{ background: 'var(--color-card)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: 'var(--color-accent2)', color: '#fff' }}>C</div>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--color-cyan)' }}>Cikgu Maya</span>
                    </div>
                    <div className="text-sm prose-sm" style={{ color: 'var(--color-text)' }}>
                      <FormattedText text={msg.content} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-3"
                  style={{ background: 'var(--color-accent2)', borderBottomRightRadius: 3 }}>
                  <p className="text-sm text-white">{msg.content}</p>
                </div>
              )}
            </div>
          ))
        )}

        {/* Streaming indicator */}
        {ai.isLoading && (
          <div className="max-w-[85%]">
            <div className="rounded-xl p-3"
              style={{ background: 'var(--color-card)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'var(--color-accent2)', color: '#fff' }}>C</div>
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-cyan)' }}>Cikgu Maya</span>
              </div>
              <div className="text-sm">
                {ai.streamedText ? (
                  <FormattedText text={ai.streamedText} />
                ) : (
                  <span className="flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
                    <Loader2 size={12} className="animate-spin" /> Thinking...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
          className="flex-1 p-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
          placeholder="Ask Cikgu Maya..."
          disabled={ai.isLoading}
        />
        {hasSpeechRecognition() && (
          <button onClick={handleSpeech} disabled={ai.isLoading}
            className="w-11 rounded-xl flex items-center justify-center"
            style={{
              background: listening ? 'var(--color-red)' : 'var(--color-card)',
              color: listening ? '#fff' : 'var(--color-text)',
              border: listening ? 'none' : '1px solid var(--color-border)',
            }}>
            <Mic size={16} className={listening ? 'animate-pulse' : ''} />
          </button>
        )}
        <button onClick={() => sendMessage()} disabled={!input.trim() || ai.isLoading}
          className="px-4 rounded-xl font-bold text-sm text-white flex items-center"
          style={{ background: 'var(--color-accent)', opacity: (!input.trim() || ai.isLoading) ? 0.5 : 1 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// Simple markdown-like formatter for Cikgu responses
function FormattedText({ text }) {
  if (!text) return null

  // Split by lines and format
  const lines = text.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Bold text
        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <p key={i} className="pl-2" dangerouslySetInnerHTML={{ __html: '• ' + formatted.slice(2) }} />
        }
        if (line.trim() === '') return <br key={i} />
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      })}
    </div>
  )
}
