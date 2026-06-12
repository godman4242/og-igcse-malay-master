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
import { searchKnowledge, formatKnowledgeResponse, getRelatedEntries } from '../../src/data/cikguKnowledge.js'

import { WRITING_GOLD } from './goldWriting.mjs'
import { CIKGU_GOLD } from './goldCikgu.mjs'
import {
  WRITING_BYOK_SYSTEM, CIKGU_BYOK_SYSTEM,
  renderFreeWriting, renderByokWriting, renderCikgu,
} from './prompts.mjs'
import { geminiText, parseJson } from './geminiClient.mjs'
import { judgeWriting, judgeCikgu } from './judge.mjs'
import {
  freeSpanCoverage, verifyGoldSpans, aggregateWriting, aggregateCikgu,
  recallBySegment, pct, sum,
} from './score.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../../docs/research/ai-tier-eval-results')

const GEMINI_KEY = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const JUDGE_MODEL = process.env.JUDGE_MODEL || GEMINI_MODEL
const HAS_KEY = !!GEMINI_KEY

// ── FREE-tier producers (the REAL product code paths) ────────────────────────

function freeWriting(essay) {
  const result = score(essay.text, { lang: 'malay', format: essay.format })
  const findings = result.findings || []
  return { text: renderFreeWriting(result), band: result.band, findings, raw: result }
}

// Replicated from CikguBot.getExpertResponse (lives in the page, not a lib).
function freeCikgu(question) {
  const results = searchKnowledge(question, 2)
  const topScore = results[0]?.score ?? 0
  if (results.length === 0) {
    return { text: "I don't have a specific answer for that yet. Try asking about imbuhan, tatabahasa, writing tips, speaking tips, or vocabulary.", topScore: 0 }
  }
  const primary = results[0].entry
  let text = formatKnowledgeResponse(primary)
  if (results.length > 1 && results[1].score > 5) text += `\n\n---\nRelated: ${results[1].entry.title}`
  // getRelatedEntries is shown as chips in the UI, not in the answer text; omit.
  void getRelatedEntries
  return { text, topScore, matchedId: primary.id }
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
  console.log(`\nGold sets OK · writing: ${WRITING_GOLD.length} essays (${sum(WRITING_GOLD.map((e) => e.errors.length))} planted errors) · cikgu: ${CIKGU_GOLD.length} questions`)

  // Cost estimate BEFORE any call (his key, his cost).
  const callCount = HAS_KEY ? (WRITING_GOLD.length * 2 + CIKGU_GOLD.length * 2) : 0
  console.log('\n── Cost estimate ──')
  console.log(`  Free tier (rule-based): 0 API calls, $0.`)
  console.log(`  Full run: ${WRITING_GOLD.length} writing BYOK + ${WRITING_GOLD.length} writing judge + ${CIKGU_GOLD.length} cikgu BYOK + ${CIKGU_GOLD.length} cikgu judge = ${WRITING_GOLD.length * 2 + CIKGU_GOLD.length * 2} Gemini calls.`)
  console.log(`  ≈ 120k tokens total → $0 on the Gemini free tier (within 1500 req/day), under ~$0.20 on a paid Flash tier.`)
  if (!HAS_KEY) {
    console.log('\n⚠ No GEMINI_KEY set — running FREE tier only (dry run). Set GEMINI_KEY for the full comparison.')
  } else {
    console.log(`\n  Contestant model: ${GEMINI_MODEL} · Judge model: ${JUDGE_MODEL}`)
    if (JUDGE_MODEL === GEMINI_MODEL) {
      console.log('  ⚠ JUDGE_MODEL === contestant model — self-preference bias risk. Set JUDGE_MODEL to a different (ideally cross-provider) model for the credible run.')
    }
  }

  // ── WRITING ──
  console.log('\n── Surface 1: Malay writing feedback ──')
  const writingItems = []
  for (const essay of WRITING_GOLD) {
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

  // ── CIKGU ──
  console.log('\n── Surface 2: Cikgu answers ──')
  const cikguItems = []
  for (const q of CIKGU_GOLD) {
    const free = freeCikgu(q.question)
    const item = {
      id: q.id, coverageHint: q.coverageHint, question: q.question,
      keyFactCount: q.keyFacts.length, freeTopScore: free.topScore, freeMatchedId: free.matchedId || null,
      freeText: free.text, byokText: null, freeJudge: null, byokJudge: null,
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

  report(writingItems, cikguItems)
}

// ── Reporting ────────────────────────────────────────────────────────────────

function report(writingItems, cikguItems) {
  // FREE writing — deterministic span recall + by-segment (always available).
  const segRecords = []
  for (const it of writingItems) for (const e of it.errors) segRecords.push({ regexExpected: e.regexExpected, caught: e.freeSpanCaught })
  const freeSeg = recallBySegment(segRecords)

  console.log('\n════════════════════════════════════════════════════════════')
  console.log(' RESULTS')
  console.log('════════════════════════════════════════════════════════════')

  console.log('\n[Writing · FREE tier, deterministic span-overlap recall]')
  console.table([
    { segment: 'regex-catchable', caught: freeSeg.regexCatchable.caught, total: freeSeg.regexCatchable.total, recall: pct(freeSeg.regexCatchable.recall) },
    { segment: 'semantic (regex-blind)', caught: freeSeg.semantic.caught, total: freeSeg.semantic.total, recall: pct(freeSeg.semantic.recall) },
  ])

  const out = {
    generatedNote: 'AI-tier eval results. Free tier deterministic; BYOK/judge columns require GEMINI_KEY.',
    model: HAS_KEY ? { contestant: GEMINI_MODEL, judge: JUDGE_MODEL, judgeSelfPreferenceRisk: JUDGE_MODEL === GEMINI_MODEL } : null,
    temperature: 0,
    writing: { freeSpanRecallBySegment: freeSeg, items: writingItems },
    cikgu: { items: cikguItems },
  }

  if (HAS_KEY) {
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
  } else {
    console.log('\n(Set GEMINI_KEY to populate BYOK recall, false positives, Cikgu fact-recall, the win-rate table, and the spot-check sheet.)')
  }

  writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(out, null, 2))
  console.log(`\nWrote ${path.relative(process.cwd(), path.join(OUT_DIR, 'results.json'))}`)
  if (HAS_KEY) console.log('Wrote results.csv + spot-check.md (audit the judge there).')
  console.log('\nNext: fill the DECISION per surface in docs/research/2026-06-12-ai-tier-eval.md.\n')
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
