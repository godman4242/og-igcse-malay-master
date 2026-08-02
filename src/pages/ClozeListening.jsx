import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ear, Play, RotateCw, Lock, ChevronRight, Check, X, ArrowLeft, RotateCcw } from 'lucide-react'
import LISTENING_PASSAGES from '../data/listeningPassages'
import { buildClozeListeningSet, checkGap } from '../lib/clozeListening'
import { clozeGapMistakes, glossFor } from '../lib/listeningMistakes'
import { hasSpeechSynthesis } from '../lib/speech'
import DICTIONARY from '../data/dictionary'
import { loadEnDictionary } from '../lib/enDictionary'
import useStore from '../store/useStore'
import FeedbackLive from '../components/FeedbackLive'
import Meta from '../components/Meta'

// Cloze-listening — hear a sentence while its transcript is VISIBLE with 1-2
// words blanked; fill the gaps (review feature #10). The deliberate difference
// from /dictation: there the text is hidden and you type everything; here the
// scaffold stays visible, so it sits one difficulty rung below dictation.
// Pure core: src/lib/clozeListening.js. Kickoff: RESUME_HERE.md 2026-06-13.

const MAX_PLAYS = 2
const SET_SIZE = 5

export default function ClozeListening() {
  const navigate = useNavigate()
  const ttsSupported = hasSpeechSynthesis()
  const logSkillActivity = useStore(s => s.logSkillActivity)
  const addMistake = useStore(s => s.addMistake)

  const [lang, setLang] = useState('ms')
  const [items, setItems] = useState([])
  const [idx, setIdx] = useState(0)
  const [playsUsed, setPlaysUsed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState(null) // [{ ok }] per gap, aligned with item.gaps
  const [scores, setScores] = useState([])
  const [stage, setStage] = useState('setup') // setup | active | done

  // Stop any audio when leaving the page.
  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  // True English study mode (v34): an English gap miss is glossed to Malay off the
  // reversed seed so it can auto-promote to a lang:'en' FSRS card. Loaded lazily
  // into a ref (keeps dictionaryEn a lazy chunk — guardrail N4) and read
  // synchronously in check(); until it resolves, an EN miss stays journal-only.
  const enDictRef = useRef(null)
  useEffect(() => {
    if (lang === 'en' && !enDictRef.current) loadEnDictionary().then(d => { enDictRef.current = d })
  }, [lang])

  const current = items[idx]

  const start = () => {
    const picked = buildClozeListeningSet(LISTENING_PASSAGES, lang, SET_SIZE, Math.random)
    if (!picked.length) return
    setItems(picked)
    setIdx(0); setPlaysUsed(0); setPlaying(false); setAnswers(new Array(picked[0].gaps.length).fill('')); setResult(null); setScores([])
    setStage('active')
  }

  const play = () => {
    if (!current || playsUsed >= MAX_PLAYS || playing || !ttsSupported) return
    setPlaying(true)
    const u = new SpeechSynthesisUtterance(current.sentence)
    u.lang = lang === 'en' ? 'en-GB' : 'ms-MY'
    u.rate = playsUsed === 0 ? 0.95 : 0.85 // slower second play
    u.onend = () => { setPlaying(false); setPlaysUsed(p => p + 1) }
    u.onerror = () => setPlaying(false)
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }

  const check = () => {
    if (!current || result) return
    const marks = current.gaps.map((g, i) => ({ ok: checkGap(g.answer, answers[i]) }))
    setResult(marks)
    const correct = marks.filter(m => m.ok).length
    setScores(s => [...s, Math.round((correct / marks.length) * 100)])
    // Close the listening loop: every wrong gap is a strong vocab signal (the
    // learner heard the word AND had the surrounding text, yet still missed it).
    // Mirrors Listening.jsx's addMistake precedent; dictionary-known Malay
    // words carry their gloss → the store auto-promotes them to FSRS.
    for (const m of clozeGapMistakes(current.gaps, marks, answers)) {
      addMistake?.({
        type: 'vocab',
        source: current.passageId,
        language: lang,
        category: 'vocab',
        severity: 'med',
        word: m.word,
        given: m.given,
        correct: glossFor(m.word, lang === 'en' ? enDictRef.current : DICTIONARY),
        surface: current.sentence,
        note: `[Cloze listening] missed gap word`,
      })
    }
  }

  const next = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    if (idx >= items.length - 1) {
      setStage('done')
      logSkillActivity('listening') // one completed cloze set = one Listening unit (paper-balance meter)
      return
    }
    const n = idx + 1
    setIdx(n); setPlaysUsed(0); setPlaying(false); setAnswers(new Array(items[n].gaps.length).fill('')); setResult(null)
  }

  const restart = () => { setStage('setup'); setItems([]); setScores([]); setResult(null) }

  const playsRemaining = Math.max(0, MAX_PLAYS - playsUsed)
  const canType = playsUsed >= 1
  const allFilled = answers.every(a => a.trim())
  const feedbackText = result
    ? `${result.filter(m => m.ok).length} of ${result.length} gaps correct`
    : ''

  // Split the sentence around its gaps so the transcript renders as
  // text – input – text – input – text. Gaps are pre-sorted by position.
  const renderTranscript = () => {
    const parts = []
    let cursor = 0
    current.gaps.forEach((g, i) => {
      if (g.start > cursor) parts.push(<span key={`t${i}`}>{current.sentence.slice(cursor, g.start)}</span>)
      if (result) {
        const ok = result[i].ok
        parts.push(
          <span key={`g${i}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold"
            style={{ background: ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)', color: ok ? 'var(--color-green)' : 'var(--color-red)' }}>
            {ok ? <Check size={11} /> : <X size={11} />} {ok ? g.answer : `${answers[i].trim() || '—'} → ${g.answer}`}
          </span>
        )
      } else {
        parts.push(
          <input key={`g${i}`} type="text" value={answers[i]} disabled={!canType}
            onChange={e => setAnswers(a => a.map((v, j) => (j === i ? e.target.value : v)))}
            aria-label={`Gap ${i + 1} of ${current.gaps.length}`}
            className="inline-block mx-0.5 px-1 rounded text-center outline-none"
            style={{
              width: `${Math.max(g.answer.length + 2, 6)}ch`,
              minHeight: 32,
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-accent2)',
              color: 'var(--color-text)',
            }} />
        )
      }
      cursor = g.end
    })
    if (cursor < current.sentence.length) parts.push(<span key="tail">{current.sentence.slice(cursor)}</span>)
    return parts
  }

  // ─────────── SETUP ───────────
  if (stage === 'setup') {
    return (
      <div className="space-y-4 animate-fadeUp">
        <Meta title="Cloze Listening — IGCSE Malay Master" description="Listen to a sentence and fill the missing words in its transcript — listening and vocabulary retrieval in one drill." />
        {/* h2, not h1 — Layout renders the route's sr-only <h1> (the page name) on every route. */}
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Ear size={18} style={{ color: 'var(--color-accent2)' }} /> Cloze listening
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          Hear a sentence (one slower replay allowed) while you read its transcript with {''}
          1–2 words missing — type the words you hear. Easier than full dictation: the text
          scaffolds your listening. {SET_SIZE} sentences per set.
        </p>

        {!ttsSupported && (
          <div className="rounded-xl p-3 text-xs"
            style={{ background: 'rgba(255,82,82,0.08)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.18)' }}>
            Speech synthesis isn’t available in this browser, so this drill can’t play audio here. Try Chrome or Edge.
          </div>
        )}

        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-dim)' }}>Language</p>
          <div className="flex gap-2" role="group" aria-label="Cloze listening language" data-guide="clozelistening-lang">
            {[{ id: 'ms', label: 'Bahasa Melayu' }, { id: 'en', label: 'English' }].map(l => (
              <button key={l.id} onClick={() => setLang(l.id)} aria-pressed={lang === l.id}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: lang === l.id ? 'var(--color-accent2)' : 'var(--color-card)',
                  color: lang === l.id ? 'var(--color-on-bright)' : 'var(--color-dim)',
                  border: '1px solid ' + (lang === l.id ? 'var(--color-accent2)' : 'var(--color-border)'),
                }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={start} disabled={!ttsSupported} data-guide="clozelistening-start"
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent2)', color: 'var(--color-on-bright)', opacity: ttsSupported ? 1 : 0.4 }}>
          <Play size={14} /> Start cloze listening
        </button>

        <button onClick={() => navigate('/practice')}
          className="w-full py-2 rounded-xl text-xs font-bold"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
          <ArrowLeft size={14} className="inline mr-1" /> Back to practice
        </button>
      </div>
    )
  }

  // ─────────── DONE ───────────
  if (stage === 'done') {
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const color = avg >= 80 ? 'var(--color-green)' : avg >= 60 ? 'var(--color-orange)' : 'var(--color-red)'
    return (
      <div className="space-y-4 animate-fadeUp">
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="text-4xl mb-2">{avg >= 80 ? '\u{1F3C6}' : avg >= 60 ? '\u{1F389}' : '\u{1F4AA}'}</p>
          <h2 className="text-xl font-bold mb-1">Cloze listening complete</h2>
          <p className="text-3xl font-bold" style={{ color }}>{avg}%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>gaps filled correctly across {scores.length} {scores.length === 1 ? 'sentence' : 'sentences'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={start}
            className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <RotateCcw size={12} /> Another set
          </button>
          <button onClick={restart}
            className="py-3 rounded-xl text-xs font-bold"
            style={{ background: 'var(--color-accent2)', color: 'var(--color-on-bright)' }}>
            Change language
          </button>
        </div>
      </div>
    )
  }

  // ─────────── ACTIVE ───────────
  return (
    <div className="space-y-3 animate-fadeUp">
      <FeedbackLive text={feedbackText} />
      <div className="flex items-center justify-between">
        <button onClick={restart} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-dim)' }}>
          <ArrowLeft size={14} /> Exit
        </button>
        <span className="text-xs font-bold" style={{ color: 'var(--color-accent2)' }}>
          Sentence {idx + 1}/{items.length}
        </span>
      </div>

      {/* Player */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
          <Ear size={14} style={{ color: 'var(--color-accent2)' }} /> Listen and fill the gaps
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-dim)' }}>{current?.title}</p>
        <button onClick={play} disabled={playsRemaining === 0 || playing || !ttsSupported}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          style={{
            background: playsRemaining === 0 ? 'var(--color-card2)' : 'var(--color-accent2)',
            color: playsRemaining === 0 ? 'var(--color-dim)' : 'var(--color-on-bright)',
            opacity: playing ? 0.7 : 1,
          }}>
          {playing
            ? (<><RotateCw size={14} className="animate-spin" /> Playing…</>)
            : playsRemaining === 0
              ? (<><Lock size={14} /> No replays left</>)
              : (<><Play size={14} /> {playsUsed === 0 ? 'Play sentence' : 'Replay (slower)'} · {playsRemaining} left</>)}
        </button>
      </div>

      {!canType && (
        <div className="rounded-xl p-3 text-xs flex items-center gap-2"
          style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--color-accent2)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <Ear size={12} /> Play the sentence at least once to start filling the gaps.
        </div>
      )}

      {/* Transcript with gaps */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <p className="text-sm leading-loose">{current && renderTranscript()}</p>

        {!result ? (
          <button onClick={check} disabled={!canType || !allFilled}
            className="w-full mt-3 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-bright)', opacity: canType && allFilled ? 1 : 0.4 }}>
            Check <Check size={14} />
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
              {result.filter(m => m.ok).length} of {result.length} gaps correct.
            </p>
            <button onClick={next}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
              style={{ background: 'var(--color-accent2)', color: 'var(--color-on-bright)' }}>
              {idx >= items.length - 1 ? 'See results' : 'Next sentence'} <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
