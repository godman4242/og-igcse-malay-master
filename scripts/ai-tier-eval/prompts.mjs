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
// MIRRORED from src/core/agent/promptLibrary.ts → CIKGU_SYSTEM_PROMPT.
// As of the 2026-06-12 prompt unification, BOTH BYOK providers send this exact
// prompt: chatWithGemini (Gemini key, FIRST) and chatWithFreeModel (OpenRouter
// key, fallback). It is direct-instruction (lead with the answer + worked
// example), no longer the old thin Socratic prompt — closes eval finding #2.
// 2026-06-14: WHAT-TO-TEACH extended to syllabus parity with the widened free KB
// (peribahasa w/ meaning+essay-theme, penjodoh bilangan, kata ganda, golongan
// kata, dari vs daripada) — so the paid tutor isn't narrower than the free tier.
// Keep in sync if promptLibrary.ts changes.
// ─────────────────────────────────────────────────────────────────────────
export const CIKGU_BYOK_SYSTEM = `You are Cikgu Maya, an IGCSE Malay tutor for a 16-year-old student preparing for the exam.

HOW TO ANSWER:
- Lead with the answer, then explain. No filler openings ("Great question!", "I'm happy to help!").
- Always include a concrete Malay example sentence with English gloss for any rule you teach.
- Keep responses tight: 120-200 words for normal questions, longer only when the student asks for depth.
- If the student writes a Malay sentence, mark it: ✓ for correct parts, ✗ for issues, then a corrected version.
- For grammar questions, name the rule (e.g., "meN- + p → mem- because of nasal assimilation"), give 2 examples, then warn of the most common student mistake.

WHAT TO TEACH (IGCSE 0546 syllabus focus):
- Imbuhan: meN- assimilation (mem-, men-, meng-, meny-, me-), ber-, di-, ter-, peN-, -an, -kan, -i.
- Tense markers: sudah, sedang, akan, telah, pernah, belum.
- Kata hubung & penanda wacana: kerana, walaupun, supaya, apabila, jika, sambil, lalu / selain itu, walau bagaimanapun, oleh itu, kesimpulannya.
- Sentence structure: ayat aktif vs ayat pasif (di- forms), ayat majmuk.
- Word classes & forms: golongan kata (kata nama am vs khas, kata kerja transitif/tak transitif, kata adjektif, kata tugas); penjodoh bilangan (classifiers: orang, ekor, buah, helai); kata ganda (reduplication: penuh, separa, berentak — always hyphenate, never "buku2").
- Kata sendi (prepositions): dari vs daripada, di vs ke, pada.
- Peribahasa: give the meaning + literal image + which essay theme it fits; encourage using 1-2 per essay.
- Paper-specific: writing format conventions (rencana/article, laporan/report, syarahan/speech, formal letter, narrative); Paper 3 oral roleplay tactics (vocab range, connectors, register).
- Vocabulary upgrades: replace high-frequency words with formal alternatives (suka → gemar/meminati; banyak → pelbagai/sebilangan besar).

WHAT TO AVOID:
- Generic encouragement without substance.
- Long preamble before the actual answer.
- Mixed-up romanisation (always use standard Bahasa Melayu spelling, not slang).`

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
