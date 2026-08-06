import { useState, useEffect, useMemo, useRef } from 'react'
import useStore from '../store/useStore'
import { getDueCards, getSchedulingOptions, Rating } from '../lib/fsrs'
import { buildSessionQueue, cardKey } from '../lib/studyQueue'
import { buildVocabFeedback } from '../lib/feedback'
import { cardsForLang } from '../lib/cardLang'
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
  const allCards = useStore(s => s.cards)
  const studyLang = useStore(s => s.studyLang)
  // Scope the whole session to the active study language (v34) — Malay & English
  // decks never mix in one FSRS session (different prompt direction + TTS locale).
  const cards = useMemo(() => cardsForLang(allCards, studyLang), [allCards, studyLang])
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

  // Stable queue: rank order captured per (deck, comeback) transition. Without
  // this, every rate() mutates `cards`, sortByPriority shuffles mid-action,
  // and cardIdx points to a different card mid-frame.
  //
  // The comeback warm-up is a PREFIX of this one list, not a second list swapped
  // in behind the same index (census A3/A4). `warmCount` is what the deck could
  // actually supply — possibly fewer than 5, possibly 0 — so the warm-up can
  // never hold a session hostage waiting for a review count it cannot reach.
  const { keys: sorted, warmCount } = useMemo(() => {
    const filteredNow = activeDeck === 'All' ? cards : cards.filter(c => c.t === activeDeck)
    return buildSessionQueue(filteredNow, { comeback: comeback && !comebackDismissed })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeck, comeback, comebackDismissed])

  const inComebackWarmup = comeback && !comebackDismissed && cardIdx < warmCount
  const comebackRemaining = Math.max(0, warmCount - cardIdx)

  const currentId = sorted.length ? sorted[cardIdx % sorted.length] : null
  const card = currentId ? cards.find(c => cardKey(c) === currentId) : null

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
    reviewCardAction(card.m, card.t, rating, card.lang)
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
      // Scope by studyLang (#12): the session queue is cardsForLang-scoped, so
      // the finish check must ignore the OTHER language's due cards — else a
      // bilingual user's summary never fires and nextCard() spins forever.
      const remaining = getDueCards(cardsForLang(useStore.getState().cards, studyLang).filter(
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

  // Skipping the warm-up rebuilds the queue without its prefix, so the index
  // has to go back to the top — otherwise the learner skips as many priority
  // cards as they had warmed up on. Same rule changeDeck follows below.
  const dismissComeback = () => { setComebackDismissed(true); setCardIdx(0) }

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
    inComebackWarmup, comebackRemaining, warmCount, dismissComeback,

    // Actions
    rate, nextCard,
  }
}
