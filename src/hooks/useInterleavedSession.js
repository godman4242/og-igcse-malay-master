import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import useStore from '../store/useStore'
import { buildSession } from '../lib/study/interleavedQueue'
import { createTaskResult, buildSessionSummary } from '../lib/study/sessionResult'
import { Rating } from '../lib/fsrs'

// localStorage key for session persistence (resumability)
const PERSIST_KEY = 'smart-session-state'

/**
 * Load persisted session state from localStorage.
 * Returns null if no valid state exists.
 */
function loadPersistedSession() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate shape
    if (!parsed.tasks || !Array.isArray(parsed.tasks) || !parsed.startTime) return null
    // Don't restore sessions older than 2 hours (stale)
    if (Date.now() - parsed.startTime > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(PERSIST_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Persist session state to localStorage.
 */
function persistSession(state) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Clear persisted session state.
 */
function clearPersistedSession() {
  try {
    localStorage.removeItem(PERSIST_KEY)
  } catch {
    // ignore
  }
}

/**
 * useInterleavedSession — orchestrates a Smart Session.
 *
 * Manages the task queue, cursor, results, and session lifecycle.
 * Persists state to localStorage on every task completion for resumability.
 *
 * @param {object} opts
 * @param {number}  opts.targetMinutes   - Session duration target (default 20)
 * @param {boolean} opts.includeSpeaking - Whether speaking tasks are enabled
 * @returns {object} Session state and actions
 */
export default function useInterleavedSession(opts = {}) {
  const { targetMinutes = 20, includeSpeaking = true } = opts

  const cards = useStore(s => s.cards)
  const activeDeck = useStore(s => s.activeDeck)
  const mistakes = useStore(s => s.mistakes)
  const reviewCardAction = useStore(s => s.reviewCardAction)
  const updateStreak = useStore(s => s.updateStreak)
  const addStudyMinutes = useStore(s => s.addStudyMinutes)
  const markSessionStart = useStore(s => s.markSessionStart)
  const addMistake = useStore(s => s.addMistake)

  // Filter cards to active deck
  const deckCards = useMemo(
    () => activeDeck === 'All' ? cards : cards.filter(c => c.t === activeDeck),
    [cards, activeDeck],
  )

  // ─── Session state ────────────────────────────────────────────

  const [status, setStatus] = useState('idle') // 'idle' | 'active' | 'done' | 'resume-prompt'
  const [tasks, setTasks] = useState([])
  const [cycles, setCycles] = useState([])
  const [cursor, setCursor] = useState(0)
  const [results, setResults] = useState([])
  const [startTime, setStartTime] = useState(null)
  const [summary, setSummary] = useState(null)

  // Refs to avoid stale closure in completeTask. The in-render assignment is a
  // documented React idiom; refactoring to functional setState across three
  // pieces of state would be invasive and is out of scope here.
  const cursorRef = useRef(cursor)
  const tasksRef = useRef(tasks)
  const resultsRef = useRef(results)
  /* eslint-disable react-hooks/refs */
  cursorRef.current = cursor
  tasksRef.current = tasks
  resultsRef.current = results
  /* eslint-enable react-hooks/refs */

  // ─── Resumability: check for persisted session on mount ─────

  useEffect(() => {
    const persisted = loadPersistedSession()
    if (persisted && persisted.tasks.length > 0 && persisted.cursor < persisted.tasks.length) {
      // We have a valid incomplete session to resume
      setTasks(persisted.tasks)
      setCycles(persisted.cycles || [])
      setCursor(persisted.cursor)
      setResults(persisted.results || [])
      setStartTime(persisted.startTime)
      setStatus('resume-prompt')
    }
  }, [])

  // ─── Session lifecycle ────────────────────────────────────────

  /**
   * Start a new Smart Session. Builds the queue from current FSRS state.
   */
  const startSession = useCallback(() => {
    const session = buildSession({
      cards: deckCards,
      mistakes,
      targetMinutes,
      includeSpeaking,
    })

    if (session.tasks.length === 0) {
      setStatus('done')
      setSummary(null)
      return
    }

    const now = Date.now()
    setTasks(session.tasks)
    setCycles(session.cycles)
    setCursor(0)
    setResults([])
    setStartTime(now)
    setStatus('active')
    markSessionStart()

    persistSession({
      tasks: session.tasks,
      cycles: session.cycles,
      cursor: 0,
      results: [],
      startTime: now,
    })
  }, [deckCards, mistakes, targetMinutes, includeSpeaking, markSessionStart])

  /**
   * Resume a persisted session (user chose "Yes" on the resume prompt).
   */
  const resumeSession = useCallback(() => {
    setStatus('active')
    markSessionStart()
  }, [markSessionStart])

  /**
   * Discard the persisted session and start fresh.
   */
  const discardAndRestart = useCallback(() => {
    clearPersistedSession()
    setResults([])
    setCursor(0)
    setTasks([])
    setCycles([])
    setStatus('idle')
  }, [])

  /**
   * Complete the current task and advance to the next.
   *
   * @param {object} outcome - { correct: bool, skipped?: bool, rating?, score? }
   */
  const completeTask = useCallback((outcome) => {
    const currentTasks = tasksRef.current
    const currentCursor = cursorRef.current
    const currentResults = resultsRef.current

    if (currentCursor >= currentTasks.length) return

    const task = currentTasks[currentCursor]
    const result = createTaskResult(task, outcome)
    const nextResults = [...currentResults, result]

    // FSRS integration: if the task used a vocabulary card, record the review
    if (task.card && (task.type === 'fc' || task.type === 'quiz' || task.type === 'cloze')) {
      const rating = outcome.correct ? Rating.Good : Rating.Again
      reviewCardAction(task.card.m, rating)
      updateStreak()
    }

    // Log mistakes for wrong answers
    if (!outcome.correct && !outcome.skipped && task.card) {
      addMistake({
        type: 'vocab',
        source: `smart-session-${task.type}`,
        word: task.card.m,
        correct: task.card.e,
        given: '',
      })
    }

    const nextCursor = currentCursor + 1
    setResults(nextResults)

    // Check if session is complete
    if (nextCursor >= currentTasks.length) {
      const sessionSummary = buildSessionSummary(nextResults, startTime)
      setSummary(sessionSummary)
      addStudyMinutes(sessionSummary.durationMin)
      clearPersistedSession()
      setStatus('done')
      setCursor(nextCursor)
    } else {
      // AnimatePresence drives the visual beat between tasks; no manual status flip.
      setCursor(nextCursor)

      // Persist for resumability
      persistSession({
        tasks: currentTasks,
        cycles,
        cursor: nextCursor,
        results: nextResults,
        startTime,
      })
    }
  }, [startTime, cycles, reviewCardAction, updateStreak, addStudyMinutes, addMistake])

  /**
   * End the session early. Still builds a summary from completed tasks.
   */
  const endSessionEarly = useCallback(() => {
    const sessionSummary = buildSessionSummary(resultsRef.current, startTime)
    setSummary(sessionSummary)
    if (sessionSummary.durationMin > 0) {
      addStudyMinutes(sessionSummary.durationMin)
    }
    clearPersistedSession()
    setStatus('done')
  }, [startTime, addStudyMinutes])

  // ─── Derived state ────────────────────────────────────────────

  const currentTask = tasks[cursor] ?? null
  const totalTasks = tasks.length
  const completedTasks = cursor
  const nextTask = tasks[cursor + 1] ?? null

  // Determine which cycle we're currently in
  const currentCycleIdx = useMemo(() => {
    if (!currentTask || cycles.length === 0) return 0
    let taskCounter = 0
    for (let i = 0; i < cycles.length; i++) {
      taskCounter += cycles[i].tasks.length
      if (cursor < taskCounter) return i
    }
    return cycles.length - 1
  }, [cursor, cycles, currentTask])

  const currentCycleLabel = cycles[currentCycleIdx]
    ? `Cycle ${currentCycleIdx + 1} of ${cycles.length} · "${cycles[currentCycleIdx].focalWord}"`
    : null

  return {
    // Status
    status,          // 'idle' | 'active' | 'done' | 'resume-prompt'

    // Queue
    currentTask,
    nextTask,
    totalTasks,
    completedTasks,
    cursor,

    // Cycles
    cycles,
    currentCycleIdx,
    currentCycleLabel,

    // Results
    results,
    summary,

    // Actions
    startSession,
    resumeSession,
    discardAndRestart,
    completeTask,
    endSessionEarly,
  }
}
