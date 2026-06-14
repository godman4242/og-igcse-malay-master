import { useState, lazy, Suspense } from 'react'
import { Sparkles, ArrowRight, Check, ShieldCheck, HelpCircle, Loader2, KeyRound, MessageSquare } from 'lucide-react'
import useStore from '../store/useStore'
import { isOpenRouterAvailable } from '../lib/openrouter'
import { hasInstructProvider } from '../lib/instruct'
import { GOAL_PRESETS, goalToFocus } from '../lib/goals'
import { INTERESTS } from '../lib/interests'
import { generateGroundedDeck, deckNameForGoal, buildDeckGroundingIndex, buildEnDeckGroundingIndex } from '../lib/deckGenerator'
import { generateScenario } from '../lib/scenarioGenerator'

// The AI session UI loads only if a custom conversation is actually launched —
// keep it OFF the ForYou eager path (same lazy treatment as Roleplay.jsx).
const RoleplaySession = lazy(() => import('./RoleplaySession'))

// "Make me a deck" — Phase 2 key-gated AI deck generator on the For You home.
// The AI proposes Malay↔English pairs; every pair is run through the grounding
// gate (owned dictionary + CC0 Wikidata) so verified words auto-accept while
// unknown / mismatched ones are surfaced for the learner to confirm — we NEVER
// silently add an unverified pair. Shown only when an AI key is configured.
// Design: docs/superpowers/specs/2026-06-06-personalized-for-you-design.md §5.3

// Any configured AI works: the mock, ANY BYOK instruct provider (OpenRouter /
// Gemini / Ollama — increment A, 2026-06-13), or the env OpenRouter key.
const deckAiAvailable = () =>
  import.meta.env.VITE_AI_MOCK === 'true' || hasInstructProvider() || isOpenRouterAvailable()

function interestLabels(ids) {
  if (!Array.isArray(ids)) return []
  return ids.map(id => INTERESTS.find(i => i.id === id)?.label).filter(Boolean)
}

function defaultGoal(identity) {
  if (identity?.idealSelf?.trim()) return identity.idealSelf.trim()
  const preset = GOAL_PRESETS.find(p => p.id === identity?.goalPreset)
  if (preset && preset.id !== 'custom') return preset.label
  return ''
}

export default function MakeDeckPanel({ navigate }) {
  const cards = useStore(s => s.cards)
  const identity = useStore(s => s.identity)
  const userInterests = useStore(s => s.userInterests)
  const addCards = useStore(s => s.addCards)
  // The active study language drives the deck/scenario language + the card lang tag,
  // so a generated card lands in the learner's deck (English cards stamped lang:'en'
  // — else they're invisible in the studyLang-scoped views, v34).
  const studyLang = useStore(s => s.studyLang) || 'ms'

  const available = deckAiAvailable()
  // idle | editing | loading | result | error | done
  //      | conv-editing | conv-loading | conv-preview | conv-error | conv-live
  const [phase, setPhase] = useState('idle')
  const [goal, setGoal] = useState(() => defaultGoal(identity))
  const [result, setResult] = useState(null) // { accepted, review }
  const [selected, setSelected] = useState(() => new Set())
  const [error, setError] = useState('')
  const [addedInfo, setAddedInfo] = useState(null) // { count, deck }
  // Roleplay seed (Phase-2 completion B) — session-only, never persisted.
  const [scenario, setScenario] = useState(null)
  const [unknownVocab, setUnknownVocab] = useState(() => new Set())

  const toggle = (m) => setSelected(prev => {
    const next = new Set(prev)
    const k = m.toLowerCase()
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })

  async function handleGenerate() {
    setPhase('loading'); setError('')
    try {
      const focusTopics = goalToFocus(identity?.goalPreset, goal).emphasise
      const interests = interestLabels(userInterests)
      const { accepted, review } = await generateGroundedDeck({ goal, focusTopics, interests, cards, lang: studyLang })
      setResult({ accepted, review })
      setSelected(new Set(accepted.map(c => c.m.toLowerCase()))) // verified pre-checked
      setPhase('result')
    } catch (e) {
      setError(e?.message || 'Could not reach the AI. Try again.')
      setPhase('error')
    }
  }

  async function handleGenerateScenario() {
    setPhase('conv-loading'); setError('')
    try {
      const interests = interestLabels(userInterests)
      // Index built in parallel purely for the SOFT keyVocab check — unknown
      // words mark the preview, they never block (scenario vocab is
      // contextual, not taught pairs).
      const [s, index] = await Promise.all([
        generateScenario({ goal, interests, lang: studyLang }),
        (studyLang === 'en' ? buildEnDeckGroundingIndex(cards) : buildDeckGroundingIndex(cards)).catch(() => new Map()),
      ])
      if (!s) {
        setError('The AI didn’t return a usable scenario this time. Try again or rephrase your goal.')
        setPhase('conv-error')
        return
      }
      const unknown = new Set(
        s.keyVocab.filter(w => !index.has(w.toLowerCase().trim().replace(/\s+/g, ' ')))
      )
      setScenario(s)
      setUnknownVocab(unknown)
      setPhase('conv-preview')
    } catch (e) {
      setError(e?.message || 'Could not reach the AI. Try again.')
      setPhase('conv-error')
    }
  }

  function handleAdd() {
    const all = [...(result?.accepted || []), ...(result?.review || [])]
    const chosen = all.filter(c => selected.has(c.m.toLowerCase()))
    if (!chosen.length) return
    const deck = deckNameForGoal(goal)
    addCards(chosen.map(c => ({
      m: c.m,
      e: c.canonicalEn || c.e, // authoritative gloss when grounding has one
      lang: studyLang,         // stamp the active language so the card lands in the right deck
      t: deck,
      p: 'n',
      ex: c.ex || '',
      mn: '',
    })))
    setAddedInfo({ count: chosen.length, deck })
    setPhase('done')
  }

  // ── Locked state: no key configured ──
  if (!available) {
    return (
      <Panel>
        <Pitch />
        <div className="flex items-center gap-2 mt-3 p-3 rounded-xl"
          style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
          <KeyRound size={16} style={{ color: 'var(--color-dim)' }} aria-hidden={true} />
          <p className="text-[12px] flex-1" style={{ color: 'var(--color-dim)' }}>
            Add an AI key in Settings (OpenRouter, Gemini or Ollama) to unlock custom decks.
          </p>
          <button onClick={() => navigate('/settings')}
            className="text-[12px] font-semibold whitespace-nowrap" style={{ color: 'var(--color-accent)' }}>
            Add a key →
          </button>
        </div>
      </Panel>
    )
  }

  return (
    <Panel>
      <Pitch />

      {phase === 'idle' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <GradientButton label="Make me a deck" onClick={() => setPhase('editing')} />
          <button onClick={() => setPhase('conv-editing')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            <MessageSquare size={15} aria-hidden={true} /> Practise a conversation
          </button>
        </div>
      )}

      {(phase === 'editing' || phase === 'loading') && (
        <div className="mt-3 space-y-2.5">
          <label htmlFor="deck-goal" className="text-[12px] font-semibold" style={{ color: 'var(--color-dim)' }}>
            What should this deck help you with?
          </label>
          <input id="deck-goal" type="text" value={goal} onChange={e => setGoal(e.target.value)}
            placeholder="e.g. talk about my hobbies in the speaking exam"
            disabled={phase === 'loading'}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <GradientButton
            label={phase === 'loading' ? 'Writing your deck…' : 'Generate deck'}
            onClick={handleGenerate}
            busy={phase === 'loading'} />
          <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
            Every word is checked against a real Malay–English dictionary before it can be added.
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-3 space-y-2.5">
          <p className="text-sm" style={{ color: 'var(--color-danger, #e5484d)' }}>{error}</p>
          <GradientButton label="Try again" onClick={() => setPhase('editing')} />
        </div>
      )}

      {phase === 'result' && result && (
        <DeckReview result={result} selected={selected} toggle={toggle} onAdd={handleAdd} onBack={() => setPhase('editing')} />
      )}

      {(phase === 'conv-editing' || phase === 'conv-loading') && (
        <div className="mt-3 space-y-2.5">
          <label htmlFor="conv-goal" className="text-[12px] font-semibold" style={{ color: 'var(--color-dim)' }}>
            What situation do you want to practise talking about?
          </label>
          <input id="conv-goal" type="text" value={goal} onChange={e => setGoal(e.target.value)}
            placeholder="e.g. ordering food, asking for directions"
            disabled={phase === 'conv-loading'}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <GradientButton
            label={phase === 'conv-loading' ? 'Writing your scenario…' : 'Generate conversation'}
            onClick={handleGenerateScenario}
            busy={phase === 'conv-loading'} />
          <p className="text-[11px]" style={{ color: 'var(--color-dim)' }}>
            You’ll see the scenario first — nothing starts until you tap Start.
          </p>
        </div>
      )}

      {phase === 'conv-error' && (
        <div className="mt-3 space-y-2.5">
          <p className="text-sm" style={{ color: 'var(--color-danger, #e5484d)' }}>{error}</p>
          <GradientButton label="Try again" onClick={() => setPhase('conv-editing')} />
        </div>
      )}

      {phase === 'conv-preview' && scenario && (
        <div className="mt-3 space-y-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-bold">{scenario.title}</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--color-text)' }}>{scenario.context}</p>
            <p className="text-[11px] mt-1 italic" style={{ color: 'var(--color-dim)' }}>{scenario.contextEn}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {scenario.keyVocab.map(w => (
                <span key={w} className="px-2 py-0.5 rounded-md text-[11px]"
                  title={unknownVocab.has(w) ? 'Not in our dictionary — double-check this one' : undefined}
                  style={{
                    background: 'var(--color-surface)',
                    color: unknownVocab.has(w) ? 'var(--color-dim)' : 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                    borderBottom: unknownVocab.has(w) ? '1px dotted var(--color-orange)' : '1px solid var(--color-border)',
                  }}>
                  {w}
                </span>
              ))}
            </div>
            <p className="text-[11px] mt-2" style={{ color: 'var(--color-dim)' }}>
              AI-generated scenario ({scenario.totalTurns} turns) — you’re the quality check. Dotted words aren’t in our dictionary.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GradientButton label="Start roleplay" onClick={() => setPhase('conv-live')} />
            <button onClick={handleGenerateScenario}
              className="px-4 py-2.5 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              Another one
            </button>
            <button onClick={() => { setScenario(null); setPhase('idle') }}
              className="px-4 py-2.5 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-dim)' }}>
              Back
            </button>
          </div>
        </div>
      )}

      {phase === 'conv-live' && scenario && (
        <div className="mt-3">
          <Suspense fallback={
            <div className="flex items-center gap-2 p-3 text-sm" style={{ color: 'var(--color-dim)' }}>
              <Loader2 size={16} className="animate-spin" aria-hidden={true} /> Loading the roleplay…
            </div>
          }>
            <RoleplaySession scenario={scenario} onExit={() => { setScenario(null); setPhase('idle') }} />
          </Suspense>
        </div>
      )}

      {phase === 'done' && addedInfo && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: 'var(--color-accent-subtle)', border: '1px solid var(--color-border)' }}>
            <Check size={16} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
            <p className="text-sm font-semibold">
              Added {addedInfo.count} {addedInfo.count === 1 ? 'word' : 'words'} to “{addedInfo.deck}”.
            </p>
          </div>
          <div className="flex gap-2">
            <GradientButton label="Study now" onClick={() => navigate('/study')} />
            <button onClick={() => { setResult(null); setAddedInfo(null); setPhase('editing') }}
              className="px-4 py-2.5 rounded-2xl font-semibold text-sm"
              style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              Make another
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}

function DeckReview({ result, selected, toggle, onAdd, onBack }) {
  const { accepted, review } = result
  if (!accepted.length && !review.length) {
    return (
      <div className="mt-3 space-y-2.5">
        <p className="text-sm" style={{ color: 'var(--color-dim)' }}>
          The AI didn’t return usable words this time. Try rephrasing your goal.
        </p>
        <GradientButton label="Try again" onClick={onBack} />
      </div>
    )
  }
  const chosenCount = [...accepted, ...review].filter(c => selected.has(c.m.toLowerCase())).length
  return (
    <div className="mt-3 space-y-3">
      {accepted.length > 0 && (
        <div>
          <p className="text-[12px] font-bold flex items-center gap-1.5 mb-1.5">
            <ShieldCheck size={14} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
            Verified ({accepted.length})
          </p>
          <div className="space-y-1.5">
            {accepted.map(c => (
              <WordRow key={`a-${c.m}`} c={c} checked={selected.has(c.m.toLowerCase())} onToggle={() => toggle(c.m)}
                badge={c.confidence === 'high' ? 'dictionary' : 'reference'} />
            ))}
          </div>
        </div>
      )}

      {review.length > 0 && (
        <div>
          <p className="text-[12px] font-bold flex items-center gap-1.5 mb-1.5">
            <HelpCircle size={14} style={{ color: 'var(--color-dim)' }} aria-hidden={true} />
            Check these ({review.length}) — not in our dictionary
          </p>
          <div className="space-y-1.5">
            {review.map(c => {
              // Tier-2 validity: an unknown word (no dictionary suggestion) that IS
              // a real Malay word gets a reassuring "real word" label — confirms the
              // spelling is genuine while the MEANING stays unconfirmed. We only ever
              // label the positive case (the list omits some inflected forms, so a
              // miss is not proof of a fake word — never show a warning).
              const realWord = !c.suggestion && c.validWord
              return (
                <WordRow key={`r-${c.m}-${c.e}`} c={c} checked={selected.has(c.m.toLowerCase())} onToggle={() => toggle(c.m)}
                  hint={c.suggestion || (realWord ? 'Real Malay word — confirm the meaning' : undefined)}
                  validBadge={realWord} />
              )
            })}
          </div>
        </div>
      )}

      <button onClick={onAdd} disabled={chosenCount === 0}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' }}>
        Add {chosenCount} {chosenCount === 1 ? 'word' : 'words'} <ArrowRight size={15} aria-hidden={true} />
      </button>
    </div>
  )
}

function WordRow({ c, checked, onToggle, badge, hint, validBadge }) {
  return (
    <button onClick={onToggle} role="checkbox" aria-checked={checked}
      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left"
      style={{ background: 'var(--color-card2)', border: '1px solid var(--color-border)' }}>
      <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
        style={{
          background: checked ? 'var(--color-accent)' : 'transparent',
          border: checked ? 'none' : '1.5px solid var(--color-border)',
        }}>
        {checked && <Check size={13} className="text-white" aria-hidden={true} />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-sm font-bold">{c.m}</span>
        <span className="text-sm" style={{ color: 'var(--color-dim)' }}> — {c.canonicalEn || c.e}</span>
        {hint && <span className="block text-[11px]" style={{ color: 'var(--color-dim)' }}>{hint}</span>}
      </span>
      {badge && (
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>{badge}</span>
      )}
      {validBadge && !badge && (
        // Neutral (not accent) on purpose — "real word" is a weaker signal than the
        // dictionary/reference verification, so it must not borrow the verified look.
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: 'transparent', color: 'var(--color-dim)', border: '1px solid var(--color-border)' }}>real word</span>
      )}
    </button>
  )
}

function Panel({ children }) {
  return (
    <section className="rounded-2xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {children}
    </section>
  )
}

function Pitch() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--color-accent-subtle)' }}>
        <Sparkles size={18} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
      </div>
      <div>
        <h3 className="text-base font-bold leading-tight">Make me a deck</h3>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-dim)' }}>
          AI writes a custom vocab deck for your goal — fact-checked against a real dictionary.
        </p>
      </div>
    </div>
  )
}

function GradientButton({ label, onClick, busy }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm text-white disabled:opacity-70"
      style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent2))' }}>
      {busy
        ? <Loader2 size={15} className="animate-spin" aria-hidden={true} />
        : <Sparkles size={15} aria-hidden={true} />}
      {label}
    </button>
  )
}
