import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Volume2, Trash2, Mic, BookOpen, ChevronRight, Sparkles, Brain, ArrowLeft, Headphones, Square } from 'lucide-react'
import { useAI, getRemainingCalls } from '../lib/ai'
import {
  speak,
  startRecognition,
  hasSpeechRecognition,
  hasSpeechSynthesis,
  speakWithBoundaries,
  startKeywordSpotter,
  parseStopKeyword,
  plainifyForSpeech,
  tokenizeWithOffsets,
} from '../lib/speech'
import { isOpenRouterAvailable, chatWithFreeModel } from '../lib/openrouter'
import AddKeyNudge from '../components/AddKeyNudge'
import { isGeminiAvailable, chatWithGemini } from '../lib/gemini'
import useStore from '../store/useStore'
import { getExpertResponse, formatKnowledgeResponse, getSuggestedPrompts, getAllTopics, getEntryById, getRelatedEntries } from '../data/cikguKnowledge'
import { buildLearnerProfile } from '../lib/learnerProfile'
import { learnerScaffoldNote } from '../lib/tutorContext'

// Voice-mode FSM: idle → listening (capturing the student's question)
//                → thinking (waiting for AI/expert reply)
//                → speaking (TTS reading the reply with per-word highlight)
//                → idle
const VOICE_STATES = { IDLE: 'idle', LISTENING: 'listening', THINKING: 'thinking', SPEAKING: 'speaking' }

const VOICE_STATE_INFO = {
  idle:      { label: 'Tap mic to ask Cikgu Maya by voice',     color: 'var(--color-dim)'     },
  listening: { label: 'Listening… speak your question now',     color: 'var(--color-red)'     },
  thinking:  { label: 'Cikgu Maya is thinking…',                color: 'var(--color-orange)'  },
  speaking:  { label: "Cikgu is speaking — say 'stop' to halt", color: 'var(--color-accent2)' },
}

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
  // Talk-to-Tutor voice mode state machine
  const [voiceMode, setVoiceMode] = useState(false)
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE)
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null)
  const [currentWordIdx, setCurrentWordIdx] = useState(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const speakerRef = useRef(null)
  const spotterRef = useRef(null)
  const lastReadIdxRef = useRef(-1)

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
  // getExpertResponse is now a pure shared lib fn in cikguKnowledge.js (single
  // source of truth — the AI-tier eval imports the SAME fn so it measures the
  // exact gated behaviour). It admits uncertainty below MIN_CONFIDENCE.

  // ── Send Message ──
  const sendMessage = async (text) => {
    const content = text || input.trim()
    if (!content || (mode === MODES.AI && (ai.isLoading || freeAiLoading))) return

    addMessage({ role: 'user', content })
    setInput('')

    if (mode === MODES.EXPERT) {
      const response = getExpertResponse(content)
      addMessage({ role: 'assistant', content: response.text, mode: 'expert' })
      return response.text
    }

    // AI mode — try OpenRouter free models first, then Supabase, then expert fallback
    const recentMistakes = mistakes.filter(m => !m.reviewed).slice(0, 5)
    const weakTopics = [...new Set(recentMistakes.map(m => m.source))].slice(0, 3)
    const mistakeNote = recentMistakes.length > 0
      ? `\nStudent's recent mistakes: ${recentMistakes.map(m => `${m.type}: "${m.word}"`).join(', ')}. Weak areas: ${weakTopics.join(', ')}.`
      : ''
    // Adaptive scaffolding: nudges the prompt only for a struggling/coasting
    // learner (empty string for the medium common case) — see tutorContext.js.
    const profile = buildLearnerProfile(useStore.getState(), { lang: 'ms' })
    const contextNote = mistakeNote + learnerScaffoldNote(profile)
    const recentMessages = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))

    // Strategy 0: Try Gemini Flash first (free tier is generous, quality is high)
    if (isGeminiAvailable()) {
      try {
        setAiLoading(true)
        const response = await chatWithGemini(
          [...recentMessages, { role: 'user', content }],
          contextNote,
        )
        addMessage({ role: 'assistant', content: response, mode: 'ai' })
        setAiLoading(false)
        return response
      } catch {
        setAiLoading(false)
        // Fall through to OpenRouter
      }
    }

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
        return response
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
        return result.response
      } catch {
        // Fall through to expert
      }
    }

    // Strategy 3: Expert system fallback (always works)
    const response = getExpertResponse(content)
    const fallbackText = '**[AI unavailable — using Expert System]**\n\n' + response.text
    addMessage({
      role: 'assistant',
      content: fallbackText,
      mode: 'expert',
    })
    return fallbackText
  }

  // Cancel any in-flight TTS / spotter without touching React state — safe
  // to call from event handlers, cleanup, or any phase. Caller decides
  // whether to update state afterwards.
  const cancelVoicePlayback = () => {
    try { speakerRef.current?.cancel?.() } catch { /* ignore */ }
    try { spotterRef.current?.stop?.() } catch { /* ignore */ }
    speakerRef.current = null
    spotterRef.current = null
  }

  // Read `content` aloud with per-word highlight on message bubble `idx`.
  // Also boots a "say stop to halt" keyword spotter alongside the
  // synthesiser. Called imperatively from handleSpeech once the assistant
  // reply lands — NOT from a useEffect — which keeps us out of the
  // setState-in-effect anti-pattern flagged by react-hooks v5.
  const readResponse = (idx, content) => {
    const plain = plainifyForSpeech(content)
    if (!plain || !hasSpeechSynthesis()) {
      setVoiceState(VOICE_STATES.IDLE)
      return
    }
    cancelVoicePlayback()
    setSpeakingMsgIdx(idx)
    setCurrentWordIdx(null)
    setVoiceState(VOICE_STATES.SPEAKING)

    const finish = () => {
      cancelVoicePlayback()
      setSpeakingMsgIdx(null)
      setCurrentWordIdx(null)
      setVoiceState(VOICE_STATES.IDLE)
    }

    const ctl = speakWithBoundaries({
      text: plain,
      lang: 'ms-MY',
      rate: 0.9,
      onWordChange: (i) => setCurrentWordIdx(i),
      onStart: () => {
        if (!hasSpeechRecognition()) return
        // "Say stop" interrupt — the spotter runs alongside the synthesiser.
        // Chromium tolerates concurrent SR + TTS on desktop; on Safari we
        // just degrade — the Stop button still works.
        spotterRef.current = startKeywordSpotter({
          parser: parseStopKeyword,
          onMatch: () => { try { ctl.cancel() } catch { /* ignore */ } finish() },
          onError: () => { /* best-effort; ignore failures */ },
        })
      },
      onEnd: finish,
      onError: finish,
    })
    speakerRef.current = ctl
  }

  // Manual stop button during readback. Also reachable by saying "stop".
  const handleStopReading = () => {
    cancelVoicePlayback()
    setSpeakingMsgIdx(null)
    setCurrentWordIdx(null)
    setVoiceState(VOICE_STATES.IDLE)
  }

  // Toggle voice mode. Turning OFF mid-flow cancels any in-flight
  // pipeline and resets state — done here in the event handler so we
  // never touch state from inside an effect body.
  const toggleVoiceMode = () => {
    setVoiceMode(v => {
      if (v) {
        cancelVoicePlayback()
        setSpeakingMsgIdx(null)
        setCurrentWordIdx(null)
        setVoiceState(VOICE_STATES.IDLE)
      }
      return !v
    })
  }

  // Tear down imperative refs on unmount. No setState here — the
  // component is going away, so we'd just be writing to dead state.
  useEffect(() => () => cancelVoicePlayback(), [])

  const handleSpeech = async () => {
    if (!hasSpeechRecognition()) return
    if (voiceMode) {
      if (voiceState !== VOICE_STATES.IDLE) return
      setVoiceState(VOICE_STATES.LISTENING)
      let transcript = ''
      try {
        const results = await startRecognition('ms-MY')
        transcript = results[0]?.transcript?.trim() || ''
      } catch (err) {
        console.error('Voice listen error:', err)
        setVoiceState(VOICE_STATES.IDLE)
        return
      }
      if (!transcript) {
        setVoiceState(VOICE_STATES.IDLE)
        return
      }
      setVoiceState(VOICE_STATES.THINKING)
      const replyText = await sendMessage(transcript)
      // useStore(s => s.ai.cikguHistory) re-renders after addMessage, so
      // the index we just appended is messages.length under the *next*
      // render. Compute it from current snapshot + 2 (user + assistant
      // both pushed by sendMessage). Cheap, no extra subscription needed.
      const newAssistantIdx = useStore.getState().ai.cikguHistory.length - 1
      if (replyText) {
        lastReadIdxRef.current = newAssistantIdx
        readResponse(newAssistantIdx, replyText)
      } else {
        setVoiceState(VOICE_STATES.IDLE)
      }
      return
    }
    // Plain dictation: fill the input field, leave Send to the student.
    if (listening) return
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
          {/* Voice mode toggle — Talk-to-Tutor (UDL Principle 3) */}
          {hasSpeechRecognition() && hasSpeechSynthesis() && (
            <button onClick={toggleVoiceMode}
              aria-pressed={voiceMode}
              aria-label={voiceMode ? 'Disable voice conversation' : 'Enable voice conversation'}
              title={voiceMode ? 'Voice conversation ON — tap mic to ask by voice' : 'Talk to Cikgu Maya by voice'}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-xl transition-all"
              style={{
                background: voiceMode ? 'var(--color-accent2)' : 'var(--color-surface)',
                color: voiceMode ? '#fff' : 'var(--color-dim)',
                border: '1px solid var(--color-border)',
                boxShadow: voiceMode && voiceState !== VOICE_STATES.IDLE
                  ? '0 0 12px rgba(124,58,237,0.55)' : 'none',
              }}>
              <Headphones size={12} className={voiceMode && voiceState !== VOICE_STATES.IDLE ? 'animate-pulse' : ''} />
              Voice
            </button>
          )}
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden" data-guide="cikgu-mode" style={{ border: '1px solid var(--color-border)' }}>
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
            <button onClick={() => { if (!window.confirm('Clear this whole conversation with Cikgu Maya? This can’t be undone.')) return; cancelVoicePlayback(); setSpeakingMsgIdx(null); setCurrentWordIdx(null); setVoiceState(VOICE_STATES.IDLE); clearHistory() }}
              aria-label="Clear conversation" title="Clear conversation"
              className="p-2 rounded-xl"
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
          : isGeminiAvailable()
            ? 'AI Mode (Free via Gemini Flash)'
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
                      {speakingMsgIdx === i
                        ? <SpokenMessage text={msg.content} currentWordIdx={currentWordIdx} />
                        : <FormattedText text={msg.content} />}
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

      {/* Voice-mode status banner */}
      {voiceMode && (
        <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-xl text-[11px]"
          style={{
            background: 'rgba(124,58,237,0.06)',
            border: '1px solid rgba(124,58,237,0.18)',
            color: VOICE_STATE_INFO[voiceState].color,
          }}>
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ background: VOICE_STATE_INFO[voiceState].color }} />
            {VOICE_STATE_INFO[voiceState].label}
          </span>
          {voiceState === VOICE_STATES.SPEAKING && (
            <button onClick={handleStopReading}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              <Square size={10} fill="currentColor" /> Stop
            </button>
          )}
        </div>
      )}
      {/* Out of AI for today → point to BYOK (only for users without a key) */}
      {!aiAvailable && (
        <div className="mb-2">
          <AddKeyNudge surface="cikgu" />
        </div>
      )}
      {/* Input */}
      <div className="flex gap-2" data-guide="cikgu-input">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
          className="flex-1 p-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', color: 'var(--color-text)' }}
          placeholder={voiceMode
            ? 'Tap the mic to ask by voice — or type here'
            : mode === MODES.EXPERT ? 'Ask about grammar, imbuhan, exam tips...' : 'Ask Cikgu Maya anything...'}
          disabled={mode === MODES.AI && (ai.isLoading || freeAiLoading)}
        />
        {hasSpeechRecognition() && (() => {
          // Three visual states for the mic. Voice-mode active states win
          // over plain dictation state so the student always sees the
          // current phase reflected in colour + pulse.
          const phaseActive = voiceMode && voiceState !== VOICE_STATES.IDLE
          const bg = voiceMode
            ? (voiceState === VOICE_STATES.LISTENING ? 'var(--color-red)'
              : voiceState === VOICE_STATES.THINKING ? 'var(--color-orange)'
              : voiceState === VOICE_STATES.SPEAKING ? 'var(--color-accent2)'
              : 'var(--color-card)')
            : (listening ? 'var(--color-red)' : 'var(--color-card)')
          const isWhite = phaseActive || listening
          const Icon = voiceMode && voiceState === VOICE_STATES.THINKING ? Loader2 : Mic
          return (
            <button onClick={handleSpeech}
              disabled={mode === MODES.AI && (ai.isLoading || freeAiLoading)}
              aria-label={voiceMode ? `Talk to Cikgu Maya (state: ${voiceState})` : 'Dictate into the message box'}
              className="w-11 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: bg,
                color: isWhite ? '#fff' : 'var(--color-text)',
                border: isWhite ? 'none' : '1px solid var(--color-border)',
                boxShadow: phaseActive ? `0 0 16px ${bg}` : 'none',
              }}>
              <Icon size={16} className={
                voiceMode && voiceState === VOICE_STATES.THINKING ? 'animate-spin'
                  : (phaseActive || listening) ? 'animate-pulse' : ''
              } />
            </button>
          )
        })()}
        <button onClick={() => sendMessage()} disabled={!input.trim() || (mode === MODES.AI && (ai.isLoading || freeAiLoading))}
          className="px-4 rounded-xl font-bold text-sm text-white flex items-center"
          style={{ background: 'var(--color-accent)', opacity: (!input.trim() || (mode === MODES.AI && (ai.isLoading || freeAiLoading))) ? 0.5 : 1 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

// Plain-text per-word renderer used while a message is being read aloud.
// Tokenises with the same `tokenizeWithOffsets` used by
// `speakWithBoundaries`, so the highlighted index stays locked to the
// TTS boundary stream. Markdown is intentionally dropped during readback
// — once TTS ends, the bubble flips back to the formatted view.
function SpokenMessage({ text, currentWordIdx }) {
  const plain = plainifyForSpeech(text || '')
  const tokens = tokenizeWithOffsets(plain)
  if (!tokens.length) return <FormattedText text={text} />
  return (
    <p className="leading-relaxed">
      {tokens.map((t, i) => {
        const active = i === currentWordIdx
        return (
          <span key={i} style={{
            background: active ? 'rgba(124,58,237,0.45)' : 'transparent',
            color: active ? '#fff' : 'inherit',
            padding: active ? '1px 4px' : '0',
            borderRadius: 4,
            transition: 'background 80ms linear, color 80ms linear',
          }}>
            {t.word}
            {i < tokens.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </p>
  )
}

// ── Markdown-like formatter for Cikgu responses ──
// Uses React elements only — no dangerouslySetInnerHTML, no XSS surface.

/** Parse inline markdown (**bold**, `code`) into React elements. */
function parseInline(text) {
  // Split on **bold** and `code` markers, returning React elements.
  const parts = []
  // Regex alternation: capture bold OR inline‑code groups.
  const re = /\*\*(.*?)\*\*|`([^`]+)`/g
  let last = 0
  let match
  let key = 0
  while ((match = re.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    if (match[1] !== undefined) {
      // Bold
      parts.push(<strong key={key++}>{match[1]}</strong>)
    } else if (match[2] !== undefined) {
      // Inline code
      parts.push(
        <code key={key++} style={{ background: 'rgba(124,58,237,0.15)', padding: '1px 4px', borderRadius: 3, fontSize: '0.85em' }}>
          {match[2]}
        </code>
      )
    }
    last = re.lastIndex
  }
  if (last < text.length) {
    parts.push(text.slice(last))
  }
  return parts.length > 0 ? parts : [text]
}

function FormattedText({ text }) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Horizontal rule
        if (line.trim() === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
        }

        // Table rows
        if (line.includes('|') && line.trim().startsWith('|')) {
          if (/^[\s|:-]+$/.test(line.trim().replace(/-/g, ''))) return null
          const cells = line.split('|').filter(c => c.trim())
          const isHeader = i < lines.length - 1 && lines[i + 1]?.includes('---')
          return (
            <div key={i} className="flex gap-2 text-xs py-0.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {cells.map((cell, j) => (
                <span key={j} className={`flex-1 ${isHeader ? 'font-bold' : ''}`}>
                  {parseInline(cell.trim())}
                </span>
              ))}
            </div>
          )
        }

        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <p key={i} className="pl-2">• {parseInline(line.slice(2))}</p>
        }

        // Numbered lists
        if (/^\d+\.\s/.test(line)) {
          return <p key={i} className="pl-2">{parseInline(line)}</p>
        }

        if (line.trim() === '') return <br key={i} />
        return <p key={i}>{parseInline(line)}</p>
      })}
    </div>
  )
}
