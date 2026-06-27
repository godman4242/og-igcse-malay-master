// GOLD SET — IMPROVEMENT-DETECTION eval for the act-on-feedback re-attempt loop
// (IGCSE English 0510, v1). The re-attempt loop reports "you improved" only on a
// real, earned change (a higher Content band or a genuine ✗→✓ requirement flip).
// The load-bearing risk is OVER-PRAISE-ON-IMPROVEMENT: a student makes a trivial
// COSMETIC edit (synonym swaps, reordering, an added flourish) that does NOT newly
// satisfy the missed requirement, and a lenient grader flakily scores the resubmit
// UP — producing a false "you improved". This set proves the grader does NOT do
// that, while still catching genuine improvements.
//
// SYNTHETIC + HAND-LABELLED (mirrors goldWritingTasksEn.mjs rigor): every essay is
// freshly authored, so the ground truth is KNOWN. Each PAIR is { before, after }
// for ONE authored task, targeting ONE requirement index (`targetReq`) that the
// `before` essay genuinely MISSES:
//   • cosmeticEdit    — `after` re-words/reorders `before` but STILL misses
//                       targetReq. Expectation: Content band must NOT rise and
//                       targetReq must NOT flip ✗→✓. (The over-praise trap.)
//   • realImprovement — `after` adds genuine content that satisfies targetReq.
//                       Expectation: band rises OR targetReq flips ✗→✓.
//
// DESIGN (isolates the edit): each realImprovement SHARES its `before` essay (and
// targetReq) with a cosmeticEdit, so the only thing the grader sees differently is
// the edit itself — a divergent verdict is attributable to the content change.
//
// DISTRIBUTION (deliberate): 6 cosmeticEdit, 4 realImprovement → weighted toward
// the subtle cosmetic cases the gate exists to catch (pinned by the vitest
// well-formedness test). 6 shared `before` essays + 10 `after` essays = 16 UNIQUE
// essays; the harness grades each unique essay ONCE (deduped by id) to conserve
// free Gemini quota.
//
// NO IMPORTS — pure data, so the vitest well-formedness test loads it directly
// (no Node extensionless resolver needed).

// ── Shared BEFORE essays (each genuinely misses one targetReq) ────────────────

// Task A (eng-article-phone-free-lessons). req2 = "Suggests what a fair rule could
// look like in practice"; req0 = "States a clear overall opinion".
const BEFORE_PHONES_NORULE = {
  id: 'before-phones-norule', // clear opinion + reasons, but NO fair rule (req2 ✗)
  text: `Phones Are Hurting Our Lessons

In my opinion, phones should definitely be switched off during lessons. They do far more harm than good when we are supposed to be learning.

The first reason is distraction. The moment a phone buzzes, my attention jumps to it, and by the time I look back at the board the teacher has moved on. A single notification can cost me several minutes of a lesson. Secondly, phones make it easy to cheat. A quick photo of a test, or a hidden search, means some students get marks they did not earn, which is unfair on everyone who revised properly.

For these reasons, I feel strongly that phones are a serious problem in our classrooms and that we cannot keep ignoring it.`,
}

const BEFORE_PHONES_FENCE = {
  id: 'before-phones-fence', // never states a stance (req0 ✗)
  text: `Should Phones Be Switched Off in Class?

Mobile phones in lessons are a tricky subject, and honestly I can see both sides of the argument. There are good points and bad points, and it is hard to say which way is right.

On one hand, phones can be distracting. A buzzing phone pulls your eyes away from the teacher and you can miss something important. On the other hand, phones can also help, because you can look up a word or check a fact in seconds.

So there are clearly advantages and disadvantages either way. Different people will have different views, and perhaps it all depends on the situation and the person.`,
}

// Task B (eng-letter-formal-bus-complaint). req2 = "Requests at least two specific
// improvements"; req3 = "Stays polite and formal throughout".
const BEFORE_BUS_ONEREQUEST = {
  id: 'before-bus-onerequest', // problems + impact, but only ONE vague request (req2 ✗)
  text: `Dear Sir or Madam,

I am writing to raise a concern about the number 14 bus, which many students from Greenfield School take each morning.

For the past few weeks this bus has been late on most days, often by ten minutes or more, and when it does arrive it is badly overcrowded. As a result, several students, including me, have been unable to board and have arrived late to our first lesson, missing important instructions from our teachers.

I would be very grateful if your company could look into this matter and improve the service as soon as possible. Thank you for taking the time to read my letter.

Yours faithfully,
A concerned student`,
}

const BEFORE_BUS_INFORMAL = {
  id: 'before-bus-informal', // on-topic with requests, but CHATTY/informal register (req3 ✗)
  text: `Hi there,

I just wanted to message you because the number 14 bus is honestly such a nightmare lately! It's late basically every morning, sometimes by like fifteen minutes, and when it finally rocks up it's so jam-packed we can't even get on.

Loads of us have ended up late for our first lesson because of it, and the teachers are getting really annoyed, which isn't fair on us is it? It's not our fault your buses don't turn up.

Could you maybe put on another bus in the mornings, and sort out the timetable so it's actually accurate? That'd be a massive help honestly.

Anyway, cheers for reading, hope you can fix it soon!

Thanks,
A student`,
}

// Task C (eng-report-canteen-survey). req1 = "Presents findings supported by survey
// or observation evidence"; req2 = "Makes at least two practical recommendations
// linked to the findings".
const BEFORE_CANTEEN_NOEVIDENCE = {
  id: 'before-canteen-noevidence', // title + sections, but findings are opinions not evidence (req1 ✗)
  text: `Report on the School Canteen

Introduction
This report looks at what students think of the school canteen, as requested by the headteacher.

Findings
In general, I think the canteen is not very good. The food seems a bit boring and the queues feel quite long most days. A lot of people probably agree that it could be better, and in my opinion the choices are limited.

Recommendations
I would recommend that the canteen improves its food and tries to make the queues shorter so that students are happier at lunchtime.

Conclusion
Overall, the canteen could be improved in a few ways to make lunch a better experience for everyone.`,
}

const BEFORE_CANTEEN_UNLINKEDREC = {
  id: 'before-canteen-unlinkedrec', // findings backed by evidence, but recs vague + unlinked (req2 ✗)
  text: `Report on the School Canteen

Introduction
This report presents what students think of the school canteen, following a short survey and my own observations at lunchtime.

Findings
Most students were unhappy with the canteen. In the survey, forty of sixty students said the queues were too long, and many also felt there were too few healthy choices. During my visits I saw long lines and noticed the salad counter was rarely used.

Recommendations
The canteen should try to be better in future and make sure students enjoy their lunch more.

Conclusion
In short, students would like to see the canteen improved.`,
}

// ── The pairs ─────────────────────────────────────────────────────────────────

export const GOLD_REATTEMPT_EN = [
  // ── Task A: phones · req2 (fair rule) ──
  {
    id: 'phones-norule-cosmetic',
    taskId: 'eng-article-phone-free-lessons',
    targetReq: 2,
    label: 'cosmeticEdit',
    before: BEFORE_PHONES_NORULE,
    after: {
      id: 'after-phones-norule-cosmetic', // synonyms swapped + reordered; STILL no fair rule
      text: `Phones Are Damaging Our Lessons

In my view, mobiles should certainly be turned off during lessons. They cause far more harm than good when we are meant to be studying.

The main reason is distraction. The instant a phone vibrates, my focus leaps to it, and by the time I glance back at the board the teacher has already moved on. One single alert can cost me several minutes of a lesson. In addition, phones make cheating simple. A fast photo of a test, or a secret search, means certain students gain marks they did not deserve, which is unfair on all of us who revised properly.

For these reasons, I believe strongly that phones are a grave problem in our classrooms and that we cannot keep overlooking it.`,
    },
  },
  {
    id: 'phones-norule-real',
    taskId: 'eng-article-phone-free-lessons',
    targetReq: 2,
    label: 'realImprovement',
    before: BEFORE_PHONES_NORULE,
    after: {
      id: 'after-phones-norule-real', // adds a concrete fair rule + when it applies (req2 ✓)
      text: `Phones Are Hurting Our Lessons

In my opinion, phones should be switched off during lessons, though a total ban would go too far.

The first reason is distraction. The moment a phone buzzes, my attention jumps to it, and the teacher has moved on before I look back. A single notification can cost me several minutes. Secondly, phones make it easy to cheat: a quick photo of a test means some students get marks they did not earn.

That said, phones are not all bad, so a fair rule would be simple. Phones should sit face-down and silent on the desk during teaching, and only come out when a teacher says so for a specific task, such as looking up a word. Break the rule and your phone waits in a tray until the bell. That way we keep the benefits without losing the lesson.`,
    },
  },

  // ── Task A: phones · req0 (clear opinion) ──
  {
    id: 'phones-fence-cosmetic',
    taskId: 'eng-article-phone-free-lessons',
    targetReq: 0,
    label: 'cosmeticEdit',
    before: BEFORE_PHONES_FENCE,
    after: {
      id: 'after-phones-fence-cosmetic', // reworded; STILL sits on the fence (no stance)
      text: `Should Phones Be Switched Off in Class?

Mobile phones during lessons are a difficult topic, and to be honest I can see both sides of the debate. There are positives and negatives, and it is hard to decide which side is correct.

On one hand, phones can be distracting. A vibrating phone drags your eyes from the teacher and you might miss something key. On the other hand, phones can also be useful, since you can look up a word or check a fact in moments.

So there are obviously benefits and drawbacks whichever way you look. Different people will hold different opinions, and perhaps it all comes down to the situation and the person.`,
    },
  },
  {
    id: 'phones-fence-real',
    taskId: 'eng-article-phone-free-lessons',
    targetReq: 0,
    label: 'realImprovement',
    before: BEFORE_PHONES_FENCE,
    after: {
      id: 'after-phones-fence-real', // opens + closes with a firm stance (req0 ✓)
      text: `Should Phones Be Switched Off in Class?

Yes — I believe phones should be switched off during lessons. After thinking about both sides, I am convinced the distraction is simply not worth it.

On one hand, phones can be distracting. A buzzing phone pulls your eyes away from the teacher and you can miss something important. It is true that phones can also help, because you can look up a word or check a fact in seconds.

But when I weigh it up, the harm clearly wins. The few times a phone is useful do not make up for the lessons we lose to it, so my answer is firm: switch them off.`,
    },
  },

  // ── Task B: bus · req2 (two specific requests) ──
  {
    id: 'bus-onerequest-cosmetic',
    taskId: 'eng-letter-formal-bus-complaint',
    targetReq: 2,
    label: 'cosmeticEdit',
    before: BEFORE_BUS_ONEREQUEST,
    after: {
      id: 'after-bus-onerequest-cosmetic', // reworded; STILL one vague request
      text: `Dear Sir or Madam,

I am writing to express a concern regarding the number 14 bus, which a great many students from Greenfield School use each morning.

Over the last few weeks this service has been late on the majority of days, frequently by ten minutes or more, and when it finally arrives it is severely overcrowded. Consequently, a number of students, myself included, have been unable to get on and have reached our first lesson late, missing important instructions from our teachers.

I would be most grateful if your company could investigate this matter and improve the service at the earliest opportunity. Thank you for taking the time to read my letter.

Yours faithfully,
A concerned student`,
    },
  },
  {
    id: 'bus-onerequest-real',
    taskId: 'eng-letter-formal-bus-complaint',
    targetReq: 2,
    label: 'realImprovement',
    before: BEFORE_BUS_ONEREQUEST,
    after: {
      id: 'after-bus-onerequest-real', // adds two concrete specific requests (req2 ✓)
      text: `Dear Sir or Madam,

I am writing to raise a concern about the number 14 bus, which many students from Greenfield School take each morning.

For the past few weeks this bus has been late on most days, often by ten minutes or more, and when it does arrive it is badly overcrowded. As a result, several students, including me, have been unable to board and have arrived late to our first lesson.

I would be grateful if you could consider two specific changes. Firstly, please add an extra bus on this route between 7:15 and 8:00 a.m. to ease the overcrowding during the school rush. Secondly, please publish a reliable timetable with live online updates so that students can plan their journeys with confidence. Thank you for taking the time to read my letter.

Yours faithfully,
A concerned student`,
    },
  },

  // ── Task B: bus · req3 (formal register) ──
  {
    id: 'bus-informal-cosmetic',
    taskId: 'eng-letter-formal-bus-complaint',
    targetReq: 3,
    label: 'cosmeticEdit',
    before: BEFORE_BUS_INFORMAL,
    after: {
      id: 'after-bus-informal-cosmetic', // a few slang swaps; STILL chatty/informal overall
      text: `Hi there,

I just wanted to write to you because the number 14 bus is honestly such a pain lately! It's late basically every morning, sometimes by around fifteen minutes, and when it finally shows up it's so packed we can't even get on.

Lots of us have ended up late for our first lesson because of it, and the teachers are getting really frustrated, which isn't fair on us is it? It's not our fault your buses don't arrive on time.

Could you maybe put on another bus in the mornings, and sort out the timetable so it's actually accurate? That would be a huge help honestly.

Anyway, thanks for reading, hope you can fix it soon!

Thanks,
A student`,
    },
  },

  // ── Task C: canteen · req1 (evidence) ──
  {
    id: 'canteen-noevidence-cosmetic',
    taskId: 'eng-report-canteen-survey',
    targetReq: 1,
    label: 'cosmeticEdit',
    before: BEFORE_CANTEEN_NOEVIDENCE,
    after: {
      id: 'after-canteen-noevidence-cosmetic', // reworded opinions; STILL no survey/observation data
      text: `Report on the School Canteen

Introduction
This report examines what students think of the school canteen, as requested by the headteacher.

Findings
On the whole, I feel the canteen is not very good. The food appears somewhat boring and the queues seem rather long on most days. Many people would probably agree that it could be improved, and in my view the options are limited.

Recommendations
I would suggest that the canteen improves its food and works to make the queues shorter so that students are happier at lunchtime.

Conclusion
Overall, the canteen could be bettered in several ways to make lunch a nicer experience for everyone.`,
    },
  },
  {
    id: 'canteen-noevidence-real',
    taskId: 'eng-report-canteen-survey',
    targetReq: 1,
    label: 'realImprovement',
    before: BEFORE_CANTEEN_NOEVIDENCE,
    after: {
      id: 'after-canteen-noevidence-real', // adds real survey % + observation (req1 ✓)
      text: `Report on the School Canteen

Introduction
This report looks at what students think of the school canteen, as requested by the headteacher. I surveyed sixty students and observed the canteen on three lunchtimes.

Findings
The survey showed clear concerns. Forty-two of the sixty students (70%) said the queues were too long, and during my observations the average wait was over twelve minutes. In addition, thirty-eight students (63%) wanted more healthy options, which matched my observation that the fried food sold out long before the salad counter.

Recommendations
I would recommend that the canteen improves its food and tries to make the queues shorter so that students are happier at lunchtime.

Conclusion
Overall, the canteen could be improved in a few ways to make lunch a better experience for everyone.`,
    },
  },

  // ── Task C: canteen · req2 (two recs linked to findings) ──
  {
    id: 'canteen-unlinkedrec-cosmetic',
    taskId: 'eng-report-canteen-survey',
    targetReq: 2,
    label: 'cosmeticEdit',
    before: BEFORE_CANTEEN_UNLINKEDREC,
    after: {
      id: 'after-canteen-unlinkedrec-cosmetic', // reworded; STILL one vague unlinked rec
      text: `Report on the School Canteen

Introduction
This report sets out what students think of the school canteen, following a brief survey and my own observations at lunchtime.

Findings
Most students were dissatisfied with the canteen. In the survey, forty of sixty students said the queues were too long, and many also felt there were too few healthy choices. During my visits I noticed long lines and saw that the salad counter was rarely used.

Recommendations
The canteen ought to try to do better in future and ensure students enjoy their lunch more.

Conclusion
In brief, students would like to see the canteen improved.`,
    },
  },
]
