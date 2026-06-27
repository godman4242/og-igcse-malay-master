// AI-TIER EVAL — free (rule-based) vs BYOK (LLM) on two surfaces:
// Malay writing feedback, and Cikgu answers. Output = a DECISION per surface.
//
// House pattern (mirrors scripts/ocr-accuracy-harness.mjs): MANUAL, never CI.
// Needs the USER's own Gemini key (his key, his cost) — env only, never committed.
//
//   Run:  npm run eval:ai-tier            (wraps the loader + this file)
//   or:   GEMINI_KEY=AIza... node --import ./scripts/lib/extless-resolver.mjs scripts/ai-tier-eval/harness.mjs
//
//   Without a key it runs the FREE tier only (deterministic) + prints what the
//   full run would cost — a real dry run that also QA's the gold set.
//
//   Env:
//     GEMINI_KEY / GEMINI_API_KEY   required for the BYOK + judge columns
//     GEMINI_MODEL   contestant model (default gemini-2.5-flash)
//     JUDGE_MODEL    judge model (default: GEMINI_MODEL — a WARNING fires if
//                    equal, since judge==contestant risks self-preference bias)

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { score } from '../../src/lib/writingGrader.js'
import { findIssuesMalay } from '../../src/lib/writingErrorsMalay.js'
import { searchKnowledge, getExpertResponse } from '../../src/data/cikguKnowledge.js'
import { buildWritingGradePrompt } from '../../src/lib/writingGradePrompt.js'
import { getTask } from '../../src/data/writingTasks.js'
import { FORMATS_BY_ID } from '../../src/lib/writingFormats.js'

import { WRITING_GOLD } from './goldWriting.mjs'
import { CIKGU_GOLD } from './goldCikgu.mjs'
import { WRITING_TASKS_GOLD } from './goldWritingTasksEn.mjs'
import { GOLD_REATTEMPT_EN } from './goldWritingReattemptEn.mjs'
import {
  WRITING_BYOK_SYSTEM, CIKGU_BYOK_SYSTEM,
  renderFreeWriting, renderByokWriting, renderCikgu,
} from './prompts.mjs'
import { geminiText, parseJson } from './geminiClient.mjs'
import { thinkingConfigForGrade } from './thinkingBudget.mjs'
import { judgeWriting, judgeCikgu } from './judge.mjs'
import {
  freeSpanCoverage, verifyGoldSpans, aggregateWriting, aggregateCikgu,
  recallBySegment, overPraiseRate, pct, sum,
  reattemptVerdict, reattemptSummary,
} from './score.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../../docs/research/ai-tier-eval-results')

const GEMINI_KEY = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const JUDGE_MODEL = process.env.JUDGE_MODEL || GEMINI_MODEL
const HAS_KEY = !!GEMINI_KEY

// Free-tier survival knobs (eval infra only — defaults preserve today's run):
//   EVAL_SURFACE  '' = all (default) | 'content' | 'writing' | 'cikgu' — run one surface.
//                 'content' is the over-praise ship gate; running it ALONE avoids
//                 spending the free per-minute quota on Surfaces 1/2 first.
//   EVAL_N        Content samples per gold essay (default 3). EVAL_N=1 → 10-call smoke.
//   EVAL_PACE_MS  ms slept BETWEEN Content Gemini calls (default 6000) so a 30-call
//                 N=3 run paces under the ~10–12 req/min free limit.
const ONLY = process.env.EVAL_SURFACE || ''
const RUN_WRITING = ONLY === '' || ONLY === 'writing'
const RUN_CIKGU = ONLY === '' || ONLY === 'cikgu'
const RUN_CONTENT = ONLY === '' || ONLY === 'content'
// Surface 4 (act-on-feedback improvement detection) is EXPLICIT-ONLY — never part
// of the default all-surfaces run, because it grades before+after per pair (16
// unique essays × N) and would silently double the default run's cost. Select it
// with EVAL_SURFACE=reattempt. Default-mode stdout/cost stay byte-identical.
const RUN_REATTEMPT = ONLY === 'reattempt'
const CONTENT_PACE_MS = Number(process.env.EVAL_PACE_MS) || 6000
// EVAL_DEBUG=1 → on a Content parse miss, print a short diagnostic (first ~300
// chars of the raw response + whether parseJson returned null vs an object with
// a non-number content_band) so a residual failure — truncation vs string-typed
// band vs wrong key — is diagnosable WITHOUT another blind keyed run.
const EVAL_DEBUG = !!process.env.EVAL_DEBUG

// Per-family thinking-budget selector (pure; lives in ./thinkingBudget.mjs so it
// can be unit-tested without executing this harness's top-level main()). Re-
// exported here too so it's importable from the harness per the spec.
export { thinkingConfigForGrade } from './thinkingBudget.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── FREE-tier producers (the REAL product code paths) ────────────────────────

function freeWriting(essay) {
  const result = score(essay.text, { lang: 'malay', format: essay.format })
  const findings = result.findings || []
  return { text: renderFreeWriting(result), band: result.band, findings, raw: result }
}

// Uses the SAME shared getExpertResponse the app's CikguBot calls, so the eval
// measures the exact confidence-gated behaviour (below MIN_CONFIDENCE → an honest
// uncertainty reply instead of a confident scrape). topScore stays the raw
// top-match score for the score↔confidence correlation in the report.
function freeCikgu(question) {
  const results = searchKnowledge(question, 2)
  const topScore = results[0]?.score ?? 0
  const resp = getExpertResponse(question)
  return { text: resp.text, topScore, confident: resp.confident, matchedId: results[0]?.entry?.id || null }
}

// ── BYOK-tier producers ──────────────────────────────────────────────────────

async function byokWriting(essay) {
  const raw = await geminiText({
    apiKey: GEMINI_KEY, model: GEMINI_MODEL,
    systemPrompt: WRITING_BYOK_SYSTEM, userContent: essay.text,
    json: true, maxTokens: 2048, // app: writing-feedback-v2 uses 2048
  })
  const parsed = parseJson(raw)
  return { text: renderByokWriting(parsed), band: parsed?.band ?? null, parsed, raw }
}

async function byokCikgu(question) {
  const raw = await geminiText({
    apiKey: GEMINI_KEY, model: GEMINI_MODEL,
    systemPrompt: CIKGU_BYOK_SYSTEM, userContent: question,
    json: false, maxTokens: 512, // app: chatWithGemini uses 512
  })
  return { text: renderCikgu(raw), raw }
}

// ── CONTENT trait (over-praise eval) ─────────────────────────────────────────
// The product's task-aware Content grader. We build the prompt with the SAME
// buildWritingGradePrompt the app ships (parity invariant) and sample the
// content_band N times at low-but-nonzero temperature so run-to-run variance is
// visible (at temp 0 the samples are identical and prove nothing about robustness).
const CONTENT_N = Number(process.env.EVAL_N) || 3
const CONTENT_TEMP = 0.3

// Cheap, deterministic local metrics so the prompt matches PRODUCTION shape —
// no "undefined" leaks into the metrics line. errorsPer100 is a local-detector
// concern we don't run here, so 0 is honest and fine for this Content eval.
function contentMetrics(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const unique = new Set(words.map((w) => w.toLowerCase())).size
  const ttr = wordCount ? Math.round((unique / wordCount) * 100) / 100 : 0
  return { wordCount, ttr, errorsPer100: 0 }
}

// formatHints = the task format's requiredHints (the app passes the format's
// hints); fall back to a small reasonable set if the format is somehow missing.
function formatHintsFor(task) {
  const fmt = FORMATS_BY_ID[task.formatId]
  return fmt?.requiredHints?.length ? fmt.requiredHints : ['Clear structure', 'Relevant content', 'Appropriate register']
}

// Build the product Content prompt for one gold essay (also used in the dry-run
// so the no-key path exercises the real builder + metrics).
function buildContentPrompt(g) {
  const task = getTask(g.taskId)
  return buildWritingGradePrompt({
    formatHints: formatHintsFor(task),
    metrics: contentMetrics(g.text),
    findings: [],
    task,
  })
}

// N keyed samples of the Content band for one essay. Tolerates a parse miss
// (skips that sample, notes it) so one bad JSON doesn't kill the run.
async function sampleContentBands(g) {
  const prompt = buildContentPrompt(g)
  const samples = []
  let parseMisses = 0
  // 2048 + minimal thinking (per-family): the task-aware grade JSON is bigger
  // (content_band, content_justification, task_coverage{…}) and Gemini flash
  // THINKS into the output budget — 1024 truncated the JSON → all "parse miss".
  for (let i = 0; i < CONTENT_N; i += 1) {
    const raw = await geminiText({
      apiKey: GEMINI_KEY, model: GEMINI_MODEL,
      systemPrompt: prompt, userContent: g.text,
      json: true, maxTokens: 2048, temperature: CONTENT_TEMP,
      thinkingConfig: thinkingConfigForGrade(GEMINI_MODEL),
    })
    const parsed = parseJson(raw)
    const band = parsed?.content_band
    if (typeof band === 'number') samples.push(band)
    else {
      parseMisses += 1
      if (EVAL_DEBUG) {
        // Diagnose WHY without another keyed run: null ⇒ truncated/unparseable;
        // an object whose content_band isn't a number ⇒ string-typed band or
        // wrong key. Print the first ~300 raw chars either way.
        const head = String(raw).slice(0, 300).replace(/\n/g, '⏎')
        const why = parsed == null
          ? 'parseJson→null (truncated/unparseable JSON)'
          : `parseJson→object but content_band=${JSON.stringify(band)} (${typeof band}); keys=[${Object.keys(parsed).join(',')}]`
        console.log(`    [EVAL_DEBUG] ${g.id} sample ${i + 1}: ${why}`)
        console.log(`    [EVAL_DEBUG] raw[0..300]: ${head}`)
      }
    }
    // Pace under the free per-minute limit. Sleep BETWEEN calls only — never
    // after the last sample of the last essay (the loop in main() also has no
    // inter-essay sleep, so the gap between essays is just this trailing wait of
    // the prior essay's penultimate call; the dominant pacing is here, per call).
    if (i < CONTENT_N - 1) await sleep(CONTENT_PACE_MS)
  }
  return { samples, parseMisses }
}

// ── REATTEMPT (improvement detection) ────────────────────────────────────────
// Grade ONE essay (a before or an after) N times with the SAME parity prompt the
// Content surface uses, capturing BOTH the content_band and the full task_coverage
// per sample (the verdict needs the targetReq flag, not just the band). Mirrors
// sampleContentBands's pacing + parse-miss tolerance.
async function sampleEssayGrade(text, task) {
  const prompt = buildWritingGradePrompt({
    formatHints: formatHintsFor(task), metrics: contentMetrics(text), findings: [], task,
  })
  const bands = []
  const coverages = []
  let parseMisses = 0
  for (let i = 0; i < CONTENT_N; i += 1) {
    const raw = await geminiText({
      apiKey: GEMINI_KEY, model: GEMINI_MODEL,
      systemPrompt: prompt, userContent: text,
      json: true, maxTokens: 2048, temperature: CONTENT_TEMP,
      thinkingConfig: thinkingConfigForGrade(GEMINI_MODEL),
    })
    const parsed = parseJson(raw)
    const band = parsed?.content_band
    if (typeof band === 'number') { bands.push(band); coverages.push(parsed?.task_coverage || {}) }
    else parseMisses += 1
    if (i < CONTENT_N - 1) await sleep(CONTENT_PACE_MS)
  }
  return { bands, coverages, parseMisses }
}

// The unique essays a set of pairs needs (deduped by id — shared `before` essays
// grade ONCE). Pure, so the cost estimate + the grading loop agree on the count.
function uniqueReattemptEssays(pairs) {
  const map = new Map() // essayId -> { text, task }
  for (const p of pairs) {
    const task = getTask(p.taskId)
    for (const side of [p.before, p.after]) {
      if (!map.has(side.id)) map.set(side.id, { text: side.text, task })
    }
  }
  return map
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n════════════════════════════════════════════════════════════')
  console.log(' AI-TIER EVAL — free (rule-based) vs BYOK (LLM)')
  console.log('════════════════════════════════════════════════════════════')

  // Gold-set integrity: every planted span must be findable in its essay.
  const goldErrors = []
  for (const e of WRITING_GOLD) {
    const missing = verifyGoldSpans(e.text, e.errors)
    if (missing.length) goldErrors.push(`  ${e.id}: span not found → ${missing.map((s) => JSON.stringify(s)).join(', ')}`)
  }
  if (goldErrors.length) {
    console.error('\n✗ GOLD-SET SPAN ERRORS (fix goldWriting.mjs):')
    console.error(goldErrors.join('\n'))
    process.exit(1)
  }
  // Content gold-set integrity: every gold essay must point at a REAL task.
  const contentGoldErrors = []
  for (const g of WRITING_TASKS_GOLD) {
    if (!getTask(g.taskId)) contentGoldErrors.push(`  ${g.id}: unknown taskId "${g.taskId}"`)
  }
  if (contentGoldErrors.length) {
    console.error('\n✗ CONTENT GOLD-SET ERRORS (fix goldWritingTasksEn.mjs):')
    console.error(contentGoldErrors.join('\n'))
    process.exit(1)
  }
  // Reattempt gold-set integrity (guarded — only when that surface runs, so
  // default-mode output is untouched): every pair must point at a REAL task and a
  // valid requirement index, and the edit must actually change the text.
  if (RUN_REATTEMPT) {
    const reattemptGoldErrors = []
    for (const p of GOLD_REATTEMPT_EN) {
      const task = getTask(p.taskId)
      if (!task) { reattemptGoldErrors.push(`  ${p.id}: unknown taskId "${p.taskId}"`); continue }
      if (!(p.targetReq >= 0 && p.targetReq < task.requirements.length)) reattemptGoldErrors.push(`  ${p.id}: targetReq ${p.targetReq} out of range for ${p.taskId}`)
      if (p.before.text === p.after.text) reattemptGoldErrors.push(`  ${p.id}: before/after text identical (no edit)`)
    }
    if (reattemptGoldErrors.length) {
      console.error('\n✗ REATTEMPT GOLD-SET ERRORS (fix goldWritingReattemptEn.mjs):')
      console.error(reattemptGoldErrors.join('\n'))
      process.exit(1)
    }
  }
  console.log(`\nGold sets OK · writing: ${WRITING_GOLD.length} essays (${sum(WRITING_GOLD.map((e) => e.errors.length))} planted errors) · cikgu: ${CIKGU_GOLD.length} questions · content: ${WRITING_TASKS_GOLD.length} essays${RUN_REATTEMPT ? ` · reattempt: ${GOLD_REATTEMPT_EN.length} pairs` : ''}`)

  // EVAL_SAMPLE_N=k runs an EVENLY-SPREAD k items/surface (e.g. weak/mid/strong
  // for writing) instead of all 12 — so a constrained key can run a valid pilot.
  // Free-tier recipe: a free Gemini key caps at 20 req/day/model. k=4 → 8
  // contestant + 16 judge calls; put the contestant on one fresh model and the
  // judge on a different fresh model and both stay ≤ 20/day. k=0 (default) = full.
  const SAMPLE_N = Math.max(0, Math.floor(Number(process.env.EVAL_SAMPLE_N) || 0))
  const spread = (arr, k) => (!k || k >= arr.length ? arr : Array.from({ length: k }, (_, i) => arr[Math.floor((i * arr.length) / k)]))
  // When a surface is skipped, its set is empty — no items iterated, no calls,
  // no cost lines for it. Default (ONLY === '') keeps the full sets, unchanged.
  const writingSet = RUN_WRITING ? spread(WRITING_GOLD, SAMPLE_N) : []
  const cikguSet = RUN_CIKGU ? spread(CIKGU_GOLD, SAMPLE_N) : []
  const contentSet = RUN_CONTENT ? WRITING_TASKS_GOLD : []
  // EVAL_SAMPLE_N spreads a subset of PAIRS (a quota-fitting smoke); 0 = all pairs.
  const reattemptSet = RUN_REATTEMPT ? spread(GOLD_REATTEMPT_EN, SAMPLE_N) : []
  if (ONLY) console.log(`SURFACE MODE: EVAL_SURFACE=${ONLY} — running ONLY the ${ONLY} surface (other surfaces skipped, no calls).`)
  if (SAMPLE_N) console.log(`SAMPLE MODE: ${writingSet.length} writing + ${cikguSet.length} cikgu (evenly spread) — partial, not the final decision.`)

  // Cost estimate BEFORE any call (his key, his cost). NOTE: each item runs the
  // judge TWICE (once on the free output, once on the BYOK output), so judge
  // calls = 2 × items per surface. Only surfaces that will actually run print.
  const byokCalls = writingSet.length + cikguSet.length
  const judgeCalls = (writingSet.length + cikguSet.length) * 2
  const contentCalls = contentSet.length * CONTENT_N
  const reattemptUnique = uniqueReattemptEssays(reattemptSet) // deduped shared befores
  const reattemptCalls = reattemptUnique.size * CONTENT_N
  console.log('\n── Cost estimate ──')
  console.log(`  Free tier (rule-based): 0 API calls, $0.`)
  if (RUN_WRITING || RUN_CIKGU) {
    console.log(`  Full run: ${byokCalls} BYOK contestant calls + ${judgeCalls} judge calls (both tiers judged${ONLY ? '' : ', both surfaces'}) = ${byokCalls + judgeCalls} Gemini calls.`)
  }
  if (RUN_CONTENT) {
    console.log(`  Content trait (over-praise): ${contentSet.length} gold essays × N=${CONTENT_N} samples (temp ${CONTENT_TEMP}) = ${contentCalls} Gemini calls.`)
    // Pacing note only when a surface is explicitly selected (the free-tier mode);
    // keeps default-mode stdout byte-identical to the pre-change harness.
    if (ONLY) console.log(`    (paced ${CONTENT_PACE_MS}ms between Content calls to stay under the free per-minute limit)`)
  }
  if (RUN_REATTEMPT) {
    console.log(`  Re-attempt (improvement detection): ${reattemptSet.length} pairs → ${reattemptUnique.size} unique essays × N=${CONTENT_N} (temp ${CONTENT_TEMP}) = ${reattemptCalls} Gemini calls.`)
    console.log(`    (paced ${CONTENT_PACE_MS}ms between calls. Free quota ≈9–10/day → a full N=1 = ${reattemptUnique.size} calls needs ~2 free days or a subset via EVAL_SAMPLE_N; N≥2 needs paid quota.)`)
  }
  if (!ONLY) console.log(`  ≈ 150k tokens total → $0 on the Gemini free tier (within daily limits), under ~$0.30 on a paid Flash tier.`)
  if (!HAS_KEY) {
    console.log('\n⚠ No GEMINI_KEY set — running FREE tier only (dry run). Set GEMINI_KEY for the full comparison.')
  } else {
    console.log(`\n  Contestant model: ${GEMINI_MODEL}${RUN_WRITING || RUN_CIKGU ? ` · Judge model: ${JUDGE_MODEL}` : ' · (content-only — no LLM judge runs)'}`)
    // The self-preference warning is about the JUDGE; in content-only mode no
    // judge runs, so it's irrelevant and must not print.
    if ((RUN_WRITING || RUN_CIKGU) && JUDGE_MODEL === GEMINI_MODEL) {
      console.log('  ⚠ JUDGE_MODEL === contestant model — self-preference bias risk. Set JUDGE_MODEL to a different (ideally cross-provider) model for the credible run.')
    }
  }

  // ── WRITING ──
  const writingItems = []
  if (RUN_WRITING) {
  console.log('\n── Surface 1: Malay writing feedback ──')
  for (const essay of writingSet) {
    const free = freeWriting(essay)
    const cov = freeSpanCoverage(essay.text, free.findings, essay.errors)
    const item = {
      id: essay.id, level: essay.level, format: essay.format,
      intendedBand: essay.intendedBand, plantedCount: essay.errors.length,
      errors: essay.errors.map((e, i) => ({ ...e, freeSpanCaught: cov.bySpan[i] })),
      freeBand: free.band, byokBand: null,
      freeText: free.text, byokText: null,
      freeExtraFindings: cov.extraFindings.length,
      freeJudge: null, byokJudge: null,
    }
    if (HAS_KEY) {
      process.stdout.write(`  ${essay.id} … `)
      try {
        const byok = await byokWriting(essay)
        item.byokBand = byok.band
        item.byokText = byok.text
        const fj = await judgeWriting({ apiKey: GEMINI_KEY, judgeModel: JUDGE_MODEL, essay: essay.text, plantedErrors: essay.errors, candidateText: free.text })
        const bj = await judgeWriting({ apiKey: GEMINI_KEY, judgeModel: JUDGE_MODEL, essay: essay.text, plantedErrors: essay.errors, candidateText: byok.text })
        item.freeJudge = fj
        item.byokJudge = bj
        process.stdout.write('done\n')
      } catch (err) {
        process.stdout.write(`FAILED (${err.message})\n`)
      }
    }
    writingItems.push(item)
  }
  }

  // ── CIKGU ──
  const cikguItems = []
  if (RUN_CIKGU) {
  console.log('\n── Surface 2: Cikgu answers ──')
  for (const q of cikguSet) {
    const free = freeCikgu(q.question)
    const item = {
      id: q.id, coverageHint: q.coverageHint, question: q.question,
      keyFactCount: q.keyFacts.length, freeTopScore: free.topScore, freeMatchedId: free.matchedId || null,
      freeConfident: free.confident, freeText: free.text, byokText: null, freeJudge: null, byokJudge: null,
    }
    if (HAS_KEY) {
      process.stdout.write(`  ${q.id} … `)
      try {
        const byok = await byokCikgu(q.question)
        item.byokText = byok.text
        const fj = await judgeCikgu({ apiKey: GEMINI_KEY, judgeModel: JUDGE_MODEL, question: q.question, keyFacts: q.keyFacts, candidateText: free.text })
        const bj = await judgeCikgu({ apiKey: GEMINI_KEY, judgeModel: JUDGE_MODEL, question: q.question, keyFacts: q.keyFacts, candidateText: byok.text })
        item.freeJudge = fj
        item.byokJudge = bj
        process.stdout.write('done\n')
      } catch (err) {
        process.stdout.write(`FAILED (${err.message})\n`)
      }
    }
    cikguItems.push(item)
  }
  }

  // ── CONTENT (over-praise) ──
  const contentItems = []
  if (RUN_CONTENT) {
  console.log('\n── Surface 3: task-aware Content / task-fulfilment (over-praise eval) ──')
  for (let ci = 0; ci < contentSet.length; ci += 1) {
    const g = contentSet[ci]
    // Always build the parity prompt — in dry-run this exercises the REAL builder
    // + local metrics (so a builder/metrics regression surfaces with no key).
    const prompt = buildContentPrompt(g)
    const item = {
      id: g.id, taskId: g.taskId, label: g.label,
      expectedContentMax: g.expectedContentMax,
      promptChars: prompt.length, samples: [], parseMisses: 0,
    }
    if (HAS_KEY) {
      process.stdout.write(`  ${g.id} (${g.label}) … `)
      try {
        const { samples, parseMisses } = await sampleContentBands(g)
        item.samples = samples
        item.parseMisses = parseMisses
        process.stdout.write(`bands [${samples.join(', ')}]${parseMisses ? ` (+${parseMisses} parse miss)` : ''}\n`)
        // Pace BETWEEN essays too (not after the last) — keeps the essay-boundary
        // burst under the free per-minute window. sampleContentBands already paces
        // between its own samples; this covers the gap to the next essay's call.
        if (ci < contentSet.length - 1) await sleep(CONTENT_PACE_MS)
      } catch (err) {
        process.stdout.write(`FAILED (${err.message})\n`)
      }
    }
    contentItems.push(item)
  }
  if (!HAS_KEY) {
    const totalChars = contentItems.reduce((a, it) => a + it.promptChars, 0)
    console.log(`  DRY RUN: built ${contentItems.length} parity prompts (${Math.round(totalChars / contentItems.length)} avg chars) via buildWritingGradePrompt — no Gemini calls.`)
    console.log(`  Set GEMINI_KEY to sample content_band N=${CONTENT_N}× per essay and compute the over-praise rate.`)
  }
  }

  // ── REATTEMPT (improvement detection — cosmetic vs real) ──
  const reattemptItems = []
  if (RUN_REATTEMPT) {
  console.log('\n── Surface 4: act-on-feedback improvement detection (cosmetic must NOT look improved) ──')
  const essays = reattemptUnique // already deduped (shared befores graded once)
  console.log(`  ${reattemptSet.length} pairs → grading ${essays.size} unique essays (deduped shared befores).`)
  const grades = new Map() // essayId -> { bands, coverages, parseMisses }
  if (HAS_KEY) {
    let gi = 0
    for (const [essayId, { text, task }] of essays) {
      process.stdout.write(`  ${essayId} … `)
      try {
        const g = await sampleEssayGrade(text, task)
        grades.set(essayId, g)
        process.stdout.write(`bands [${g.bands.join(', ')}]${g.parseMisses ? ` (+${g.parseMisses} parse miss)` : ''}\n`)
      } catch (err) {
        process.stdout.write(`FAILED (${err.message})\n`)
        grades.set(essayId, { bands: [], coverages: [], parseMisses: CONTENT_N })
      }
      gi += 1
      if (gi < essays.size) await sleep(CONTENT_PACE_MS) // pace between unique essays too
    }
  }
  for (const p of reattemptSet) {
    const beforeGrade = grades.get(p.before.id) || { bands: [], coverages: [] }
    const afterGrade = grades.get(p.after.id) || { bands: [], coverages: [] }
    reattemptItems.push({ pair: p, verdict: reattemptVerdict(p, beforeGrade, afterGrade) })
  }
  if (!HAS_KEY) {
    let chars = 0
    for (const [, { text, task }] of essays) {
      chars += buildWritingGradePrompt({ formatHints: formatHintsFor(task), metrics: contentMetrics(text), findings: [], task }).length
    }
    console.log(`  DRY RUN: built ${essays.size} parity prompts (${Math.round(chars / Math.max(1, essays.size))} avg chars) via buildWritingGradePrompt — no Gemini calls.`)
    console.log(`  Set GEMINI_KEY to grade each essay N=${CONTENT_N}× and compute the over-praise / real-recall rates.`)
  }
  }

  report(writingItems, cikguItems, contentItems, reattemptItems)
}

// ── Reporting ────────────────────────────────────────────────────────────────

function report(writingItems, cikguItems, contentItems = [], reattemptItems = []) {
  // FREE writing — deterministic span recall + by-segment (always available).
  const segRecords = []
  for (const it of writingItems) for (const e of it.errors) segRecords.push({ regexExpected: e.regexExpected, caught: e.freeSpanCaught })
  const freeSeg = recallBySegment(segRecords)

  console.log('\n════════════════════════════════════════════════════════════')
  console.log(' RESULTS')
  console.log('════════════════════════════════════════════════════════════')

  if (RUN_WRITING) {
    console.log('\n[Writing · FREE tier, deterministic span-overlap recall]')
    console.table([
      { segment: 'regex-catchable', caught: freeSeg.regexCatchable.caught, total: freeSeg.regexCatchable.total, recall: pct(freeSeg.regexCatchable.recall) },
      { segment: 'semantic (regex-blind)', caught: freeSeg.semantic.caught, total: freeSeg.semantic.total, recall: pct(freeSeg.semantic.recall) },
    ])
  }

  // FREE Cikgu — deterministic confidence-gate audit (no key needed). The key
  // safety metric: out-of-coverage questions answered CONFIDENTLY (the bluff).
  // The gate (cikguKnowledge.MIN_CONFIDENCE) should drive that to ~0.
  const cikguConf = {}
  for (const it of cikguItems) {
    const b = cikguConf[it.coverageHint] || (cikguConf[it.coverageHint] = { confident: 0, total: 0 })
    b.total += 1
    if (it.freeConfident) b.confident += 1
  }
  if (RUN_CIKGU) {
    const confRow = (h) => {
      const b = cikguConf[h] || { confident: 0, total: 0 }
      return { coverage: h, confidentAnswers: b.confident, routedToUncertainty: b.total - b.confident, total: b.total }
    }
    console.log('\n[Cikgu · FREE confidence gate — deterministic, no key]')
    console.table(['in', 'partial', 'out'].map(confRow))
    const outConf = cikguConf.out || { confident: 0, total: 0 }
    console.log(`False-confident (out-of-coverage answered confidently): ${outConf.confident}/${outConf.total} — target ~0.`)
  }

  const out = {
    generatedNote: 'AI-tier eval results. Free tier deterministic; BYOK/judge columns require GEMINI_KEY.',
    // In content-only mode no LLM judge runs, so judge/self-preference are N/A.
    model: HAS_KEY
      ? (RUN_WRITING || RUN_CIKGU)
        ? { contestant: GEMINI_MODEL, judge: JUDGE_MODEL, judgeSelfPreferenceRisk: JUDGE_MODEL === GEMINI_MODEL }
        : { contestant: GEMINI_MODEL, judge: null, judgeSelfPreferenceRisk: false }
      : null,
    temperature: 0,
    writing: { freeSpanRecallBySegment: freeSeg, items: writingItems },
    cikgu: { freeConfidenceByCoverage: cikguConf, items: cikguItems },
    content: { items: contentItems },
    reattempt: { items: reattemptItems },
  }

  // ── CONTENT (over-praise) — keyed numbers, else a no-key note ──
  reportContent(contentItems, out)

  // ── REATTEMPT (improvement detection) — keyed numbers, else a no-key note ──
  if (RUN_REATTEMPT) reportReattempt(reattemptItems, out)

  if (HAS_KEY && (RUN_WRITING || RUN_CIKGU)) {
    // Judge-based recall, both tiers.
    const freeCaught = writingItems.map((it) => judgeCaughtFlags(it.freeJudge, it.plantedCount))
    const byokCaught = writingItems.map((it) => judgeCaughtFlags(it.byokJudge, it.plantedCount))
    const freeFP = writingItems.map((it) => (it.freeJudge?.falsePositives?.length) || 0)
    const byokFP = writingItems.map((it) => (it.byokJudge?.falsePositives?.length) || 0)
    const freeAgg = aggregateWriting(freeCaught, freeFP)
    const byokAgg = aggregateWriting(byokCaught, byokFP)

    console.log('\n[Writing · judge-based recall + false positives]')
    console.table([
      { tier: 'FREE (rule-based)', recall: pct(freeAgg.recall), caught: `${freeAgg.caught}/${freeAgg.totalErrors}`, falsePositives: freeAgg.falsePositives },
      { tier: 'BYOK (LLM)', recall: pct(byokAgg.recall), caught: `${byokAgg.caught}/${byokAgg.totalErrors}`, falsePositives: byokAgg.falsePositives },
    ])

    // Judge audit: free judge "caught" vs deterministic span-overlap.
    let agree = 0; let disagree = 0
    writingItems.forEach((it) => {
      const judgeFlags = judgeCaughtFlags(it.freeJudge, it.plantedCount)
      it.errors.forEach((e, i) => { if (judgeFlags[i] === e.freeSpanCaught) agree += 1; else disagree += 1 })
    })
    console.log(`\n[Judge audit] free-tier: judge agrees with deterministic span-overlap on ${agree}/${agree + disagree} planted errors (${pct(agree / (agree + disagree))}). Low agreement ⇒ distrust the judge.`)

    // Cikgu fact-recall + wrong facts.
    const freeFacts = cikguItems.map((it) => judgePresentFlags(it.freeJudge, it.keyFactCount))
    const byokFacts = cikguItems.map((it) => judgePresentFlags(it.byokJudge, it.keyFactCount))
    const freeWrong = cikguItems.map((it) => (it.freeJudge?.wrongFacts?.length) || 0)
    const byokWrong = cikguItems.map((it) => (it.byokJudge?.wrongFacts?.length) || 0)
    const freeCAgg = aggregateCikgu(freeFacts, freeWrong)
    const byokCAgg = aggregateCikgu(byokFacts, byokWrong)

    console.log('\n[Cikgu · fact-recall + wrong facts]')
    console.table([
      { tier: 'FREE (rule-based)', factRecall: pct(freeCAgg.factRecall), present: `${freeCAgg.present}/${freeCAgg.totalFacts}`, wrongFacts: freeCAgg.wrongFacts },
      { tier: 'BYOK (LLM)', factRecall: pct(byokCAgg.factRecall), present: `${byokCAgg.present}/${byokCAgg.totalFacts}`, wrongFacts: byokCAgg.wrongFacts },
    ])

    out.summary = {
      writing: { free: freeAgg, byok: byokAgg, judgeAuditAgreement: agree / (agree + disagree) },
      cikgu: { free: freeCAgg, byok: byokCAgg },
    }
    writeCsv(writingItems, cikguItems)
    writeSpotCheck(writingItems, cikguItems)
  } else if (!HAS_KEY) {
    console.log('\n(Set GEMINI_KEY to populate BYOK recall, false positives, Cikgu fact-recall, the win-rate table, and the spot-check sheet.)')
  }

  const wroteCsv = HAS_KEY && (RUN_WRITING || RUN_CIKGU)
  writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(out, null, 2))
  console.log(`\nWrote ${path.relative(process.cwd(), path.join(OUT_DIR, 'results.json'))}`)
  if (wroteCsv) console.log('Wrote results.csv + spot-check.md (audit the judge there).')
  console.log('\nNext: fill the DECISION per surface in docs/research/2026-06-12-ai-tier-eval.md.\n')
}

// CONTENT (over-praise) printout. Over-praise = a gold essay whose Content band
// exceeds its expectedContentMax in ANY of the N samples. We print the rate, a
// per-label breakdown (onTask / partial / offTopicFluent), per-essay sample
// variance, and the explicit ship gate. Without a key there are no samples → a
// note (the dry-run note was already printed above; here we just record state).
function reportContent(contentItems, out) {
  const sampled = contentItems.filter((it) => it.samples.length > 0)
  console.log('\n[Content · task-aware over-praise — fluency must NOT rescue off-task/partial answers]')
  if (!sampled.length) {
    console.log('  (No samples — set GEMINI_KEY to run the Content trait. Prompts were built + cost-estimated in the dry run above.)')
    out.content.summary = { sampled: 0, note: 'no key — dry run only' }
    return
  }

  const { rate, flagged } = overPraiseRate(sampled)
  const flaggedIds = new Set(flagged.map((r) => r.id))

  // Per-essay sample variance (so robustness is visible).
  console.table(sampled.map((it) => {
    const min = Math.min(...it.samples)
    const max = Math.max(...it.samples)
    return {
      id: it.id, label: it.label, ceiling: it.expectedContentMax,
      samples: it.samples.join(','), spread: `${min}-${max}`,
      overPraise: flaggedIds.has(it.id) ? 'FLAG' : 'ok',
      parseMisses: it.parseMisses || 0,
    }
  }))

  // Per-label breakdown — where does over-praise concentrate?
  const byLabel = {}
  for (const it of sampled) {
    const b = byLabel[it.label] || (byLabel[it.label] = { total: 0, flagged: 0 })
    b.total += 1
    if (flaggedIds.has(it.id)) b.flagged += 1
  }
  console.log('\n[Content · over-praise by label]')
  console.table(['onTask', 'partial', 'offTopicFluent'].map((label) => {
    const b = byLabel[label] || { total: 0, flagged: 0 }
    return { label, withinCeiling: b.total - b.flagged, overPraised: b.flagged, total: b.total }
  }))

  const within = sampled.length - flagged.length
  const ships = flagged.length <= 1 && sampled.length >= 10 // ≥ 9/10 within ceiling
  console.log(`\nOver-praise rate: ${pct(rate)} (${flagged.length}/${sampled.length} essays exceeded their ceiling in ≥1 of ${CONTENT_N} samples).`)
  console.log(`Within ceiling: ${within}/${sampled.length}.`)
  console.log(`DECISION GATE: off-topic/partial essays stay within expectedContentMax in ≥ 9/10 essays across the ${CONTENT_N} samples → trait SHIPS; else BYOK-gate/degrade.`)
  console.log(`  → ${ships ? '✅ SHIP — gate met.' : '⛔ DO NOT SHIP — gate NOT met (BYOK-gate or degrade the Content trait).'}${sampled.length < 10 ? ' (NOTE: fewer than 10 essays sampled — not a full decision.)' : ''}`)
  if (flagged.length) {
    console.log(`  Over-praised: ${flagged.map((r) => `${r.id} (${r.label}, ceiling ${r.expectedContentMax}, samples [${r.samples.join(',')}])`).join('; ')}`)
  }

  out.content.summary = {
    sampled: sampled.length, overPraiseRate: rate, withinCeiling: within,
    flagged: flagged.map((r) => ({ id: r.id, label: r.label, expectedContentMax: r.expectedContentMax, samples: r.samples })),
    byLabel, shipGateMet: ships,
  }
}

// REATTEMPT (improvement detection) printout. The whole point of the re-attempt
// loop is that it claims "you improved" ONLY on a real change — so a COSMETIC edit
// must NOT raise the band or flip the missed requirement ✗→✓ (that would be over-
// praise), while a REAL improvement must be detected. We print a per-pair table,
// the over-praise rate (must be ~0), real-improvement recall, and the ship gate.
function reportReattempt(reattemptItems, out) {
  console.log('\n[Re-attempt · improvement detection — a cosmetic edit must NOT look improved]')
  const verdicts = reattemptItems.map((it) => it.verdict)
  const graded = verdicts.filter((v) => v.bandBefore != null || v.bandAfter != null)
  if (!graded.length) {
    console.log('  (No samples — set GEMINI_KEY to run the re-attempt surface. Prompts were built + cost-estimated in the dry run above.)')
    out.reattempt.summary = { sampled: 0, note: 'no key — dry run only' }
    return
  }

  console.table(verdicts.map((v) => ({
    id: v.id, label: v.label, targetReq: v.targetReq,
    band: `${v.bandBefore}→${v.bandAfter}`,
    reqMet: `${v.metBefore}→${v.metAfter}`,
    looksImproved: v.looksImproved ? 'YES' : 'no',
    verdict: v.label === 'cosmeticEdit'
      ? (v.looksImproved ? 'OVER-PRAISE' : 'ok')
      : (v.looksImproved ? 'detected' : 'MISSED'),
  })))

  const s = reattemptSummary(verdicts)
  // Ship gate mirrors the Content gate's ≥9/10 spirit: ≤1 cosmetic over-praise out
  // of ≥6 cosmetic pairs AND real improvements mostly detected (recall ≥ 0.5).
  const ships = s.overPraised <= 1 && s.cosmeticTotal >= 6 && s.realRecall >= 0.5
  console.log(`\nCosmetic over-praise: ${s.overPraised}/${s.cosmeticTotal} (${pct(s.overPraiseRate)}) — target ~0.`)
  console.log(`Real-improvement recall: ${s.realDetected}/${s.realTotal} (${pct(s.realRecall)}).`)
  console.log(`DECISION GATE: cosmetic edits do NOT look improved in ≥ ${Math.max(0, s.cosmeticTotal - 1)}/${s.cosmeticTotal} pairs AND real improvements are detected (recall ≥ 50%) → the "you improved" claim SHIPS; else degrade to "re-graded — review your requirements".`)
  console.log(`  → ${ships ? '✅ SHIP — gate met.' : '⛔ DO NOT SHIP the confident improvement claim — degrade/BYOK-gate the comparison verdict.'}`)
  if (s.overPraisedIds.length) console.log(`  Over-praised (cosmetic looked improved): ${s.overPraisedIds.join(', ')}`)
  if (s.missedRealIds.length) console.log(`  Missed real improvements: ${s.missedRealIds.join(', ')}`)

  out.reattempt.summary = { ...s, sampled: graded.length, shipGateMet: ships, verdicts }
}

// judge returns errors:[{index,caught}] — flatten to a per-planted-error boolean
// array, defaulting missing indices to false (uncaught).
function judgeCaughtFlags(judge, count) {
  const flags = new Array(count).fill(false)
  if (judge?.errors) for (const e of judge.errors) if (Number.isInteger(e.index) && e.index < count) flags[e.index] = !!e.caught
  return flags
}
function judgePresentFlags(judge, count) {
  const flags = new Array(count).fill(false)
  if (judge?.keyFacts) for (const f of judge.keyFacts) if (Number.isInteger(f.index) && f.index < count) flags[f.index] = !!f.present
  return flags
}

function writeCsv(writingItems, cikguItems) {
  const rows = ['surface,item,tier,recall,caught,total,false_or_wrong']
  for (const it of writingItems) {
    for (const [tier, j] of [['free', it.freeJudge], ['byok', it.byokJudge]]) {
      const flags = judgeCaughtFlags(j, it.plantedCount)
      const c = flags.filter(Boolean).length
      const fp = j?.falsePositives?.length || 0
      rows.push(`writing,${it.id},${tier},${it.plantedCount ? (c / it.plantedCount).toFixed(3) : 'NA'},${c},${it.plantedCount},${fp}`)
    }
  }
  for (const it of cikguItems) {
    for (const [tier, j] of [['free', it.freeJudge], ['byok', it.byokJudge]]) {
      const flags = judgePresentFlags(j, it.keyFactCount)
      const c = flags.filter(Boolean).length
      const wf = j?.wrongFacts?.length || 0
      rows.push(`cikgu,${it.id},${tier},${(c / it.keyFactCount).toFixed(3)},${c},${it.keyFactCount},${wf}`)
    }
  }
  writeFileSync(path.join(OUT_DIR, 'results.csv'), rows.join('\n'))
}

// Spot-check sheet — deterministic 5 items/surface (spread indices), with both
// outputs + the judge's call, so Kheshav can audit whether the judge is right.
function writeSpotCheck(writingItems, cikguItems) {
  const pick = (arr) => [0, Math.floor(arr.length * 0.25), Math.floor(arr.length * 0.5), Math.floor(arr.length * 0.75), arr.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i).map((i) => arr[i])
  const lines = ['# AI-tier eval — spot-check sheet', '', 'Audit the JUDGE: read both outputs and the judge\'s verdict. If you disagree with the judge, the eval numbers are suspect.', '']
  lines.push('## Writing', '')
  for (const it of pick(writingItems)) {
    lines.push(`### ${it.id} (level ${it.level}, intended band ${it.intendedBand}, ${it.plantedCount} planted errors)`)
    lines.push('**Planted errors:** ' + (it.errors.map((e) => `${e.span}→${e.correct} [${e.category}]`).join('; ') || '(none)'))
    lines.push('\n**FREE output:**\n```\n' + (it.freeText || '') + '\n```')
    lines.push('**FREE judge:** caught ' + summariseWritingJudge(it.freeJudge, it.plantedCount))
    lines.push('\n**BYOK output:**\n```\n' + (it.byokText || '(no key)') + '\n```')
    lines.push('**BYOK judge:** caught ' + summariseWritingJudge(it.byokJudge, it.plantedCount) + '\n')
  }
  lines.push('## Cikgu', '')
  for (const it of pick(cikguItems)) {
    lines.push(`### ${it.id} (coverage hint: ${it.coverageHint}, free top-match score ${it.freeTopScore})`)
    lines.push(`**Q:** ${it.question}`)
    lines.push('\n**FREE answer:**\n```\n' + (it.freeText || '') + '\n```')
    lines.push('**FREE judge:** ' + summariseCikguJudge(it.freeJudge, it.keyFactCount))
    lines.push('\n**BYOK answer:**\n```\n' + (it.byokText || '(no key)') + '\n```')
    lines.push('**BYOK judge:** ' + summariseCikguJudge(it.byokJudge, it.keyFactCount) + '\n')
  }
  writeFileSync(path.join(OUT_DIR, 'spot-check.md'), lines.join('\n'))
}

function summariseWritingJudge(j, count) {
  if (!j) return '(no key)'
  const flags = judgeCaughtFlags(j, count)
  return `${flags.filter(Boolean).length}/${count}; false positives: ${j.falsePositives?.length || 0}${j.falsePositives?.length ? ' (' + j.falsePositives.map((f) => f.claim).join('; ') + ')' : ''}`
}
function summariseCikguJudge(j, count) {
  if (!j) return '(no key)'
  const flags = judgePresentFlags(j, count)
  return `facts ${flags.filter(Boolean).length}/${count}; wrong facts: ${j.wrongFacts?.length || 0}${j.wrongFacts?.length ? ' (' + j.wrongFacts.map((f) => f.claim).join('; ') + ')' : ''}`
}

main().catch((err) => { console.error('\nHARNESS ERROR:', err); process.exit(1) })
