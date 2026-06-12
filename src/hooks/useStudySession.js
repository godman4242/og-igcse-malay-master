import { useState, useEffect, useMemo, useRef } from 'react'
import useStore from '../store/useStore'
import {
  getDueCards, sortByPriority, getSchedulingOptions, Rating, buildComebackQueue,
} from '../lib/fsrs'
import { buildVocabFeedback } from '../lib/feedback'
import { fireConfetti } from '../lib/confetti'
import { selectVariantSafe } from '../data/drillVariants'

/**
 * Owns the entire Study page session: queue, mode, per-card derived
 * data, cross-mode shared state, and the central `rate()` action that
 * updates FSRS, session stats, streak, mistake/confidence logs, and
 * advances the queue (or surfaces the end-of-session summary).
 *
 * Mode-local state (input boxes, per-mode feedback) lives inside each
 * mode component, which is remounted on card change via React `key`.
 */
export default function useStudySession() {
  const cards = useStore(s => s.cards)
  const activeDeck = useStore(s => s.activeDeck)
  const setActiveDeck = useStore(s => s.setActiveDeck)
  const reviewCardAction = useStore(s => s.reviewCardAction)
  const updateStreak = useStore(s => s.updateStreak)
  const addStudyMinutes = useStore(s => s.addStudyMinutes)
  const logConfidence = useStore(s => s.logConfidence)
  const logMistakeReason = useStore(s => s.logMistakeReason)
  const markSessionStart = useStore(s => s.markSessionStart)
  const isComeback = useStore(s => s.isComeback)
  const getDaysSinceLastSession = useStore(s => s.getDaysSinceLastSession)

  // Comeback detection — must read isComeback() BEFORE markSessionStart updates lastSessionAt.
  const [comeback, setComeback] = useState(false)
  const [comebackDismissed, setComebackDismissed] = useState(false)
  const [comebackDays, setComebackDays] = useState(null)
  useEffect(() => {
    if (isComeback && isComeback()) {
      setComeback(true)
      setComebackDays(getDaysSinceLastSession ? getDaysSinceLastSession() : null)
    }
    if (markSessionStart) markSessionStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [mode, setMode] = useState('fc')
  const [cardIdx, setCardIdx] = useState(0)
  const [sessionStats, setSessionStats] = useState(() => ({
    reviewed: 0, correct: 0, wrong: 0, startTime: Date.now(),
  }))
  const [showSummary, setShowSummary] = useState(false)

  // Cross-mode shared state (used by ConfidenceSlot, WrongExtras, FlashcardMode tip).
  const [confidence, setConfidence] = useState(null)         // 1=unsure, 2=think so, 3=certain
  const [hypercorrect, setHypercorrect] = useState(false)    // sure→wrong callout
  const [reasonTagged, setReasonTagged] = useState(null)     // chosen reason for current wrong answer
  const [pendingWrongWord, setPendingWrongWord] = useState(null)
  const [vocabTip, setVocabTip] = useState(null)

  // Filtered list of cards in the active deck.
  const filtered = useMemo(
    () => activeDeck === 'All' ? cards : cards.filter(c => c.t === activeDeck),
    [cards, activeDeck],
  )
  const decks = useMemo(
    () => ['All', ...Array.from(new Set(cards.map(c => c.t))).sort()],
    [cards],
  )
  const due = useMemo(() => getDueCards(filtered), [filtered])

  // Comeback warm-up: serve 5 high-stability cards then resume normal queue.
  const inComebackWarmup = comeback && !comebackDismissed && sessionStats.reviewed < 5
  useEffect(() => {
    if (comeback && !comebackDismissed && sessionStats.reviewed >= 5) {
      setComebackDismissed(true)
    }
  }, [comeback, comebackDismissed, sessionStats.reviewed])

  // Stable queue: rank order captured per (deck, warmup) transition. Without
  // this, every rate() mutates `cards`, sortByPriority shuffles mid-action,
  // and cardIdx points to a different card mid-frame.
  const sorted = useMemo(() => {
    const filteredNow = activeDeck === 'All' ? cards : cards.filter(c => c.t === activeDeck)
    const sortedNow = inComebackWarmup
      ? buildComebackQueue(filteredNow, 5)
      : sortByPriority(filteredNow)
    return sortedNow.map(c => `${c.m}${c.t}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeck, inComebackWarmup])

  const currentId = sorted.length ? sorted[cardIdx % sorted.length] : null
  const card = currentId ? cards.find(c => `${c.m}${c.t}` === currentId) : null

  // FSRS scheduling preview for the rate-button labels.
  const scheduling = useMemo(() => {
    if (!card) return null
    try { return getSchedulingOptions(card) } catch { return null }
  }, [card])

  // FSRS-driven adaptive variant for flashcard mode (desirable difficulty).
  const cardVariant = useMemo(() => {
    if (!card) return { variant: 'standard', label: 'New' }
    return selectVariantSafe(card)
  }, [card])

  const nextCard = () => {
    setVocabTip(null)
    setConfidence(null)
    setHypercorrect(false)
    setReasonTagged(null)
    setPendingWrongWord(null)
    setCardIdx(i => i + 1)
  }

  const tagReason = (reasonId) => {
    if (!pendingWrongWord || reasonTagged) return
    setReasonTagged(reasonId)
    const allMistakes = useStore.getState().mistakes
    const recent = [...allMistakes].reverse().find(m => m.type === 'vocab' && m.word === pendingWrongWord)
    if (recent && logMistakeReason) logMistakeReason(recent.id, reasonId)
  }

  // Double-rate latch (P2-C5): rate() advances the queue on a setTimeout, so
  // a second tap / keyboard 1-4 inside that window would review the SAME card
  // twice and corrupt its FSRS schedule. A ref (not state) so it latches
  // synchronously and survives the re-render between button tap and keypress.
  const advancingRef = useRef(false)

  const rate = (rating) => {
    if (!card || advancingRef.current) return
    advancingRef.current = true
    const correct = rating >= Rating.Good
    if (rating === Rating.Again) {
      setVocabTip(buildVocabFeedback(card))
      setPendingWrongWord(card.m)
      if (confidence === 3) setHypercorrect(true)
    }
    if (confidence !== null && logConfidence) {
      logConfidence(card.m, confidence, correct, mode)
    }
    reviewCardAction(card.m, card.t, rating)
    updateStreak()
    // Count THIS review now (P2-C4): the setTimeout below must not read
    // `sessionStats.reviewed` from the stale closure — it's still the
    // pre-increment value (setSessionStats hasn't committed), so a
    // single-due-card session would see 0 and skip the summary forever.
    const reviewedNow = sessionStats.reviewed + 1
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (rating === Rating.Again ? 1 : 0),
    }))
    // Wrong answer: extend delay so user can read feedback and tag a reason.
    const delay = rating === Rating.Again ? 5000 : 300
    setTimeout(() => {
      advancingRef.current = false
      const remaining = getDueCards(useStore.getState().cards.filter(
        c => activeDeck === 'All' ? true : c.t === activeDeck,
      ))
      if (remaining.length === 0 && reviewedNow > 0) {
        const now = Date.now()
        const mins = Math.max(1, Math.round((now - sessionStats.startTime) / 60000))
        addStudyMinutes(mins)
        fireConfetti(3000)
        setSessionStats(prev => ({ ...prev, endTime: now }))
        setShowSummary(true)
      } else {
        nextCard()
      }
    }, delay)
  }

  const restartSession = () => {
    setShowSummary(false)
    setSessionStats({ reviewed: 0, correct: 0, wrong: 0, startTime: Date.now() })
    setCardIdx(0)
  }

  const dismissComeback = () => setComebackDismissed(true)

  // Switch deck — also reset to top of new queue.
  const changeDeck = (deck) => {
    setActiveDeck(deck)
    setCardIdx(0)
  }

  return {
    // Queue / cards
    card, cardIdx, sorted,
    decks, filtered, due,
    activeDeck, changeDeck,

    // Mode
    mode, setMode,

    // Session lifecycle
    sessionStats, showSummary,
    restartSession,

    // Per-card derived
    scheduling, cardVariant,

    // Cross-mode shared
    confidence, setConfidence,
    pendingWrongWord, hypercorrect,
    reasonTagged, tagReason,
    vocabTip,

    // Comeback
    comeback, comebackDismissed, comebackDays,
    inComebackWarmup, dismissComeback,

    // Actions
    rate, nextCard,
  }
}
