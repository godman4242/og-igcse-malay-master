// LLM judge — the VALIDATOR. Bias controls baked in:
//
//  1. JUDGE ≠ CONTESTANT. The judge model is configurable and defaults to a
//     different model than the BYOK contestant; the harness stamps a loud
//     `judgeSelfPreferenceRisk` flag when they are equal so the limitation is
//     never hidden (decide-and-flag, no silent caps).
//  2. INDEPENDENT GROUND-TRUTH GRADING, not A/B preference. Each candidate is
//     graded ALONE against the planted answer key — there is no pairing, so
//     position/order bias is structurally impossible. (A/B randomisation only
//     matters when the judge expresses a PREFERENCE between two outputs; here
//     the judge only checks objective checklist presence, so independent
//     grading is the stronger control. This is a deliberate deviation from the
//     kickoff's "randomized A/B order" — see the eval doc.)
//  3. BLIND. The candidate is labelled neutrally ("CANDIDATE FEEDBACK"); the
//     judge is never told whether it came from a rule-based or an AI tier, so it
//     can't apply a "rule-based vs AI" prior.
//  4. TEMPERATURE 0 on the judge (and the contestant) for reproducibility.
//
// The judge ONLY decides checklist matches + flags wrong claims. It renders no
// free-form quality opinion — all scores are objective counts derived from its
// boolean verdicts.

import { geminiText, parseJson } from './geminiClient.mjs'

const JUDGE_SYSTEM = `You are a STRICT, literal grader for a language-tutoring evaluation. You are given an answer key (a list of specific items) and ONE candidate text. Your only job is to decide, for each key item, whether the candidate text addresses it — by MEANING, not exact wording — and to flag any clearly incorrect claims the candidate makes.

Rules:
- Judge ONLY against the provided key. Do not reward fluency, tone, or length.
- "Addressed" means the candidate identifies/explains/corrects that specific item, even if phrased differently. Partial or vague mentions that do not convey the item do NOT count as addressed.
- Be conservative and consistent. When genuinely unsure, mark as NOT addressed.
- Output STRICT JSON only, no markdown, matching the requested schema exactly.`

// ── Writing judge ──────────────────────────────────────────────────────────

export function buildWritingJudgeUser(essay, plantedErrors, candidateText) {
  const key = plantedErrors.map((e, i) =>
    `${i}. [${e.category}] error at "${e.span}" — correct form: "${e.correct}". (${e.note})`).join('\n')
  return `ESSAY (Malay):
"""
${essay}
"""

ANSWER KEY — the COMPLETE list of real errors planted in this essay${plantedErrors.length === 0 ? ' (this essay has NO planted errors — it is deliberately correct)' : ''}:
${key || '(none)'}

CANDIDATE FEEDBACK to grade:
"""
${candidateText}
"""

For EACH numbered key error, decide whether the CANDIDATE FEEDBACK catches/corrects that specific error.
Then list FALSE POSITIVES: places where the candidate flags or "corrects" text that is actually CORRECT. Treat the answer key as the complete set of real errors; if the candidate flags something NOT in the key, only count it as a false positive when the flagged text is genuinely correct Malay (use your own knowledge to decide).

Output JSON exactly:
{
  "errors": [ { "index": <number>, "caught": <true|false>, "evidence": "<short quote from candidate, or empty>" } ],
  "falsePositives": [ { "claim": "<what the candidate wrongly flagged/changed>", "why": "<why it was actually correct>" } ]
}`
}

export function buildCikguJudgeUser(question, keyFacts, candidateText) {
  const key = keyFacts.map((f, i) => `${i}. ${f}`).join('\n')
  return `QUESTION (IGCSE Malay):
"""
${question}
"""

ANSWER KEY — facts a correct answer must contain:
${key}

CANDIDATE ANSWER to grade:
"""
${candidateText}
"""

For EACH numbered key fact, decide whether the CANDIDATE ANSWER conveys it (by meaning).
Then list WRONG FACTS: any clearly incorrect or misleading claim the candidate makes about Malay grammar/usage.

Output JSON exactly:
{
  "keyFacts": [ { "index": <number>, "present": <true|false>, "evidence": "<short quote from candidate, or empty>" } ],
  "wrongFacts": [ { "claim": "<the incorrect claim>", "why": "<why it is wrong>" } ]
}`
}

// Run the judge on one candidate. Returns the parsed verdict (or a null-shaped
// fallback so one bad parse never crashes the whole run).
export async function judgeWriting({ apiKey, judgeModel, essay, plantedErrors, candidateText }) {
  const text = await geminiText({
    apiKey, model: judgeModel,
    systemPrompt: JUDGE_SYSTEM,
    userContent: buildWritingJudgeUser(essay, plantedErrors, candidateText),
    json: true, maxTokens: 1536,
  })
  const parsed = parseJson(text)
  if (!parsed || !Array.isArray(parsed.errors)) {
    return { errors: [], falsePositives: [], _parseFailed: true, _raw: text.slice(0, 400) }
  }
  return { errors: parsed.errors, falsePositives: Array.isArray(parsed.falsePositives) ? parsed.falsePositives : [] }
}

export async function judgeCikgu({ apiKey, judgeModel, question, keyFacts, candidateText }) {
  const text = await geminiText({
    apiKey, model: judgeModel,
    systemPrompt: JUDGE_SYSTEM,
    userContent: buildCikguJudgeUser(question, keyFacts, candidateText),
    json: true, maxTokens: 1536,
  })
  const parsed = parseJson(text)
  if (!parsed || !Array.isArray(parsed.keyFacts)) {
    return { keyFacts: [], wrongFacts: [], _parseFailed: true, _raw: text.slice(0, 400) }
  }
  return { keyFacts: parsed.keyFacts, wrongFacts: Array.isArray(parsed.wrongFacts) ? parsed.wrongFacts : [] }
}
