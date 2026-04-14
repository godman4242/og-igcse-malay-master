import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Volume2, Trash2, Mic, BookOpen, ChevronRight, Sparkles, Brain, ArrowLeft } from 'lucide-react'
import { useAI, getRemainingCalls } from '../lib/ai'
import { speak, startRecognition, hasSpeechRecognition } from '../lib/speech'
import { isOpenRouterAvailable, chatWithFreeModel } from '../lib/openrouter'
import useStore from '../store/useStore'
import { searchKnowledge, formatKnowledgeResponse, getSuggestedPrompts, getAllTopics, getEntryById, getRelatedEntries } from '../data/cikguKnowledge'

const MODES = {
  EXPERT: 'expert',   // Rule-based, always free
  AI: 'ai',           // LLM-powered, uses API calls
}

export default function CikguBot() {
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [mode, setMode] = useState(MODES.EXPERT)
  const [browsingTopic, setBrowsingTopic] = useState(null)
  const [freeAiLoading, setAiLoading] = useState(false)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const ai = useAI()
  const messages = useStore(s => s.ai.cikguHistory)
  const addMessage = useStore(s => s.addCikguMessage)
  const clearHistory = useStore(s => s.clearCikguHistory)
  const mistakes = useStore(s => s.mistakes)

  const aiAvailable = getRemainingCalls() > 0
  const suggestedPrompts = getSuggestedPrompts(mistakes)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, ai.streamedText])

  // ── Expert System Response ──
  const getExpertResponse = (query) => {
    const results = searchKnowledge(query, 2)

    if (results.length === 0) {
      return {
        text: "I don't have a specific answer for that yet, but here's what I can help with:\n\n" +
          "- **Imbuhan** (meN-, ber-, di-, ter-, peN-, -kan, -an, ke-...-an, se-)\n" +
          "- **Tatabahasa** (tense markers, kata hubung, passive voice, sentence types)\n" +
          "- **Writing tips** (essay structure, formal language, proverbs)\n" +
          "- **Speaking tips** (Paper 3 strategies, roleplay tips)\n" +
          "- **Exam strategies** (Paper 1, 2, 3 tips)\n" +
          "- **Vocabulary** (family, school, common mistakes)\n\n" +
          "Try asking something like: \"Explain meN- prefix\" or \"Paper 3 tips\"",
        related: [],
      }
    }

    const primary = results[0].entry
    let text = formatKnowledgeResponse(primary)

    const related = getRelatedEntries(primary.id)

    if (results.length > 1 && results[1].score > 5) {
      text += `\n\n---\n**Related:** ${results[1].entry.title}`
    }

    return { text, related }
  }

  // ── Send Message ──
  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || (mode === MODES.AI && (ai.isLoading || freeAiLoading))) return

    addMessage({ role: 'user', content })
    setInput('')

    if (mode === MODES.EXPERT) {
      const response = getExpertResponse(content)
      addMessage({ role: 'assistant', content: response.text, mode: 'expert' })
      return
    }

    // AI mode — try OpenRouter free models first, then Supabase, then expert fallback
    const recentMistakes = mistakes.filter(m => !m.reviewed).slice(0, 5)
    const weakTopics = [...new Set(recentMistakes.map(m => m.source))].slice(0, 3)
    const contextNote = recentMistakes.length > 0
      ? `\nStudent's recent mistakes: ${recentMistakes.map(m => `${m.type}: "${m.word}"`).join(', ')}. Weak areas: ${weakTopics.join(', ')}.`
      : ''
    const recentMessages = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))

    // Strategy 1: Try OpenRouter free models (no cost)
    if (isOpenRouterAvailable()) {
      try {
        setAiLoading(true)
        const response = await chatWithFreeModel(
          [...recentMessages, { role: 'user', content }],
          contextNote,
        )
        addMessage({ role: 'assistant', content: response, mode: 'ai' })
        setAiLoading(false)
        return
      } catch {
        setAiLoading(false)
        // Fall through to Supabase or expert
      }
    }

    // Strategy 2: Try Supabase Edge Function (if configured, uses daily quota)
    if (aiAvailable || import.meta.env.VITE_AI_MOCK === 'true') {
      try {
        const result = await ai.call({
          action: 'chat',
          payload: {
            messages: [...recentMessages, { role: 'user', content }],
            scenarioContext: contextNote,
          },
        })
        addMessage({ role: 'assistant', content: result.response, mode: 'ai' })
        return
      } catch {
        // Fall through to expert
      }
    }

    // Strategy 3: Expert system fallback (always works)
    const response = getExpertResponse(content)
    addMessage({
      role: 'assistant',
      content: "**[AI unavailable — using Expert System]**\n\n" + response.text,
      mode: 'expert',
    })
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

  // ── Topic Browser View ──
  if (browsingTopic) {
    const entry = getEntryById(browsingTopic)
    if (!entry) {
      setBrowsingTopic(null)
      return null
    }
    const related = getRelatedEntries(entry.id)
    const formattedResponse = formatKnowledgeResponse(entry)

    return (
      <div className="flex flex-col animate-fadeUp" style={{ minHeight: 'calc(100vh - 180px)' }}>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setBrowsingTopic(null)} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent2)' }}>
            {entry.topic}
          </span>
        </div>

        <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-sm mb-3">{entry.title}</h3>
          <div className="text-sm prose-sm" style={{ color: 'var(--color-text)' }}>
            <FormattedText text={formattedResponse} />
          </div>
        </div>

        {/* TTS for examples */}
        {entry.examples && entry.examples.length > 0 && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--color-dim)' }}>Listen to Examples</h4>
            <div className="space-y-1.5">
              {entry.examples.slice(0, 5).map((ex, i) => (
                <button key={i} onClick={() => speak(ex.derived || ex.root)}
                  className="w-full text-left p-2 rounded-xl text-xs flex items-center gap-2"
                  style={{ background: 'var(--color-surface)' }}>
                  <Volume2 size={12} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
                  <span className="font-bold">{ex.derived || ex.root}</span>
                  <span style={{ color: 'var(--color-dim)' }}>— {ex.meaning}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h4 className="text-xs font-bold mb-2" style={{ color: 'var(--color-dim)' }}>Related Topics</h4>
            <div className="space-y-1.5">
              {related.map(r => (
                <button key={r.id} onClick={() => setBrowsingTopic(r.id)}
                  className="w-full text-left p-2 rounded-xl text-xs flex items-center justify-between"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <span>{r.title}</span>
                  <ChevronRight size={12} style={{ color: 'var(--color-accent)' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => { sendMessage(`Tell me more about ${entry.title}`); setBrowsingTopic(null) }}
          className="w-full p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-cyan)' }}>
          <Send size={14} /> Ask Cikgu Maya about this
        </button>
      </div>
    )
  }

  // ── Topic Browse List ──
  const topicGroups = getAllTopics()
  const topicLabels = {
    imbuhan: 'Imbuhan (Affixes)',
    tatabahasa: 'Tatabahasa (Grammar)',
    kosa_kata: 'Kosa Kata (Vocabulary)',
    penulisan: 'Penulisan (Writing)',
    lisan: 'Lisan (Speaking)',
    peribahasa: 'Peribahasa (Proverbs)',
    exam_tips: 'Exam Tips',
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
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            <button onClick={() => setMode(MODES.EXPERT)}
              className="px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 transition-colors"
              style={{
                background: mode === MODES.EXPERT ? 'rgba(0,229,255,0.15)' : 'var(--color-surface)',
                color: mode === MODES.EXPERT ? 'var(--color-cyan)' : 'var(--color-dim)',
              }}>
              <Brain size={12} /> Expert
            </button>
            <button onClick={() => setMode(MODES.AI)}
              className="px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 transition-colors"
              style={{
                background: mode === MODES.AI ? 'rgba(124,58,237,0.15)' : 'var(--color-surface)',
                color: mode === MODES.AI ? 'var(--color-accent2)' : 'var(--color-dim)',
              }}>
              <Sparkles size={12} /> AI
              {mode === MODES.AI && (
                <span className="text-[9px] opacity-70">({getRemainingCalls()})</span>
              )}
            </button>
          </div>
          {messages.length > 0 && (
            <button onClick={clearHistory} className="p-2 rounded-xl"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <Trash2 size={14} style={{ color: 'var(--color-dim)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Mode indicator */}
      <div className="rounded-xl p-2 mb-3 text-center text-[11px] font-semibold"
        style={{
          background: mode === MODES.EXPERT ? 'rgba(0,229,255,0.06)' : 'rgba(124,58,237,0.06)',
          border: `1px solid ${mode === MODES.EXPERT ? 'rgba(0,229,255,0.12)' : 'rgba(124,58,237,0.12)'}`,
          color: mode === MODES.EXPERT ? 'var(--color-cyan)' : 'var(--color-accent2)',
        }}>
        {mode === MODES.EXPERT
          ? 'Expert System — Instant answers, always free'
          : isOpenRouterAvailable()
            ? 'AI Mode (Free via OpenRouter)'
            : `AI Mode — ${getRemainingCalls()} calls remaining today`}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3" style={{ maxHeight: 'calc(100vh - 340px)' }}>
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
                Hai! I'm Cikgu Maya, your Malay language tutor. Ask me anything about grammar, imbuhan, vocabulary, or IGCSE exam prep. You can also browse topics below!
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="grid grid-cols-1 gap-2">
              {suggestedPrompts.slice(0, 6).map((prompt, i) => (
                <button key={i} onClick={() => sendMessage(prompt.text)}
                  className="w-full text-left p-3 rounded-xl text-xs flex items-center gap-2 transition-colors"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <BookOpen size={14} style={{ color: 'var(--color-cyan)', flexShrink: 0 }} />
                  {prompt.text}
                </button>
              ))}
            </div>

            {/* Topic Browser */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: 'var(--color-dim)' }}>Browse Topics</h3>
              {Object.entries(topicGroups).map(([topic, entries]) => (
                <div key={topic} className="mb-3 last:mb-0">
                  <h4 className="text-[11px] font-bold mb-1.5" style={{ color: 'var(--color-accent2)' }}>
                    {topicLabels[topic] || topic}
                  </h4>
                  <div className="space-y-1">
                    {entries.map(entry => (
                      <button key={entry.id} onClick={() => setBrowsingTopic(entry.id)}
                        className="w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors"
                        style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                        <span>{entry.title}</span>
                        <ChevronRight size={12} style={{ color: 'var(--color-dim)' }} />
                      </button>
                    ))}
                  </div>
                </div>
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
                      {msg.mode && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{
                            background: msg.mode === 'ai' ? 'rgba(124,58,237,0.15)' : 'rgba(0,229,255,0.15)',
                            color: msg.mode === 'ai' ? 'var(--color-accent2)' : 'var(--color-cyan)',
                          }}>
                          {msg.mode === 'ai' ? 'AI' : 'Expert'}
                        </span>
                      )}
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

        {/* Streaming indicator (AI mode only) */}
        {(ai.isLoading || freeAiLoading) && mode === MODES.AI && (
          <div className="max-w-[85%]">
            <div className="rounded-xl p-3"
              style={{ background: 'var(--color-card)', borderBottomLeftRadius: 3, border: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'var(--color-accent2)', color: '#fff' }}>C</div>
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-cyan)' }}>Cikgu Maya</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-accent2)' }}>AI</span>
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
          placeholder={mode === MODES.EXPERT ? 'Ask about grammar, imbuhan, exam tips...' : 'Ask Cikgu Maya anything...'}
          disabled={mode === MODES.AI && (ai.isLoading || freeAiLoading)}
        />
        {hasSpeechRecognition() && (
          <button onClick={handleSpeech} disabled={mode === MODES.AI && (ai.isLoading || freeAiLoading)}
            className="w-11 rounded-xl flex items-center justify-center"
            style={{
              background: listening ? 'var(--color-red)' : 'var(--color-card)',
              color: listening ? '#fff' : 'var(--color-text)',
              border: listening ? 'none' : '1px solid var(--color-border)',
            }}>
            <Mic size={16} className={listening ? 'animate-pulse' : ''} />
          </button>
        )}
        <button onClick={() => sendMessage()} disabled={!input.trim() || (mode === MODES.AI && (ai.isLoading || freeAiLoading))}
          className="px-4 rounded-xl font-bold text-sm text-white flex items-center"
          style={{ background: 'var(--color-accent)', opacity: (!input.trim() || (mode === MODES.AI && (ai.isLoading || freeAiLoading))) ? 0.5 : 1 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Markdown-like formatter for Cikgu responses ──
function FormattedText({ text }) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Bold text
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,0.15);padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>')

        // Horizontal rule
        if (line.trim() === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
        }

        // Table rows
        if (line.includes('|') && line.trim().startsWith('|')) {
          if (/^\|[\s-|]+\|$/.test(line.trim())) return null
          const cells = line.split('|').filter(c => c.trim())
          const isHeader = i < lines.length - 1 && lines[i + 1]?.includes('---')
          return (
            <div key={i} className="flex gap-2 text-xs py-0.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {cells.map((cell, j) => (
                <span key={j} className={`flex-1 ${isHeader ? 'font-bold' : ''}`}
                  dangerouslySetInnerHTML={{ __html: cell.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
            </div>
          )
        }

        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <p key={i} className="pl-2" dangerouslySetInnerHTML={{ __html: '• ' + formatted.slice(2) }} />
        }

        // Numbered lists
        if (/^\d+\.\s/.test(line)) {
          return <p key={i} className="pl-2" dangerouslySetInnerHTML={{ __html: formatted }} />
        }

        if (line.trim() === '') return <br key={i} />
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      })}
    </div>
  )
}
