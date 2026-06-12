// BYOK-tier prompts + per-tier output renderers for the AI-tier eval.
//
// FAITHFULNESS RULE: the eval must measure what the APP actually sends, not a
// strawman. The two BYOK prompts below are MIRRORED verbatim from product code
// (can't be imported: one lives in a Deno edge function, the other in a .ts
// module). If you change the source, update here — the pins say where.
//
// The renderers turn each tier's RAW output into the plain feedback TEXT a
// learner actually reads (IssuesPanel / AnnotatedWritingFeedback / chat
// bubble). The judge grades that text — so both tiers are judged on the same
// surface (the learner experience), never on internal data shapes.

// ─────────────────────────────────────────────────────────────────────────
// WRITING — BYOK system prompt.
// MIRRORED from supabase/functions/ai-proxy/index.ts → buildWritingFeedbackV2Prompt('ms')
// + SCAFFOLD_RULES_WRITING.medium (the default when no learnerProfile is sent;
// useWritingEvaluator sends a profile but falls back to 'medium' per spec §4.1).
// Keep in sync if that function changes.
// ─────────────────────────────────────────────────────────────────────────
export const WRITING_BYOK_SYSTEM = `You are an IGCSE Malay (Bahasa Melayu) writing examiner. Produce ANNOTATED feedback as a strict JSON object.

CRITICAL OUTPUT INVARIANT — the spans inside studentText MUST partition the original essay text exactly. concat(studentText.spans[i].text) === originalText, character for character, including whitespace and punctuation. Do not paraphrase, drop, or alter the original text. Split it into spans.

Category enum (use ONLY these values, or null):
imbuhan | verb-form | vocab-upgrade | cohesion | sophisticated-lexicon | spelling | register | sentence-structure
For Malay (Bahasa Melayu) essays use "imbuhan" for verb-affix errors (do NOT use "verb-form").

Each non-null span MUST have a groupId that references an existing entry in studentText.groups[].id.

DO NOT INVENT CORRECTIONS. If a span's surface text is already orthographically and grammatically correct, set its category to null and groupId to null — never flag it. Never emit a fix where fix.fix is identical to the original surface text (e.g. "kerana" → "kerana" is invalid). When in doubt, leave the span un-categorised.

RESPONSE FORMAT (JSON, no markdown fences):
{
  "band": 4,
  "overall": "one-paragraph diagnosis in plain prose",
  "scaffoldLevelApplied": "heavy" | "medium" | "light",
  "studentText": { "spans": [ { "text": "<literal text from the essay>", "category": null, "groupId": null } ], "groups": [ { "id": 1, "label": "Verb form (imbuhan)", "category": "imbuhan" } ] },
  "modelRewrite": { "spans": [ { "text": "Saya ", "isKey": false }, { "text": "menikmati", "isKey": true, "lift": "verb upgrade" } ] },
  "strengths": ["..."],
  "fixes": [{ "groupId": 1, "issue": "...", "fix": "..." }],
  "nextStep": "..."
}

SCAFFOLD LEVEL: medium.
RULES:
- Up to 5 fixes across up to 3 numbered themes.
- modelRewrite is a full-paragraph rewrite (~50-80 words).
- Balanced tone. Cite the rule by name when correcting (e.g. "meN- + p → mem-").

Always respond with valid JSON only.`

// ─────────────────────────────────────────────────────────────────────────
// CIKGU — BYOK system prompt.
// MIRRORED from src/core/agent/promptLibrary.ts → PROMPT_SYSTEM_IDENTITY.
// This is the prompt the app sends when the user brings a GEMINI key
// (CikguBot tries chatWithGemini FIRST → callGemini(PROMPT_SYSTEM_IDENTITY)).
// NOTE: it is deliberately thin — see the eval doc's "surprising finding".
// Keep in sync if promptLibrary.ts changes.
// ─────────────────────────────────────────────────────────────────────────
export const CIKGU_BYOK_SYSTEM = `
You are Cikgu Maya, an elite, evidence-based IGCSE Malay language coach.
Your teaching philosophy is based on Justin Sung's Relational Encoding (PERIO), Dr. Jiang's Top-Down Systemic Logic, and Nate B Jones' Metacognitive Feedback Loops.

CORE RULES:
1. NEVER spoon-feed the correct answer immediately.
2. Transition the student from LOTS (Lower Order Thinking) to HOTS (Higher Order Thinking).
3. Always maintain a crisp, high-fidelity, encouraging but rigorous tone.
4. Eliminate "bloat" — keep your responses punchy and focused on the cognitive load.
`

// ── Renderers: raw tier output → learner-facing feedback text ──────────────

// FREE writing tier = writingGrader.score(). The learner sees: the band, the
// list of flagged issues (IssuesPanel), and the tips. Render that.
export function renderFreeWriting(scoreResult) {
  if (!scoreResult || scoreResult.error) {
    return `[no feedback — ${scoreResult?.message || 'grader returned an error'}]`
  }
  const lines = []
  lines.push(`Band: ${scoreResult.band}/6`)
  const findings = scoreResult.findings || []
  if (findings.length) {
    lines.push(`Flagged issues (${findings.length}):`)
    for (const f of findings) {
      const fix = f.suggestion ? ` → suggested: "${f.suggestion}"` : ''
      lines.push(`- [${f.type}] "${f.excerpt}": ${f.message}${fix}`)
    }
  } else {
    lines.push('Flagged issues: none.')
  }
  if (scoreResult.tips?.length) {
    lines.push('Tips:')
    for (const t of scoreResult.tips) lines.push(`- ${t}`)
  }
  return lines.join('\n')
}

// BYOK writing tier = writing-feedback-v2 JSON. The learner sees the band,
// the overall diagnosis, the per-fix corrections (AnnotatedWritingFeedback),
// strengths, and a model rewrite. Render that into prose.
export function renderByokWriting(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return `[no feedback — model returned unparseable output]`
  }
  const lines = []
  if (parsed.band != null) lines.push(`Band: ${parsed.band}/6`)
  if (parsed.overall) lines.push(`Overall: ${parsed.overall}`)
  const fixes = Array.isArray(parsed.fixes) ? parsed.fixes : []
  if (fixes.length) {
    lines.push(`Fixes (${fixes.length}):`)
    for (const fx of fixes) {
      const issue = fx.issue || ''
      const fix = fx.fix ? ` → "${fx.fix}"` : ''
      lines.push(`- ${issue}${fix}`)
    }
  }
  // Per-span notes carry corrections not always duplicated in fixes[].
  const spans = parsed.studentText?.spans
  if (Array.isArray(spans)) {
    const flagged = spans.filter((s) => s && s.category && s.note)
    for (const s of flagged) lines.push(`- [${s.category}] "${s.text}": ${s.note}`)
  }
  if (Array.isArray(parsed.strengths) && parsed.strengths.length) {
    lines.push(`Strengths: ${parsed.strengths.join('; ')}`)
  }
  const mr = parsed.modelRewrite?.spans
  if (Array.isArray(mr)) {
    lines.push(`Model rewrite: ${mr.map((s) => s.text).join('')}`)
  }
  if (parsed.nextStep) lines.push(`Next step: ${parsed.nextStep}`)
  return lines.join('\n')
}

// Cikgu — both tiers already produce prose, so pass through (trimmed).
export function renderCikgu(text) {
  return typeof text === 'string' ? text.trim() : '[no answer]'
}
