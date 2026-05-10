/**
 * interleavedQueue.js — Pure, testable queue builder for Smart Sessions.
 *
 * Implements THEMATIC MICRO-CYCLES: each cycle takes ONE focal concept
 * and escalates through recognition → contextual recall → production.
 */

import { getDueCards, sortByPriority } from '../fsrs'
import { getRandomPrompt } from '../../data/microPrompts'

// ─── Task factories ───────────────────────────────────────────────

function fcTask(card, source = 'fsrs-due') {
  return { type: 'fc', card, weight: 1, source }
}

function quizTask(card, source = 'fsrs-due') {
  return { type: 'quiz', card, weight: 1, source }
}

function clozeTask(card, source = 'thematic-followup') {
  return { type: 'cloze', card, weight: 2, source }
}

function microWriteTask(card, source = 'thematic-followup') {
  return {
    type: 'micro-write',
    card,
    prompt: getRandomPrompt('writing', card.m),
    weight: 3,
    source,
  }
}

function microSpeakTask(card, source = 'thematic-followup') {
  return {
    type: 'micro-speak',
    card,
    prompt: getRandomPrompt('speaking', card.m),
    weight: 3,
    source,
  }
}

// ─── Cycle builder ────────────────────────────────────────────────

export function buildCycle(focalCard, opts = {}) {
  const { cycleIdx = 0, includeSpeaking = true } = opts
  const tasks = []

  // Step 1: Recognition (load 1)
  tasks.push(fcTask(focalCard))

  // Step 2: Contextual recall (load 2)
  if (focalCard.ex && focalCard.ex.toLowerCase().includes(focalCard.m.toLowerCase())) {
    tasks.push(clozeTask(focalCard))
  } else {
    tasks.push(quizTask(focalCard))
  }

  // Step 3: Production (load 3)
  tasks.push(microWriteTask(focalCard))

  // Step 4: Speaking graduation (every 3rd cycle)
  if (includeSpeaking && cycleIdx % 3 === 2) {
    tasks.push(microSpeakTask(focalCard))
  }

  return { focalWord: focalCard.m, tasks }
}

// ─── Focal card selection ─────────────────────────────────────────

export function selectFocalCards(cards, mistakes = [], maxCycles = 5) {
  const selected = []
  const seen = new Set()

  // Priority 1: Recent mistakes
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentMistakeWords = mistakes
    .filter(m => m.type === 'vocab' && m.timestamp >= cutoff)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(m => m.word)

  for (const word of recentMistakeWords) {
    if (selected.length >= maxCycles) break
    if (seen.has(word)) continue
    const card = cards.find(c => c.m === word)
    if (card) { selected.push(card); seen.add(word) }
  }

  // Priority 2: FSRS due
  const due = sortByPriority(getDueCards(cards))
  for (const card of due) {
    if (selected.length >= maxCycles) break
    if (seen.has(card.m)) continue
    selected.push(card); seen.add(card.m)
  }

  // Priority 3: Lowest stability
  if (selected.length < maxCycles) {
    const byStability = [...cards]
      .filter(c => !seen.has(c.m))
      .sort((a, b) => (a.stability ?? 0) - (b.stability ?? 0))
    for (const card of byStability) {
      if (selected.length >= maxCycles) break
      selected.push(card); seen.add(card.m)
    }
  }

  return selected
}

// ─── Session builder ──────────────────────────────────────────────

export function buildSession(opts = {}) {
  const { cards = [], mistakes = [], targetMinutes = 20, includeSpeaking = true } = opts
  if (cards.length === 0) return { cycles: [], tasks: [], totalWeight: 0 }

  const maxCycles = Math.max(1, Math.min(8, Math.round(targetMinutes / 4)))
  const focalCards = selectFocalCards(cards, mistakes, maxCycles)
  
  const cycles = focalCards.map((card, i) => buildCycle(card, { cycleIdx: i, includeSpeaking }))
  let tasks = cycles.flatMap(c => c.tasks)

  tasks = enforceNoBB3(tasks)
  tasks = enforceSoftLanding(tasks)

  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0)
  return { cycles, tasks, totalWeight }
}

export function enforceNoBB3(tasks) {
  const result = [...tasks]
  let modified = true, passes = 0
  while (modified && passes < 50) {
    modified = false; passes++
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].weight >= 3 && result[i + 1].weight >= 3) {
        let swapIdx = -1
        for (let j = i + 2; j < result.length; j++) { if (result[j].weight < 3) { swapIdx = j; break } }
        if (swapIdx !== -1) { [result[i + 1], result[swapIdx]] = [result[swapIdx], result[i + 1]]; modified = true; break }
      }
    }
  }
  return result
}

export function enforceSoftLanding(tasks) {
  if (tasks.length === 0) return tasks
  const result = [...tasks]
  if (result[result.length - 1].weight <= 2) return result
  for (let i = result.length - 2; i >= 0; i--) {
    if (result[i].weight <= 2) { [result[i], result[result.length - 1]] = [result[result.length - 1], result[i]]; return result }
  }
  return result
}
