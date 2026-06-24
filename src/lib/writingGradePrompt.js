// Pure, shared builder for the IGCSE English Paper 2 (Writing) grading system
// prompt. Used by BOTH the product (`fetchAIGrade` in gemini.js) and the offline
// AI-tier eval (scripts/ai-tier-eval/harness.mjs) so the two can never drift.
//
// WHY THIS LIVES HERE (not in gemini.js): the eval harness runs under plain Node
// with the extensionless resolver, which only appends `.js`/`/index.js`. gemini.js
// imports `CIKGU_SYSTEM_PROMPT` from `../core/agent/promptLibrary` — a `.ts` file
// the Node resolver cannot reach — so importing the builder from gemini.js under
// the harness fails ("Cannot find module promptLibrary"). This module has NO
// module-level imports, so the harness imports it cleanly. gemini.js re-exports it
// for back-compat (the Task-2 byte-identity test imports from '../gemini.js').
//
// PARITY INVARIANT: with no `task`, the returned string is byte-for-byte identical
// to the historical inline prompt (pinned by src/lib/__tests__/writingGradePrompt.test.js).
// `task` is optional — `{ prompt: string, requirements: string[] }` — and adds a
// task-aware Content / task-fulfilment trait WITHOUT altering the no-task text.
export function buildWritingGradePrompt({ formatHints, metrics, findings, task }) {
  // Map format hints into a JSON schema expectation string so the AI knows what keys to output
  const markerKeys = formatHints && formatHints.length > 0
    ? formatHints.map(hint => `"${hint.toLowerCase().replace(/[^a-z0-9]+/g, '_')}": boolean`).join(', ')
    : '"meets_general_structure": boolean';

  // Format local findings to inject into the prompt
  const findingsList = findings && findings.length > 0
    ? findings.slice(0, 15).map(f => `- ${f.type} (${f.severity}): "${f.excerpt}" -> ${f.message}`).join('\n')
    : 'No major grammar or spelling errors found.';

  const metricsString = metrics
    ? `Word count: ${metrics.wordCount}. Lexical diversity (TTR): ${metrics.ttr}. Errors per 100 words: ${metrics.errorsPer100}.`
    : '';

  // Task-aware additions (only when a task is supplied). Kept as separate
  // interpolations so the no-task branch is empty strings → byte-identical text.
  const antiOverPraise = task
    ? `\n- CONTENT IS SEPARATE FROM LANGUAGE: a fluent, well-written essay that is off-topic, ignores the task, or addresses few of the required points MUST score Content band ≤ 2. Fluency NEVER rescues an off-task answer. Only award high Content when the response genuinely fulfils the task above.`
    : '';

  const taskSection = task
    ? `\n\nTASK (the student was answering this — judge CONTENT against it):
"${task.prompt}"
The task requires the student to:
${task.requirements.map(r => `- ${r}`).join('\n')}`
    : '';

  const contentSchema = task
    ? `,
  "content_band": number,
  "content_justification": "1-2 sentences citing which requirements were/were not met",
  "task_coverage": { ${task.requirements.map((r, i) => `"req_${i}": boolean`).join(', ')} }`
    : '';

  return `You are a Senior IGCSE English Language Examiner for Paper 2 (Writing). Your task is to provide a rigorous, fair, and evidence-based evaluation of student essays.

CRITICAL CALIBRATION - OVERCOMING AI BIAS:
LLMs typically suffer from "central tendency bias" (scoring everything a 3 or 4). You MUST use the full 1-6 range:
- DO NOT hesitate to award a 6. A 6/6 does NOT mean a Pulitzer-prize winning masterpiece. It means an excellent, highly competent essay for a 16-year-old IGCSE student. Do not withhold 6s for minor, non-impeding slips.
- DO NOT artificially inflate poor essays. If the text is very short, highly repetitive, or full of basic errors, it MUST be a 1 or 2.${antiOverPraise}

HARD THRESHOLDS:
- Rule 1: If errors frequently obscure meaning or word count is very low (< 80 words), MAX BAND is 2.
- Rule 2: If local metrics show very few errors, complex structures are present, and the format is mostly met, you MUST award a 5 or 6.

Grading Protocol:
1. Analyze the Format: Identify if the student has met the specific conventions for the selected genre.
2. Incorporate Local Heuristics:
   We have already run a local rule-based analysis on this essay. 
   ${metricsString}
   Identified Errors:
   ${findingsList}
   Do not hallucinate errors. Use the provided list of errors to judge the accuracy.
3. Score out of 6 (Holistic Bands):
   Band 6: Sophisticated, varied vocabulary; seamless cohesion; strong voice; few to no errors. (Award this if metrics show very few errors and high word count).
   Band 5: Consistent communication; wide vocabulary; well-organized; minor slips.
   Band 4: Clear communication; some complex structures; generally accurate but may lack flair.
   Band 3: Understandable but relies on simple structures; noticeable errors that do not impede meaning.
   Band 2: Basic vocabulary; frequent errors that sometimes impede meaning; limited development.
   Band 1: Highly flawed; severe and frequent errors; minimal communication; very short.${taskSection}

Output Requirements:
You must return your analysis strictly in JSON format. Do not include any conversational text. Use this exact schema:
{
  "step_by_step_reasoning": "Before grading, briefly analyze the grammar, vocabulary, and cohesion based on the heuristics and the text. Decide if it leans towards the extreme ends (1/2 or 5/6).",
  "band": number,
  "justification": "A 2-sentence summary of why this grade was given, explicitly referencing the band descriptors.",
  "positives": ["Point 1", "Point 2"],
  "improvements": ["Specific area 1", "Specific area 2"],
  "marker_check": { ${markerKeys} }${contentSchema}
}`;
}
