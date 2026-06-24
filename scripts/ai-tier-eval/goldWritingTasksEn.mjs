// GOLD SET — over-praise eval for the task-aware Content / task-fulfilment trait
// (IGCSE English 0510, v1). The whole point of the Content grader is that a
// fluent, well-written essay must NOT score high Content when it is off-topic or
// only partly answers the task. This gold set proves the AI scores those DOWN.
//
// SYNTHETIC + HAND-LABELLED (mirrors goldWritingEn.mjs rigor): every essay below
// is freshly authored, so the ground truth is KNOWN — there is zero annotation
// ambiguity. Each essay targets one of the 3 authored tasks in
// src/data/writingTasks.js and carries a `label` + `expectedContentMax` that the
// harness checks the AI's `content_band` against.
//
// LABELS (the construct under test):
//   • onTask        — genuinely fulfils the task: clear stance/structure, covers
//                     (most of) the requirements, right audience/register.
//                     expectedContentMax = 6 (a strong answer may legitimately
//                     earn up to 6; we only assert it is NOT *capped below*).
//   • partial       — the SUBTLE failure mode (where real over-praise happens):
//                     on-topic but addresses some-but-not-all requirements, OR
//                     wrong register/audience for the format, OR drifts off-task
//                     halfway. A fluent partial answer is exactly what an
//                     over-praising grader rescues. expectedContentMax = 4.
//   • offTopicFluent— well-written, fluent English, but the WRONG topic / ignores
//                     the task entirely. Fluency must not rescue it.
//                     expectedContentMax = 2.
//
// DISTRIBUTION (deliberate): 3 onTask, 4 partial, 3 offTopicFluent → 7/10 subtle.
// Real over-praise lives in `partial` + `offTopicFluent`, so the set is weighted
// toward them (the well-formedness test pins "subtle is the majority").
//
// expectedContentMax encodes the over-praise ceiling: offTopicFluent→2,
// partial→4, onTask→6. The metric (score.mjs overPraiseRate) flags any essay
// whose Content band EXCEEDS its ceiling across the N samples — that is the
// grader over-praising. Decision gate: ≥ 9/10 stay within ceiling → trait ships.
//
// NO IMPORTS — pure data array, so the vitest well-formedness test (which runs
// WITHOUT the Node extensionless resolver) can load it directly.

export const WRITING_TASKS_GOLD = [
  // ─────────────────────── onTask (3) — genuine fulfilment ───────────────────────
  {
    id: 'g-phones-ontask',
    taskId: 'eng-article-phone-free-lessons',
    label: 'onTask',
    expectedContentMax: 6,
    // Clear opinion + two developed reasons + a fair-rule suggestion + a magazine
    // voice and conclusion → covers all four requirements.
    text: `Phones in Lessons: Off, But Not Banished

Should our phones really be switched off the moment we walk into class? In my view, yes — during lessons they do far more harm than good, even if a total ban would be unfair.

The first problem is distraction. When a phone buzzes in my pocket, my attention is gone before I even read the message, and studies our science teacher showed us suggest it can take several minutes to refocus. Multiply that across thirty students and a whole lesson leaks away. Secondly, phones make cheating far too easy: a quick photo of a test or a hidden search turns an exam into a typing contest, which is hardly fair on the students who actually revised.

That said, banning phones completely ignores the times they genuinely help — translating a word, scanning a worksheet, or contacting a parent in an emergency. A fair rule, then, would be simple: phones face-down and silent on the desk during teaching, but allowed when a teacher says "phones out" for a specific task. Break the rule and it goes in a tray until the bell.

So let's switch off, not throw away. Used with a clear rule, our phones can stay part of school life without stealing our lessons.`,
  },
  {
    id: 'g-bus-ontask',
    taskId: 'eng-letter-formal-bus-complaint',
    label: 'onTask',
    expectedContentMax: 6,
    // Specific problems + impact on students + two concrete requests + polite,
    // formal register suited to a company manager → all four requirements.
    text: `Dear Sir or Madam,

I am writing to express my concern about the standard of service on the number 14 bus, which many students from Greenfield School rely on each morning.

Over the past month, this bus has been late on at least three days each week, often by ten to fifteen minutes. On the days it does arrive, it is so overcrowded that several of us are unable to board at all and must wait for the next service. As a direct result, a number of students, including myself, have arrived late to our first lesson and missed important instructions, which is beginning to affect our work and our records.

I would be grateful if your company could consider two specific improvements. Firstly, an additional bus on this route between 7:15 and 8:00 a.m. would ease the overcrowding during the school rush. Secondly, a more reliable timetable, perhaps with live updates online, would let students plan their journeys with confidence.

Thank you for taking the time to read my letter. I look forward to your reply and to seeing these improvements introduced.

Yours faithfully,
A concerned student`,
  },
  {
    id: 'g-canteen-ontask',
    taskId: 'eng-report-canteen-survey',
    label: 'onTask',
    expectedContentMax: 6,
    // Title + headed sections + findings backed by survey/observation evidence +
    // two recommendations linked to findings + factual report tone → all four.
    text: `Report on Student Views of the School Canteen

Introduction
This report was prepared at the request of the headteacher to investigate what students think of the school canteen. I surveyed sixty students across all year groups and observed the canteen on three separate lunchtimes.

Findings
The survey showed that most students are unhappy with two areas in particular. Forty-two of the sixty students (70%) said that queues were too long, and during my observations the average wait was over twelve minutes, leaving little time to eat. In addition, thirty-eight students (63%) felt that there were too few healthy options, a view supported by my observation that fried food sold out well before the salad counter did.

Recommendations
In light of these findings, I would make two practical recommendations. Firstly, to address the long queues, the canteen should open a second serving point at peak times, which my observations suggest would roughly halve the wait. Secondly, to meet the demand for healthier food, the menu should include more affordable fruit and salad options, directly responding to the 63% who asked for them.

Conclusion
The canteen is valued by students but is held back by long queues and limited healthy choices. The two changes above would address the concerns most clearly raised by the survey.`,
  },

  // ─────────────────────── partial (4) — the subtle failures ───────────────────────
  {
    id: 'g-phones-partial-norule',
    taskId: 'eng-article-phone-free-lessons',
    label: 'partial',
    expectedContentMax: 4,
    // On-topic and fluent, with a clear opinion and reasons, BUT never suggests
    // what a fair rule would look like (requirement 3) — and barely concludes.
    // Covers ~half the requirements: a classic over-praise trap.
    text: `Phones Are Ruining Our Lessons

Have you ever tried to concentrate while the person next to you is scrolling through videos? It is almost impossible. Mobile phones have become one of the biggest distractions in our classrooms, and something needs to change.

The main reason phones harm learning is that they pull our attention away from the teacher. Even a single notification can break our focus, and once we glance down, ten minutes can disappear. There is also the problem of comparison: people spend the lesson looking at what their friends are posting instead of listening, and they leave the room having learned nothing.

On top of that, phones can damage friendships in class. Students message each other rude comments during lessons, and arguments that should stay outside school spill into the classroom. It creates a tense atmosphere that makes learning even harder.

Phones are clearly a serious distraction, and we should all think carefully about how we use them.`,
  },
  {
    id: 'g-bus-partial-register',
    taskId: 'eng-letter-formal-bus-complaint',
    label: 'partial',
    expectedContentMax: 4,
    // Describes the problems and impact and even asks for fixes — but the
    // register is informal/chatty, completely wrong for a formal letter to a
    // company manager (requirement 4 fails). On-topic, wrong audience tone.
    text: `Hey there,

I just had to write in because honestly the bus situation is driving us all crazy! The number 14 is late basically every single morning and it's such a joke. When it finally shows up it's so packed we can't even squeeze on, so we end up standing at the stop for ages.

Loads of us have been getting to school late because of this and the teachers are not happy at all, which isn't really fair on us is it? It's not like we can control when your buses turn up.

Can you sort it out please? Maybe put on another bus in the morning or at least make them turn up on time for once. It would honestly make such a big difference and we'd really appreciate it.

Anyway, thanks for reading, hope you can fix this soon!

Cheers,
A student who's sick of waiting`,
  },
  {
    id: 'g-canteen-partial-drift',
    taskId: 'eng-report-canteen-survey',
    label: 'partial',
    expectedContentMax: 4,
    // Starts as a proper canteen report (title, intro, some findings) but DRIFTS
    // off-task halfway into a personal opinion piece about school dinners in
    // general, with no real recommendations linked to evidence (req 3 fails) and
    // the report register collapsing into a story.
    text: `Report on the School Canteen

Introduction
I was asked to look into what students think about our school canteen, so I asked some people in my class and had a look around at lunchtime.

Findings
A few of my friends said the food was a bit boring and the queues were long. That seems about right from what I saw.

Anyway, it got me thinking about food in general. My grandmother always says that the meals she had at school were so much better than what we get now. She tells this lovely story about how the dinner ladies knew every child by name and cooked everything fresh that morning. I think there is something really special about that, and it makes me a bit sad that things have changed so much. Food brings people together, and a good meal can turn a bad day around completely.

When I was little, my favourite thing was my mum's chicken soup, and I still remember the smell of it filling the whole house. School food will never be like that, but maybe it does not have to be. As long as we are grateful for what we have, that is what really matters in the end.`,
  },
  {
    id: 'g-phones-partial-halfdrift',
    taskId: 'eng-article-phone-free-lessons',
    label: 'partial',
    expectedContentMax: 4,
    // Opens correctly on the phones-in-lessons question with a stance, then
    // halfway drifts into a general "phones are bad for society / sleep / mental
    // health" essay that ignores the lessons-specific task and never proposes a
    // classroom rule. Fluent but only partly on the set task.
    text: `Should Phones Be Switched Off in Class?

Many schools are now debating whether phones should be banned during lessons, and I can see why. In class, a buzzing phone is a real distraction, and I have lost track of a teacher's explanation more than once because I glanced at a message.

However, the bigger issue is what phones are doing to young people everywhere, not just in classrooms. Many teenagers now spend five or six hours a day staring at a screen. This is destroying our sleep, because the blue light keeps our brains awake long past midnight. Doctors warn that constant scrolling is linked to anxiety and low self-esteem, as we compare our ordinary lives to the perfect images we see online.

Social media companies design their apps to be addictive on purpose, using endless feeds and notifications to keep us hooked. Families now sit at dinner in silence, each lost in a separate screen, and real conversation is becoming rare. If we are not careful, an entire generation will grow up unable to focus on anything for more than a few seconds.

We must take back control of our phones before they control us completely.`,
  },

  // ─────────────────────── offTopicFluent (3) — wrong topic, well written ───────────────────────
  {
    id: 'g-phones-offtopic-festival',
    taskId: 'eng-article-phone-free-lessons',
    label: 'offTopicFluent',
    expectedContentMax: 2,
    // Polished article, but about a school music festival — nothing to do with
    // banning phones in lessons. Fluency must not rescue it.
    text: `A Night to Remember: Our School Music Festival

If you missed this year's school music festival, you missed one of the most magical evenings our school has ever seen. As the sun set behind the sports hall, hundreds of students and parents gathered on the field, fairy lights twinkling between the trees.

The opening act, our very own choir, filled the air with a haunting melody that gave everyone goosebumps. They were followed by the jazz band, whose trumpet solo earned the loudest cheer of the night. Even the teachers could not resist tapping their feet.

What made the evening so special, though, was the sense of togetherness. Students who had never spoken before were soon singing along side by side. Younger pupils gazed up at the older performers as if they were rock stars, dreaming of their own moment on stage one day.

As the final chord faded and the crowd called for one more song, it was clear that this festival had become more than a concert. It was a celebration of everything that makes our school a community. Roll on next year — I, for one, cannot wait.`,
  },
  {
    id: 'g-bus-offtopic-thankyou',
    taskId: 'eng-letter-formal-bus-complaint',
    label: 'offTopicFluent',
    expectedContentMax: 2,
    // A genuinely well-formed formal letter — but a thank-you to a teacher, not a
    // complaint to the bus company about lateness and overcrowding. Right format,
    // wrong task entirely.
    text: `Dear Mrs Harrison,

I am writing to thank you, most sincerely, for everything you have done for our class over the past three years as our form tutor.

When I first joined the school, I was shy and unsure of myself, and I dreaded speaking in front of others. Through your patience and quiet encouragement, I slowly found my confidence. I will never forget the morning you stayed behind to help me rehearse my assembly speech, even though it must have cost you your own break.

Your lessons were always more than just lessons. You taught us to be kind, to work hard, and to believe that effort matters more than natural talent. Many of us will carry those words with us long after we have left this school.

As we prepare to move on, I wanted you to know what a difference you have made. On behalf of the whole class, thank you for your dedication and your warmth.

Yours sincerely,
A grateful student`,
  },
  {
    id: 'g-canteen-offtopic-narrative',
    taskId: 'eng-report-canteen-survey',
    label: 'offTopicFluent',
    expectedContentMax: 2,
    // Vivid, fluent narrative about a camping trip — no report structure, no
    // canteen, no survey, no recommendations. Strong writing, wrong task.
    text: `It was still dark when our minibus rumbled out of the school gates, and none of us had any idea what the weekend had in store.

By the time we reached the mountains, a thin mist clung to the valleys and the air smelled of pine and wet earth. We hauled our rucksacks up the steep path, slipping on loose stones and laughing at each other's groans. My legs burned, but every time I looked up, the view grew more breathtaking.

That night we pitched our tents beside a quiet stream. As the fire crackled and the first stars appeared, our teacher told ghost stories that made us jump at every snapping twig. I had never felt so far from the noise of the city, or so close to my friends.

The next morning, we woke to birdsong and a sunrise that turned the whole sky orange. Tired and muddy, we began the long walk home, but I think we all knew that something had changed. Sometimes you have to leave everything familiar behind to discover what you are really capable of.`,
  },
]
