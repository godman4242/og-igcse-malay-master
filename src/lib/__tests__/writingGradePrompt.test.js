import { describe, it, expect } from 'vitest'
import { buildWritingGradePrompt } from '../gemini.js'

const metrics = { wordCount: 220, ttr: 0.5, errorsPer100: 1 }
const findings = []
const formatHints = ['Catchy title', 'Hook intro']

describe('buildWritingGradePrompt', () => {
  it('without a task: prompt is byte-identical to the pre-refactor prompt (regression)', () => {
    const EXPECTED_NO_TASK_PROMPT = `You are a Senior IGCSE English Language Examiner for Paper 2 (Writing). Your task is to provide a rigorous, fair, and evidence-based evaluation of student essays.

CRITICAL CALIBRATION - OVERCOMING AI BIAS:
LLMs typically suffer from "central tendency bias" (scoring everything a 3 or 4). You MUST use the full 1-6 range:
- DO NOT hesitate to award a 6. A 6/6 does NOT mean a Pulitzer-prize winning masterpiece. It means an excellent, highly competent essay for a 16-year-old IGCSE student. Do not withhold 6s for minor, non-impeding slips.
- DO NOT artificially inflate poor essays. If the text is very short, highly repetitive, or full of basic errors, it MUST be a 1 or 2.

HARD THRESHOLDS:
- Rule 1: If errors frequently obscure meaning or word count is very low (< 80 words), MAX BAND is 2.
- Rule 2: If local metrics show very few errors, complex structures are present, and the format is mostly met, you MUST award a 5 or 6.

Grading Protocol:
1. Analyze the Format: Identify if the student has met the specific conventions for the selected genre.
2. Incorporate Local Heuristics:
   We have already run a local rule-based analysis on this essay. 
   Word count: 220. Lexical diversity (TTR): 0.5. Errors per 100 words: 1.
   Identified Errors:
   No major grammar or spelling errors found.
   Do not hallucinate errors. Use the provided list of errors to judge the accuracy.
3. Score out of 6 (Holistic Bands):
   Band 6: Sophisticated, varied vocabulary; seamless cohesion; strong voice; few to no errors. (Award this if metrics show very few errors and high word count).
   Band 5: Consistent communication; wide vocabulary; well-organized; minor slips.
   Band 4: Clear communication; some complex structures; generally accurate but may lack flair.
   Band 3: Understandable but relies on simple structures; noticeable errors that do not impede meaning.
   Band 2: Basic vocabulary; frequent errors that sometimes impede meaning; limited development.
   Band 1: Highly flawed; severe and frequent errors; minimal communication; very short.

Output Requirements:
You must return your analysis strictly in JSON format. Do not include any conversational text. Use this exact schema:
{
  "step_by_step_reasoning": "Before grading, briefly analyze the grammar, vocabulary, and cohesion based on the heuristics and the text. Decide if it leans towards the extreme ends (1/2 or 5/6).",
  "band": number,
  "justification": "A 2-sentence summary of why this grade was given, explicitly referencing the band descriptors.",
  "positives": ["Point 1", "Point 2"],
  "improvements": ["Specific area 1", "Specific area 2"],
  "marker_check": { "catchy_title": boolean, "hook_intro": boolean }
}`
    expect(buildWritingGradePrompt({ formatHints, metrics, findings })).toBe(EXPECTED_NO_TASK_PROMPT)
  })
  it('with a task: includes the task prompt, every requirement, the anti-over-praise rule, and the content keys', () => {
    const task = { prompt: 'Write an article on screen time.', requirements: ['States a clear opinion', 'Two developed reasons'] }
    const p = buildWritingGradePrompt({ formatHints, metrics, findings, task })
    expect(p).toContain('Write an article on screen time.')
    expect(p).toContain('States a clear opinion')
    expect(p).toContain('Two developed reasons')
    expect(p.toLowerCase()).toContain('off-topic')          // the anti-over-praise rule
    expect(p).toContain('content_band')                      // the new schema key
    expect(p).toContain('task_coverage')
  })

  it('lang:"eng" (explicit) is byte-identical to the default English prompt', () => {
    const a = buildWritingGradePrompt({ formatHints, metrics, findings })
    const b = buildWritingGradePrompt({ formatHints, metrics, findings, lang: 'eng' })
    expect(b).toBe(a)
  })

  it('lang:"malay" + task: Malay examiner persona, Malay anti-over-praise, the task + every requirement, SAME content keys', () => {
    const task = {
      prompt: 'Tulis sebuah rencana tentang kepentingan membaca.',
      requirements: ['Menyatakan pendahuluan yang jelas', 'Menghuraikan dua kepentingan'],
    }
    const p = buildWritingGradePrompt({ formatHints, metrics, findings, task, lang: 'malay' })
    // Malay examiner, not the English one.
    expect(p).toContain('Pemeriksa Kanan IGCSE Bahasa Melayu')
    expect(p).not.toContain('Senior IGCSE English Language Examiner')
    // Task + requirements carried through.
    expect(p).toContain('Tulis sebuah rencana tentang kepentingan membaca.')
    expect(p).toContain('Menyatakan pendahuluan yang jelas')
    expect(p).toContain('Menghuraikan dua kepentingan')
    // Anti-over-praise rule, in Malay (fluency must not rescue an off-task answer).
    expect(p.toLowerCase()).toContain('terpesong')
    // SAME JSON keys the app + eval parse on (only the natural language changed).
    expect(p).toContain('content_band')
    expect(p).toContain('task_coverage')
    expect(p).toContain('"req_0": boolean')
  })

  it('lang:"malay" WITHOUT a task does not invent a Malay Content section', () => {
    const p = buildWritingGradePrompt({ formatHints, metrics, findings, lang: 'malay' })
    expect(p).toContain('Pemeriksa Kanan IGCSE Bahasa Melayu')
    expect(p).not.toContain('content_band')   // no task → no Content trait, same as English
    expect(p).not.toContain('task_coverage')
  })
})
