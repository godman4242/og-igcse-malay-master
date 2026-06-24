// Original, copyright-safe IGCSE-format English writing TASKS. Each task pairs a
// prompt (the scenario + instruction a 15–16-year-old 0510 learner writes to)
// with `requirements`: the bullet points an examiner marks Content / task-
// fulfilment against — each one checkable from the essay text so a later AI
// grader can score coverage. English 0510 only in v1.
//
// Pure data — pinned by writingTasks.test.js. NO real Cambridge past-paper text:
// every prompt below is freshly authored. `formatId` must resolve in FORMATS
// (src/lib/writingFormats.js); the test enforces it.
//
// A Task = { id, lang:'eng', formatId, prompt, requirements: string[],
//            audience, purpose }.

export const WRITING_TASKS = [
  {
    id: 'eng-article-phone-free-lessons',
    lang: 'eng',
    formatId: 'eng-article',
    prompt:
      'Your school is thinking about banning mobile phones during lessons, and the student magazine has asked for opinions. Write an article giving your views on whether phones should be switched off in class. In your article, explain how phones affect learning and suggest what a fair rule might look like.',
    requirements: [
      'States a clear overall opinion on banning phones during lessons',
      'Gives at least two developed reasons or examples (for and/or against)',
      'Suggests what a fair rule could look like in practice',
      'Engages a student-magazine audience and ends with a clear conclusion',
    ],
    audience: 'students reading the school magazine',
    purpose: 'argue / persuade',
  },
  {
    id: 'eng-letter-formal-bus-complaint',
    lang: 'eng',
    formatId: 'eng-letter-formal',
    prompt:
      'The bus you take to school is often late and overcrowded, and several students have arrived late as a result. Write a formal letter to the manager of the bus company. Describe the problems clearly, explain how they affect students, and request specific improvements.',
    requirements: [
      'Describes the specific problems (lateness, overcrowding) with concrete detail',
      'Explains the impact on students (e.g. arriving late, missing lessons)',
      'Requests at least two specific improvements or actions',
      'Stays polite and formal throughout, suited to a company manager',
    ],
    audience: 'the manager of the bus company',
    purpose: 'complain / request action',
  },
  {
    id: 'eng-report-canteen-survey',
    lang: 'eng',
    formatId: 'eng-report',
    prompt:
      'Your headteacher has asked you to investigate what students think of the school canteen. You surveyed students and observed the canteen at lunchtime. Write a report for the headteacher presenting your findings and recommending improvements.',
    requirements: [
      'Has a title and uses clear headed sections (e.g. Introduction, Findings, Recommendations)',
      'Presents findings supported by survey or observation evidence',
      'Makes at least two practical recommendations linked to the findings',
      'Uses a factual, formal tone suited to a report for the headteacher',
    ],
    audience: 'the headteacher',
    purpose: 'inform / recommend',
  },
]

export function getTask(id) {
  return WRITING_TASKS.find(t => t.id === id) || null
}

export function tasksForFormat(formatId, lang = 'eng') {
  return WRITING_TASKS.filter(t => t.formatId === formatId && t.lang === lang)
}
