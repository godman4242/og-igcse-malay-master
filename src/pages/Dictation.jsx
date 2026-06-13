import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Keyboard, Play, RotateCw, Lock, ChevronRight, Check, X, ArrowLeft, RotateCcw } from 'lucide-react'
import LISTENING_PASSAGES from '../data/listeningPassages'
import { pickDictationItems, scoreDictation } from '../lib/dictation'
import { hasSpeechSynthesis } from '../lib/speech'
import useStore from '../store/useStore'
import FeedbackLive from '../components/FeedbackLive'
import Meta from '../components/Meta'

// Dictation — a listen-and-type study surface (review feature #5). Hear a
// sentence (audio only, ≤2 plays, hidden text), type what you heard, get a
// word-level diff. Corpus + scoring are pure (src/lib/dictation.js); this file
// is just the player + form. Spec: docs/superpowers/specs/2026-06-13-dictation-mode.md

const MAX_PLAYS = 2
const SET_SIZE = 5

export default function Dictation() {
  const navigate = useNavigate()
  const ttsSupported = hasSpeechSynthesis()
  const logSkillActivity = useStore(s => s.logSkillActivity)

  const [lang, setLang] = useState('ms')
  const [items, setItems] = useState([])
  const [idx, setIdx] = useState(0)
  const [playsUsed, setPlaysUsed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState(null)
  const [scores, setScores] = useState([])
  const [stage, setStage] = useState('setup') // setup | active | done

  // Stop any audio when leaving the page or moving to the next item.
  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const current = items[idx]

  const start = () => {
    const picked = pickDictationItems(LISTENING_PASSAGES, lang, SET_SIZE)
    if (!picked.length) return
    setItems(picked)
    setIdx(0); setPlaysUsed(0); setPlaying(false); setTyped(''); setResult(null); setScores([])
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
    const r = scoreDictation(current.sentence, typed)
    setResult(r)
    setScores(s => [...s, r.pct])
  }

  const next = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    if (idx >= items.length - 1) {
      setStage('done')
      logSkillActivity('listening') // one completed dictation set = one Listening unit (paper-balance meter)
      return
    }
    setIdx(i => i + 1); setPlaysUsed(0); setPlaying(false); setTyped(''); setResult(null)
  }

  const restart = () => { setStage('setup'); setItems([]); setScores([]); setResult(null) }

  const playsRemaining = Math.max(0, MAX_PLAYS - playsUsed)
  const canType = playsUsed >= 1
  const feedbackText = result ? `${result.pct}% — ${result.correct} of ${result.total} words correct` : ''

  // ─────────── SETUP ───────────
  if (stage === 'setup') {
    return (
      <div className="space-y-4 animate-fadeUp">
        <Meta title="Dictation — IGCSE Malay Master" description="Listen to a sentence and type what you hear — spelling, listening and vocabulary in one exercise." />
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Keyboard size={18} style={{ color: 'var(--color-accent2)' }} /> Dictation
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          Hear a sentence (you can replay it once, slower), type exactly what you heard, then see a
          word-by-word check. Trains listening, spelling and vocabulary together. {SET_SIZE} sentences per set.
        </p>

        {!ttsSupported && (
          <div className="rounded-xl p-3 text-xs"
            style={{ background: 'rgba(255,82,82,0.08)', color: 'var(--color-red)', border: '1px solid rgba(255,82,82,0.18)' }}>
            Speech synthesis isn’t available in this browser, so dictation can’t play audio here. Try Chrome or Edge.
          </div>
        )}

        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-dim)' }}>Language</p>
          <div className="flex gap-2" role="group" aria-label="Dictation language">
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

        <button onClick={start} disabled={!ttsSupported}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent2)', color: 'var(--color-on-bright)', opacity: ttsSupported ? 1 : 0.4 }}>
          <Play size={14} /> Start dictation
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
          <h2 className="text-xl font-bold mb-1">Dictation complete</h2>
          <p className="text-3xl font-bold" style={{ color }}>{avg}%</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>average across {scores.length} {scores.length === 1 ? 'sentence' : 'sentences'}</p>
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

      {/* Player — audio only, the sentence text stays hidden until you check */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
          <Keyboard size={14} style={{ color: 'var(--color-accent2)' }} /> Listen and type
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
        <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--color-dim)' }}>
          Played up to {MAX_PLAYS} times — the second play is slower. The text stays hidden until you check.
        </p>
      </div>

      {!canType && (
        <div className="rounded-xl p-3 text-xs flex items-center gap-2"
          style={{ background: 'rgba(124,58,237,0.06)', color: 'var(--color-accent2)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <Keyboard size={12} /> Play the sentence at least once to start typing.
        </div>
      )}

      {canType && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <textarea value={typed} onChange={e => setTyped(e.target.value)} disabled={!!result}
            placeholder={lang === 'ms' ? 'Taip apa yang anda dengar…' : 'Type what you heard…'}
            className="w-full p-3 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', minHeight: 110 }} />

          {!result ? (
            <button onClick={check} disabled={!typed.trim()}
              className="w-full mt-3 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-bright)', opacity: typed.trim() ? 1 : 0.4 }}>
              Check <Check size={14} />
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              {/* Word-by-word diff against the reference */}
              <div className="flex flex-wrap gap-1.5 text-sm leading-relaxed">
                {result.words.map((w, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                    style={{
                      background: w.ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)',
                      color: w.ok ? 'var(--color-green)' : 'var(--color-red)',
                    }}>
                    {w.ok ? <Check size={11} /> : <X size={11} />} {w.word}
                  </span>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--color-dim)' }}>
                {result.pct}% — {result.correct} of {result.total} words. Reference: <span style={{ color: 'var(--color-text)' }}>“{current.sentence}”</span>
              </p>
              <button onClick={next}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
                style={{ background: 'var(--color-accent2)', color: 'var(--color-on-bright)' }}>
                {idx >= items.length - 1 ? 'See results' : 'Next sentence'} <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
