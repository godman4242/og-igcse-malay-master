// IGCSE 0500/0510 English grammar drills.
// Parallel structure to src/data/grammar.js so the same Grammar page UI
// can swap between Malay and English drill sets via a language toggle.
//
// Drill shapes:
//   - Cloze (CONFUSABLE_DRILLS_EN, ARTICLE_DRILLS_EN, SVA_DRILLS_EN):
//       { id, sentence ('___'), options[], answer, rule, hint, translation? }
//   - Tense (TENSE_DRILLS_EN): same cloze shape with `tense` label
//   - Error (FIND_ERROR_DRILLS_EN):
//       { id, sentence, options[], answer, correction, explanation }
//   - Transform (TRANSFORM_DRILLS_EN):
//       { id, type, instruction, sentence, answer, hint }

// ───────────────── Tense (mixed simple / continuous / perfect) ─────────────────
export const TENSE_DRILLS_EN = [
  { id: 'eng-tense-walked', sentence: 'Last summer we ___ to the lake every weekend.', options: ['walk', 'walked', 'have walked', 'walking'], answer: 'walked', tense: 'past simple', rule: 'Past simple for completed actions at a specified past time.' },
  { id: 'eng-tense-running', sentence: 'When the rain started, the children ___ in the garden.', options: ['run', 'ran', 'were running', 'have run'], answer: 'were running', tense: 'past continuous', rule: 'Past continuous for actions in progress when another past event occurred.' },
  { id: 'eng-tense-finished', sentence: 'I cannot come now — I ___ my homework yet.', options: ['did not finish', 'have not finished', 'was not finishing', 'do not finish'], answer: 'have not finished', tense: 'present perfect', rule: 'Present perfect with "yet" for actions not completed at a present moment.' },
  { id: 'eng-tense-arrives', sentence: 'The London train ___ at platform three at 09:42 every morning.', options: ['arrives', 'is arriving', 'has arrived', 'arrived'], answer: 'arrives', tense: 'present simple', rule: 'Present simple for scheduled, repeated actions.' },
  { id: 'eng-tense-livedfor', sentence: 'My grandmother ___ in this house for forty-two years.', options: ['lives', 'lived', 'has lived', 'is living'], answer: 'has lived', tense: 'present perfect', rule: 'Present perfect with "for" for an action that started in the past and continues now.' },
  { id: 'eng-tense-leftbefore', sentence: 'By the time the police arrived, the thief ___ through the back window.', options: ['escaped', 'has escaped', 'had escaped', 'was escaping'], answer: 'had escaped', tense: 'past perfect', rule: 'Past perfect for an action completed BEFORE another past action.' },
  { id: 'eng-tense-willcall', sentence: 'I promise I ___ you the moment I land.', options: ['call', 'will call', 'am calling', 'have called'], answer: 'will call', tense: 'future simple', rule: 'Will + bare infinitive for promises and on-the-spot decisions.' },
  { id: 'eng-tense-going', sentence: 'Look at those clouds — it ___ rain.', options: ['will', 'is going to', 'has', 'rains'], answer: 'is going to', tense: 'future (going to)', rule: 'Going to + verb for predictions backed by present evidence.' },
  { id: 'eng-tense-since', sentence: 'I ___ this novel since Monday and I am still on chapter three.', options: ['read', 'have been reading', 'was reading', 'had read'], answer: 'have been reading', tense: 'present perfect continuous', rule: 'Present perfect continuous for ongoing actions emphasising duration.' },
  { id: 'eng-tense-ifrain', sentence: 'If it ___ tomorrow, the picnic will be cancelled.', options: ['rains', 'will rain', 'rained', 'is raining'], answer: 'rains', tense: 'first conditional', rule: 'First conditional: present simple in the if-clause, will + verb in the result clause.' },
  { id: 'eng-tense-wishhad', sentence: 'I wish I ___ harder for the exam last term.', options: ['studied', 'had studied', 'study', 'have studied'], answer: 'had studied', tense: 'past unreal wish', rule: 'After "wish" about a past regret, use past perfect.' },
  { id: 'eng-tense-justfinished', sentence: 'You cannot disturb him now — he ___ his shift.', options: ['just finished', 'has just finished', 'was just finishing', 'just finishes'], answer: 'has just finished', tense: 'present perfect', rule: 'Present perfect with "just" for a very recent past action.' },
  { id: 'eng-tense-whenarrived', sentence: 'When I arrived at the station, the train ___ already.', options: ['left', 'had left', 'has left', 'was leaving'], answer: 'had left', tense: 'past perfect', rule: 'Past perfect to show one past action came before another.' },
  { id: 'eng-tense-watchnow', sentence: 'Quiet, please — I ___ the news.', options: ['watch', 'am watching', 'have watched', 'watched'], answer: 'am watching', tense: 'present continuous', rule: 'Present continuous for an action happening at the moment of speaking.' },
  { id: 'eng-tense-usedto', sentence: 'When I was younger, I ___ chocolate every day.', options: ['eat', 'used to eat', 'was eating', 'have eaten'], answer: 'used to eat', tense: 'past habit', rule: 'Used to + bare infinitive for repeated past habits no longer true.' },
];

// ───────────────── Subject-Verb Agreement ─────────────────
export const SVA_DRILLS_EN = [
  { id: 'eng-sva-everyone', sentence: 'Everyone in the upper classes ___ a uniform.', options: ['wear', 'wears', 'are wearing', 'have worn'], answer: 'wears', rule: 'Everyone / each / nobody take a singular verb.' },
  // Collective-noun agreement is VARIABLE in British English, so the sentence
  // must carry a co-reference cue or BOTH answers are defensible. The old item
  // ("The team ___ been training hard for the final.", keyed `has`) marked
  // `have` wrong — the form Cambridge says is MORE common in British English
  // for exactly this members-acting reading. `its` here forces the singular:
  // with a plural verb you would need `their`. Pinned by grammar.test.js.
  { id: 'eng-sva-team', sentence: 'The committee ___ its final report next Friday.', options: ['publish', 'publishes', 'are publishing', 'have published'], answer: 'publishes', rule: 'British English allows BOTH "the team is" (the group as one unit) and "the team are" (the members as individuals). The pronoun settles it here: "its" is singular, so the verb must be singular too — with a plural verb you would need "their".' },
  { id: 'eng-sva-news', sentence: 'The news ___ rarely cheerful these days.', options: ['are', 'is', 'were', 'have been'], answer: 'is', rule: '"News" looks plural but is singular.' },
  { id: 'eng-sva-neither', sentence: 'Neither the captain nor the players ___ to comment after the match.', options: ['was willing', 'were willing', 'has been willing', 'is willing'], answer: 'were willing', rule: 'With neither/either + nor/or, the verb agrees with the SECOND subject.' },
  { id: 'eng-sva-numberof', sentence: 'A number of students ___ submitted their work late.', options: ['has', 'have', 'is', 'was'], answer: 'have', rule: '"A number of" + plural noun takes a plural verb. ("The number of" is singular.)' },
  { id: 'eng-sva-numberofstudents', sentence: 'The number of complaints ___ rising every month.', options: ['are', 'is', 'have been', 'were'], answer: 'is', rule: '"The number of" is singular (one number).' },
  { id: 'eng-sva-physics', sentence: 'Physics ___ my favourite subject.', options: ['are', 'is', 'have been', 'were'], answer: 'is', rule: 'Subjects ending in -ics (physics, mathematics, economics) are singular when treated as a field.' },
  { id: 'eng-sva-eitherbook', sentence: 'Either of the books ___ acceptable for the assignment.', options: ['are', 'is', 'were', 'have been'], answer: 'is', rule: '"Either of" + plural takes a singular verb.' },
  { id: 'eng-sva-pairjeans', sentence: 'A new pair of jeans ___ exactly what she needed.', options: ['are', 'is', 'were', 'have been'], answer: 'is', rule: '"Pair of" is singular: one pair, even though jeans is plural.' },
  { id: 'eng-sva-thereare', sentence: 'There ___ several reasons why the policy failed.', options: ['is', 'are', 'has', 'was'], answer: 'are', rule: 'After "there is/are", the verb agrees with the noun that follows.' },
  { id: 'eng-sva-onehundred', sentence: 'One hundred dollars ___ a fair price for that bag.', options: ['are', 'is', 'were', 'have been'], answer: 'is', rule: 'Sums of money take a singular verb.' },
  { id: 'eng-sva-brotherandsister', sentence: 'My brother and sister both ___ in Singapore now.', options: ['lives', 'live', 'is living', 'has lived'], answer: 'live', rule: 'Two subjects joined by "and" take a plural verb.' },
];

// ───────────────── Articles (a / an / the / zero) ─────────────────
export const ARTICLE_DRILLS_EN = [
  { id: 'eng-art-univ', sentence: 'My cousin attends ___ university in Manchester.', options: ['a', 'an', 'the', '(none)'], answer: 'a', rule: 'Use "a" before a consonant SOUND. "University" begins with /j/.' },
  { id: 'eng-art-honest', sentence: 'He turned out to be ___ honest man after all.', options: ['a', 'an', 'the', '(none)'], answer: 'an', rule: 'Use "an" before a vowel SOUND. The "h" in "honest" is silent.' },
  { id: 'eng-art-eiffel', sentence: 'We are visiting ___ Eiffel Tower next Tuesday.', options: ['a', 'an', 'the', '(none)'], answer: 'the', rule: 'Use "the" with named landmarks/buildings (the Eiffel Tower, the Taj Mahal).' },
  { id: 'eng-art-breakfast', sentence: 'I usually skip ___ breakfast on weekdays.', options: ['a', 'an', 'the', '(none)'], answer: '(none)', rule: 'No article before meals when used in a general sense.' },
  { id: 'eng-art-second', sentence: 'That was ___ second time he had missed the train.', options: ['a', 'an', 'the', '(none)'], answer: 'the', rule: 'Use "the" with ordinal numbers (the first, the second, the third).' },
  { id: 'eng-art-malaysian', sentence: 'She is studying to become ___ engineer.', options: ['a', 'an', 'the', '(none)'], answer: 'an', rule: '"An" before a vowel sound. "Engineer" begins with /e/.' },
  { id: 'eng-art-information', sentence: 'I need ___ information about the scholarship deadline.', options: ['a', 'an', 'some', 'many'], answer: 'some', rule: '"Information" is uncountable: use "some", not "a / an" (and not "many" — that is for countable nouns).' },
  { id: 'eng-art-best', sentence: 'This is ___ best satay I have ever tasted.', options: ['a', 'an', 'the', '(none)'], answer: 'the', rule: '"The" with superlatives (the best, the most expensive).' },
  { id: 'eng-art-bedonce', sentence: 'I went to ___ bed before midnight for once.', options: ['a', 'an', 'the', '(none)'], answer: '(none)', rule: 'Set phrases (go to bed, go home, at school) take no article.' },
  { id: 'eng-art-internet', sentence: 'Most students get their news from ___ internet now.', options: ['a', 'an', 'the', '(none)'], answer: 'the', rule: 'Conventional "the internet" (one shared system).' },
  { id: 'eng-art-music', sentence: 'I cannot study without ___ music in the background.', options: ['a', 'an', 'the', '(none)'], answer: '(none)', rule: 'No article before uncountable nouns used in general.' },
  { id: 'eng-art-poor', sentence: '___ poor often suffer the most during a recession.', options: ['A', 'An', 'The', '(none)'], answer: 'The', rule: '"The + adjective" can mean a class of people (the poor, the rich, the elderly).' },
];

// ───────────────── Confusables (their/there, then/than, etc.) ─────────────────
export const CONFUSABLE_DRILLS_EN = [
  { id: 'eng-conf-their', sentence: '___ going to be late again because of the traffic.', options: ["They're", "Their", "There", "There're"], answer: "They're", rule: '"They\'re" = they are. "Their" = belonging to them. "There" = location.' },
  { id: 'eng-conf-there', sentence: 'Please leave the parcel over ___ on the kitchen counter.', options: ['their', "they're", 'there', 'thier'], answer: 'there', rule: '"There" indicates a place. "Their" shows possession.' },
  { id: 'eng-conf-its', sentence: 'The cat licked ___ paw after the long walk.', options: ["it's", 'its', 'its\'', 'their'], answer: 'its', rule: '"Its" = belonging to it. "It\'s" = it is.' },
  { id: 'eng-conf-itsapostrophe', sentence: '___ never been a stranger problem to debug.', options: ['Its', "It's", "Its'", 'Their'], answer: "It's", rule: '"It\'s" = it has / it is. "Its" is possessive.' },
  { id: 'eng-conf-thanthen', sentence: 'My mother is taller ___ my father.', options: ['then', 'than', 'as', 'that'], answer: 'than', rule: '"Than" for comparisons. "Then" for time/sequence.' },
  { id: 'eng-conf-thenseq', sentence: 'First we boil the rice; ___ we add the spices.', options: ['than', 'then', 'when', 'and so'], answer: 'then', rule: '"Then" indicates the next step in time. "Than" only for comparing.' },
  { id: 'eng-conf-affect', sentence: 'The new policy will ___ every student in the school.', options: ['affect', 'effect', 'affecting', 'effective'], answer: 'affect', rule: '"Affect" (verb) = to influence. "Effect" (noun) = the result.' },
  { id: 'eng-conf-effect', sentence: 'The medicine had no ___ on the patient at all.', options: ['affect', 'effect', 'affected', 'affection'], answer: 'effect', rule: '"Effect" is the noun (the result). "Affect" is the verb.' },
  { id: 'eng-conf-loose', sentence: 'The screw on this hinge has come ___ again.', options: ['lose', 'loose', 'loss', 'loosely'], answer: 'loose', rule: '"Loose" (adj.) = not tight. "Lose" (verb) = to misplace / fail to keep.' },
  { id: 'eng-conf-lose', sentence: 'We cannot afford to ___ another match this season.', options: ['loose', 'lose', 'loss', 'losing'], answer: 'lose', rule: '"Lose" is the verb. "Loose" is the adjective.' },
  { id: 'eng-conf-accept', sentence: 'Please ___ my sincere apologies for the delay.', options: ['except', 'accept', 'expect', 'access'], answer: 'accept', rule: '"Accept" (verb) = to receive. "Except" = not including.' },
  { id: 'eng-conf-fewerless', sentence: 'There are ___ students in the class than last year.', options: ['less', 'fewer', 'lesser', 'few'], answer: 'fewer', rule: '"Fewer" with countable plurals (students, books). "Less" with uncountable (water, time).' },
  { id: 'eng-conf-whose', sentence: '___ keys are these on the table?', options: ["Who's", 'Whose', 'Whos', 'Who is'], answer: 'Whose', rule: '"Whose" = possessive. "Who\'s" = who is / who has.' },
  { id: 'eng-conf-youre', sentence: '___ the only one who remembered my birthday.', options: ['Your', "You're", "Yore", "Yours"], answer: "You're", rule: '"You\'re" = you are. "Your" = belonging to you.' },
  { id: 'eng-conf-wouldhave', sentence: 'If she had been honest, none of this ___ happened.', options: ['would of', 'would have', 'would had', 'would'], answer: 'would have', rule: '"Would have" — never "would of". The "of" is a phonetic mishearing.' },
];

// ───────────────── Punctuation / Find the Error ─────────────────
export const FIND_ERROR_DRILLS_EN = [
  { id: 'eng-err-spliceA', sentence: 'I tried to call her, she did not answer.', options: ['comma between two complete clauses', 'No error', 'tried — wrong tense', 'her — wrong pronoun'], answer: 'comma between two complete clauses', correction: 'I tried to call her, but she did not answer. (or use a semicolon / full stop.)', explanation: 'A comma alone cannot join two independent clauses — that is a comma splice. Use "but", a semicolon, or a full stop.' },
  { id: 'eng-err-its2', sentence: 'The dog wagged it\'s tail when it saw the postman.', options: ["it's — should be its", 'wagged — should be was wagging', 'No error', 'the postman — punctuation'], answer: "it's — should be its", correction: 'The dog wagged its tail when it saw the postman.', explanation: '"It\'s" is a contraction of "it is". The possessive form has no apostrophe — "its".' },
  { id: 'eng-err-fewerless', sentence: 'There were less people at the concert than expected.', options: ['less — should be fewer', 'were — should be was', 'expected — wrong tense', 'No error'], answer: 'less — should be fewer', correction: 'There were fewer people at the concert than expected.', explanation: 'Use "fewer" with countable plural nouns (people). "Less" goes with uncountable (less time, less water).' },
  { id: 'eng-err-wouldof', sentence: 'I would of finished the essay if the printer had worked.', options: ['would of — should be would have', 'finished — wrong form', 'had worked — wrong tense', 'No error'], answer: 'would of — should be would have', correction: 'I would have finished the essay if the printer had worked.', explanation: '"Would of" is a phonetic mishearing of "would\'ve". Always write "would have".' },
  { id: 'eng-err-betweenyou', sentence: 'Between you and I, this whole plan is ridiculous.', options: ['I — should be me', 'Between — should be Among', 'No error', 'this — should be that'], answer: 'I — should be me', correction: 'Between you and me, this whole plan is ridiculous.', explanation: 'After a preposition (between, with, for), pronouns take the object case: me, him, her, us, them.' },
  { id: 'eng-err-noerror1', sentence: 'Although he had practised for weeks, he failed to qualify.', options: ['Although — wrong word', 'had practised — wrong tense', 'failed — should be fail', 'No error'], answer: 'No error', correction: null, explanation: 'This sentence is correct. "Although" introduces a concession; past perfect "had practised" precedes the past simple "failed".' },
  { id: 'eng-err-runonsubj', sentence: 'The train was delayed I missed the meeting.', options: ['run-on / missing connector', 'was delayed — should be was delaying', 'meeting — wrong word', 'No error'], answer: 'run-on / missing connector', correction: 'The train was delayed, so I missed the meeting. (or use a full stop.)', explanation: 'Two independent clauses cannot sit side by side. Add a coordinating conjunction (so, and, but) or split into two sentences.' },
  { id: 'eng-err-apostropheplural', sentence: 'The 1990\'s were a transformative decade for technology.', options: ["1990's — should be 1990s", 'transformative — wrong word', 'were — should be was', 'No error'], answer: "1990's — should be 1990s", correction: 'The 1990s were a transformative decade for technology.', explanation: 'Decades and acronyms are simple plurals — no apostrophe (1990s, MPs, CDs).' },
  { id: 'eng-err-whichthat', sentence: 'The book what I borrowed last week is missing.', options: ['what — should be that', 'borrowed — wrong tense', 'is missing — wrong tense', 'No error'], answer: 'what — should be that', correction: 'The book that I borrowed last week is missing.', explanation: '"What" cannot introduce a relative clause. Use "that" or "which" for things, "who" for people.' },
  { id: 'eng-err-doublenegative', sentence: 'I did not see nobody enter the room.', options: ['nobody — should be anybody', 'did not see — wrong tense', 'enter — wrong form', 'No error'], answer: 'nobody — should be anybody', correction: 'I did not see anybody enter the room.', explanation: 'Standard English avoids double negatives. After a negative verb, use "anybody / anything / anywhere".' },
];

// ───────────────── Transform Drills ─────────────────
export const TRANSFORM_DRILLS_EN = [
  { id: 'eng-tr-passive-broke', type: 'active-to-passive', instruction: 'Rewrite in the passive voice:', sentence: 'The storm broke the window.', answer: 'The window was broken by the storm.', hint: 'Object → subject; verb → "was/were" + past participle.' },
  { id: 'eng-tr-passive-cleans', type: 'active-to-passive', instruction: 'Rewrite in the passive voice:', sentence: 'The cleaner cleans this office every evening.', answer: 'This office is cleaned by the cleaner every evening.', hint: 'Present simple passive: is/are + past participle.' },
  { id: 'eng-tr-active-built', type: 'passive-to-active', instruction: 'Rewrite in the active voice:', sentence: 'The bridge was built by Roman soldiers.', answer: 'Roman soldiers built the bridge.', hint: 'Subject of "by" becomes the active subject.' },
  { id: 'eng-tr-reported-she', type: 'direct-to-reported', instruction: 'Rewrite as reported (indirect) speech:', sentence: 'She said, "I am leaving tomorrow."', answer: 'She said that she was leaving the next day.', hint: 'Tense shift back; "tomorrow" → "the next day"; pronoun → third person.' },
  { id: 'eng-tr-reported-asked', type: 'direct-to-reported', instruction: 'Rewrite as reported (indirect) speech:', sentence: 'He asked, "Have you finished the report?"', answer: 'He asked whether I had finished the report.', hint: 'Yes/no question → "asked whether"; tense back-shifts to past perfect.' },
  { id: 'eng-tr-conditional', type: 'rewrite', instruction: 'Rewrite as a second conditional:', sentence: 'I do not have a car, so I cannot drive you.', answer: 'If I had a car, I would drive you.', hint: 'Second conditional: If + past simple, would + bare infinitive.' },
  { id: 'eng-tr-toomany', type: 'rewrite', instruction: 'Rewrite using "too" instead of "so":', sentence: 'The bag is so heavy that I cannot lift it.', answer: 'The bag is too heavy for me to lift.', hint: '"So [adj] that I cannot ___" → "too [adj] for me to ___".' },
  { id: 'eng-tr-whichclause', type: 'rewrite', instruction: 'Combine the two sentences using a relative clause:', sentence: 'I bought a phone yesterday. The phone is already broken.', answer: 'The phone that I bought yesterday is already broken.', hint: 'Use "that" / "which" to attach the second sentence to the first.' },
  { id: 'eng-tr-although', type: 'rewrite', instruction: 'Combine using "although":', sentence: 'It was raining. We went for a walk.', answer: 'Although it was raining, we went for a walk.', hint: '"Although" + clause, main clause.' },
];

// ───────────────── Rules card ─────────────────
export const GRAMMAR_RULES_EN = {
  'Tenses': {
    title: 'Core English Tenses',
    rules: [
      { pattern: 'Present simple', example: 'She walks to school.', note: 'Habitual / scheduled actions.' },
      { pattern: 'Present continuous', example: 'She is walking right now.', note: 'In progress at the moment of speaking.' },
      { pattern: 'Past simple', example: 'She walked yesterday.', note: 'Completed past action at a known time.' },
      { pattern: 'Past continuous', example: 'She was walking when it rained.', note: 'In progress when another past event happened.' },
      { pattern: 'Present perfect', example: 'She has walked there before.', note: 'Past action with present relevance / unspecified time.' },
      { pattern: 'Past perfect', example: 'She had walked there before he arrived.', note: 'One past action that came BEFORE another past action.' },
      { pattern: 'Future simple', example: 'She will walk tomorrow.', note: 'On-the-spot decisions, predictions, promises.' },
      { pattern: 'Going to + verb', example: 'She is going to walk later.', note: 'Plans / predictions backed by present evidence.' },
    ],
  },
  'Subject-Verb Agreement': {
    title: 'Subject-Verb Agreement',
    rules: [
      { pattern: 'Each / every / everyone', example: 'Everyone is here.', note: 'Singular verb.' },
      { pattern: 'Either ... or / Neither ... nor', example: 'Neither the boy nor the girls were ready.', note: 'Verb agrees with the SECOND subject.' },
      { pattern: 'A number of + plural', example: 'A number of cars were stolen.', note: 'Plural verb.' },
      { pattern: 'The number of + plural', example: 'The number of cars is rising.', note: 'Singular verb (one number).' },
      { pattern: 'News / mathematics / physics', example: 'The news is bad.', note: 'Singular even though they look plural.' },
    ],
  },
  'Articles': {
    title: 'Articles (a / an / the / zero)',
    rules: [
      { pattern: '"A" before consonant SOUND', example: 'a university, a one-way ticket', note: 'It is the sound, not the letter, that matters.' },
      { pattern: '"An" before vowel SOUND', example: 'an honest man, an MP', note: '"H" in "honest" is silent → /o/.' },
      { pattern: '"The" with superlatives + ordinals', example: 'the tallest, the third', note: 'Always "the" with -est, most/least, ordinals.' },
      { pattern: 'Zero article: meals, set phrases', example: 'have breakfast, go to bed', note: 'No article when meals/places are used in a general sense.' },
      { pattern: '"The" + adjective = a class', example: 'the poor, the elderly', note: 'Used as a plural noun.' },
    ],
  },
  'Confusables': {
    title: 'Most Common Confusables (IGCSE)',
    rules: [
      { pattern: 'their / there / they\'re', example: 'their bag · over there · they\'re late', note: 'Possession / location / contraction.' },
      { pattern: 'its / it\'s', example: 'the dog wagged its tail · it\'s raining', note: 'Possessive has NO apostrophe.' },
      { pattern: 'than / then', example: 'taller than · first ... then', note: 'Comparing vs sequencing.' },
      { pattern: 'affect (verb) / effect (noun)', example: 'to affect a result · the effect of X', note: '"A is for action" — affect is the verb.' },
      { pattern: 'fewer / less', example: 'fewer chairs · less water', note: 'Countable / uncountable.' },
      { pattern: 'would have (NOT "would of")', example: 'I would have gone', note: '"Of" is a phonetic mishearing.' },
    ],
  },
  'Punctuation': {
    title: 'High-Yield Punctuation Rules',
    rules: [
      { pattern: 'Comma splice', example: 'X: I tried to call, she did not answer. ✓: I tried to call; she did not answer.', note: 'Two independent clauses need a semicolon, full stop, or coordinating conjunction.' },
      { pattern: 'Apostrophe + plural', example: 'X: 1990\'s, MP\'s ✓: 1990s, MPs', note: 'Plurals of decades / acronyms take no apostrophe.' },
      { pattern: 'Quotation + reporting verb', example: '"I will," she said.', note: 'Comma inside quotes; lower-case verb after.' },
      { pattern: 'Oxford comma (optional)', example: 'apples, pears, and oranges', note: 'Use consistently — IGCSE accepts either style.' },
    ],
  },
};

// Helper consumed by Grammar.jsx so the rules tab can iterate uniformly.
export default {
  TENSE_DRILLS_EN,
  SVA_DRILLS_EN,
  ARTICLE_DRILLS_EN,
  CONFUSABLE_DRILLS_EN,
  FIND_ERROR_DRILLS_EN,
  TRANSFORM_DRILLS_EN,
  GRAMMAR_RULES_EN,
};
