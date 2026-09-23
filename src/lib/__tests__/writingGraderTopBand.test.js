// Pins that band 6 is AWARDABLE — to an answer that earns it — in both languages.
//
// Measured (Gauntlet lane L1 round 5, docs/gauntlet/L1/README.md): band 6 was never
// awarded. Three Malay scripts an examiner marked 30/30 all got band 5, and so did a
// spec-perfect answer written against the live mark scheme in each language. The
// common cap: vocabulary and cohesion were scored by membership in two short lists
// of FORMAL-ESSAY words (FORM_* / PW_ML / DISC_EN). 7 of 7 top-band texts missed the
// top threshold of both lists; 7 of 7 met the list-free range signal (TTR).
//
// Authority (A1) — what the top band actually asks for:
//   0546 Paper 4 specimen mark scheme (from 2028), Q3 "Range" 7–9:
//     "Uses extended, well-linked sentences frequently and appropriately."
//     "Uses a wide range of simple and complex structures to produce sentences of
//      varying length."
//     "Uses a wide range of vocabulary appropriate to the task(s)."
//   and its Q2 guidance: "Examples of linking words and phrases: and, or, but,
//     because, then".
//   https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf
//   0510 Paper 1 specimen mark scheme (from 2024), Table B "Language" 7–9:
//     "Uses a wide range of common and less common vocabulary appropriately."
//     "Uses a wide range of simple and complex structures."
//     "Uses a wide range of linking words and/or other cohesive devices appropriately."
//   https://www.cambridgeinternational.org/Images/637270-2024-specimen-paper-1-mark-scheme.pdf
// Neither asks for formal register — "appropriate to the task(s)" is the opposite
// of that for an email to a friend, which is the 2028 specimen's own Q3(a).
import { describe, it, expect } from 'vitest'
import { score, overallBand } from '../writingGrader'
import { FORMATS } from '../writingFormats'
import { WRITING_TASKS } from '../../data/writingTasks'

// ── Spec-perfect answers — authored for this test, NOT candidate exam material. ──
// Written the way a strong candidate writes, deliberately NOT stuffed with the
// grader's list words (each uses zero FORM_* words). Line → descriptor it meets:
//
// 0546 2028 specimen Q3(a) "Pindah rumah" — e-mel kepada kawan, 130–140 perkataan.
//   ¶2 why the family moved (dinaikkan pangkat) ........ Task completion 7–9, bullet 1
//   ¶3 who helped (pak cik, dua orang sepupu) ........... bullet 2
//   ¶4 feelings across the move (sedih → teruja) ........ bullet 3
//   ¶5 the hardest part + why (barang mudah pecah) ...... bullet 4 — "Gives detailed
//                                                         information … and explanations"
//   ¶6 what I'd do next time (kemas awal, label) ........ bullet 5 — all five tasks done
//   kerana / apabila / supaya / sekiranya / walau bagaimanapun — "well-linked sentences
//   frequently"; "Apa khabar?" beside 20+-word sentences, passives (dinaikkan,
//   ditukarkan, dicari), relative "yang" — "simple and complex structures … of varying
//   length"; friendly register, no word leaned on — "vocabulary appropriate to the
//   task(s)"; DBP spelling (baharu, e-mel, pak cik, berasa) — Accuracy 6–7.
const MS_EMAIL = `Hai Aina,

Apa khabar? Saya harap kamu sihat. Bulan lepas, keluarga saya telah berpindah rumah ke Ipoh kerana ayah saya dinaikkan pangkat dan ditukarkan ke pejabat baharu di sana.

Nasib baik, pak cik dan dua orang sepupu saya datang membantu kami. Mereka mengangkat almari dan kotak-kotak yang berat ke dalam lori sehingga lewat petang.

Pada mulanya, saya berasa sedih kerana terpaksa meninggalkan kawan-kawan lama. Walau bagaimanapun, perasaan itu bertukar menjadi teruja apabila saya melihat bilik baharu saya yang luas.

Perkara yang paling mencabar ialah kerja membungkus barang-barang. Kami mempunyai terlalu banyak buku dan pinggan mangkuk yang mudah pecah, jadi proses itu mengambil masa hampir seminggu.

Sekiranya saya perlu berpindah lagi, saya akan mula mengemas lebih awal dan menampal label pada setiap kotak supaya barang-barang mudah dicari.

Balaslah e-mel saya nanti.

Kawanmu,
Siti`

// 0510 article, 120–160 words — task `eng-article-phone-free-lessons` (writingTasks.js).
//   title + "Picture this" hook ...... Content 5–6 "Consistently appropriate style for the
//                                      text type", "Excellent sense of purpose and audience"
//   "In my view … not locked away" ... requirement 1: a clear overall opinion
//   ¶2 distraction + phone-free week . requirement 2: developed reason WITH an example
//   ¶3 usefulness + filming ......... requirement 2: a second developed reason
//   ¶4 the rule (unless … at break) . requirement 3: a fair rule in practice
//   ¶5 one-line takeaway ............ requirement 4: a clear conclusion
//   halfway / tricky / notification / drifted / noticeably / genuinely — "common and
//   less common vocabulary"; "The main problem is distraction." beside "Even when we
//   ignore …, our attention has already drifted, and it takes …" — "simple and complex
//   structures"; In my view / but / However / therefore / When / unless / So — "wide
//   range of linking words"; six paragraphs — "Effectively organised and sequenced".
const EN_ARTICLE = `Switch Off to Tune In

Picture this: your teacher is halfway through explaining a tricky equation when a phone buzzes, and suddenly half the class has forgotten the point. Should phones be banned in lessons? In my view, they should be switched off, but not locked away completely.

The main problem is distraction. Even when we ignore a notification, our attention has already drifted, and it takes several minutes to focus again. Last term, our history class tried a phone-free week, and our quiz results improved noticeably.

However, phones can also be genuinely useful. When our science teacher asked us to film an experiment, a phone was the quickest tool we had.

A fair rule, therefore, would be simple: phones stay switched off in bags unless the teacher asks for them, and students can use them freely at break.

So, let's switch off to tune in. Our grades will thank us.`

const EN_TASK = WRITING_TASKS.find((t) => t.id === 'eng-article-phone-free-lessons')

describe('the weighted overall is computed exactly', () => {
  // 1.5 + 1.5 + 0.8 + 0.9 + 0.6 + 0.2 = 5.5 on paper, but 0.15 and 0.1 are not exact
  // in binary floating point, so the old sum came out 5.499999999999999 and
  // Math.round() dropped it to 5. 85 of the 782 reachable exact-half sub-band sets
  // (each 2–6) rounded the wrong way. Not a new marking rule — the stated rule, computed right.
  it('a sub-band set worth exactly 5.5 rounds UP to band 6', () => {
    expect(overallBand({ content: 6, accuracy: 6, vocab: 4, variety: 6, cohesion: 6, format: 4 })).toBe(6)
  })

  it('and exactly 2.5 rounds up to 3', () => {
    expect(overallBand({ content: 2, accuracy: 2, vocab: 3, variety: 3, cohesion: 3, format: 3 })).toBe(3)
  })
})

describe('range is scored on range, not on a formal-register word list', () => {
  it('English: no formal-list words, yet vocabulary and cohesion reach the upper bands', () => {
    const r = score(EN_ARTICLE, { lang: 'eng', format: 'eng-article' })
    expect(r.metrics.formalCount).toBe(0) // proves the answer was not list-stuffed
    expect(r.subBands.vocab).toBeGreaterThanOrEqual(5)
    expect(r.subBands.cohesion).toBeGreaterThanOrEqual(5)
  })

  it('Malay: no formal-list words, yet vocabulary and cohesion reach the upper bands', () => {
    const r = score(MS_EMAIL, { lang: 'malay', format: 'ms-email' })
    expect(r.metrics.formalCount).toBe(0)
    expect(r.subBands.vocab).toBeGreaterThanOrEqual(5)
    expect(r.subBands.cohesion).toBeGreaterThanOrEqual(5)
  })
})

describe('ordinary subordinate clauses count as complex structures', () => {
  // "when", "if", "after" are the commonest English subordinators; "sebelum",
  // "selepas", "ketika" are kata hubung pancangan keterangan (Tatabahasa Dewan).
  // None of the six was recognised, so a sentence built on one scored as simple.
  it('English', () => {
    const t = 'We stayed inside when it rained. You can borrow it if you ask first. ' +
      'He smiled after he read the letter. I will wait until it arrives.'
    expect(score(t, { lang: 'eng', format: 'general' }).metrics.complexRatio).toBe(1)
  })

  it('Malay', () => {
    const t = 'Kami makan sebelum hujan turun. Dia tidur selepas kerja rumahnya siap. ' +
      'Saya membaca ketika adik saya bermain. Kami menunggu sehingga bas itu tiba.'
    expect(score(t, { lang: 'malay', format: 'general' }).metrics.complexRatio).toBe(1)
  })
})

// ── Negative controls — the other half of "awards band 6 when EARNED". ──
// Found by the fresh-context review of this change: the first version counted
// "and/but/or/so" as four linking types, "after school" as a clause, and dropped every
// floor on vocabulary. These pin the floor under each range rule.
// Authored for this test — NOT candidate exam material.
const EN_WEAK = [
  'Dear Tom,',
  'I am happy and I am fine. Last week I go to the beach with my family and it was fun. We swim in the sea and we play in the sand but it was very hot so we drink water. When we are hungry we eat food. My brother is naughty so my mother is angry.',
  'If it rain we will stay at home. Then we watch TV and we eat food. I like the beach because it is fun. I like my family because they are nice. My father is nice and my mother is nice. We go home and we sleep. It was a good day and I am happy.',
  'Do you like the beach? You can come with me next time or you can come to my house. Then we can play and we can eat food.',
  'Your friend,\nAli',
].join('\n\n')

const MS_WEAK = [
  'Hai Ali,',
  'Saya sihat dan saya gembira. Bulan lepas saya pindah rumah dan saya penat. Rumah baru besar tetapi rumah lama kecil. Saya suka rumah baru kerana rumah baru cantik. Ayah saya suka rumah baru dan ibu saya suka rumah baru.',
  'Pak cik saya tolong kami. Pak cik saya angkat kotak dan saya angkat kotak. Kotak berat jadi saya penat. Kemudian kami makan nasi. Apabila malam kami tidur. Jika saya pindah lagi saya akan angkat kotak lagi.',
  'Saya sedih sebab kawan saya tinggal di rumah lama. Saya rindu kawan saya. Saya suka kawan saya dan kawan saya suka saya. Selepas itu saya gembira semula kerana rumah baru cantik.',
  'Balas e-mel saya.',
  'Kawanmu,\nSiti',
].join('\n\n')

describe('weak writing stays below the top — the floor under the new range rules', () => {
  it('English: a common-words email gets no top-band range credit', () => {
    const r = score(EN_WEAK, { lang: 'eng', format: 'eng-email' })
    expect(r.subBands.vocab).toBeLessThanOrEqual(3) // 1–3 "Uses only common vocabulary"
    expect(r.subBands.cohesion).toBeLessThanOrEqual(4) // and/but/because/so = ONE simple-connector type
    // Its OVERALL is still 5: accuracy reads it as error-free (6) despite "Last week I
    // go", "If it rain". That is the English error detector's gap, not a range rule —
    // queued with this text as the reproducer (docs/gauntlet/L1/README.md, round 5).
  })

  it('Malay: a straightforward-vocabulary e-mel is NOT lifted to band 5', () => {
    const r = score(MS_WEAK, { lang: 'malay', format: 'ms-email' })
    expect(r.subBands.vocab).toBeLessThanOrEqual(3) // 1–3 "a small range of straightforward vocabulary"
    expect(r.band).toBeLessThanOrEqual(4)
  })

  it('English: prepositions ("after school", "since 2010") are not clauses', () => {
    const t = 'I went home after school. I have lived here since 2010. We play football once a week. ' +
      'I read until midnight. I eat breakfast before class.'
    expect(score(t, { lang: 'eng', format: 'general' }).metrics.complexRatio).toBe(0)
  })

  it('Malay: "selepas itu" / "sebelum ini" are adverbs, and "bila-bila" is not "bila"', () => {
    const t = 'Selepas itu kami makan nasi. Sebelum ini saya tinggal di Ipoh. ' +
      'Ketika itu hari hujan lebat. Awak boleh datang bila-bila masa.'
    expect(score(t, { lang: 'malay', format: 'general' }).metrics.complexRatio).toBe(0)
  })

  it('a multi-word essay marker ("in addition") is recognised at all', () => {
    // DISC_EN's phrases never matched: the caller pre-escaped a "\s+" that wordRe
    // then escaped again. Visible in the "Discourse" chip, which read 0.
    const r = score('We recycle paper at school. In addition, we collect cans every week for the club.', { lang: 'eng', format: 'general' })
    expect(r.disc).toContain('in addition')
  })
})

describe('the top content band is reachable inside every format\'s own word range', () => {
  // content 6 used to need 110% of minWords. For the 0546 Q3 formats that is 143
  // words — above the syllabus MAXIMUM ("antara 130–140 patah perkataan", 2028
  // specimen; "about 130–140 words", 2025–27 syllabus p.24), so a student who wrote
  // exactly what Cambridge asks could never reach it. Exam Rehearsal grades the Malay
  // stage as ms-rencana, so this capped every rehearsal.
  // Three paragraphs of exactly `n` words in total.
  const paragraphs = (n) => [0, 1, 2]
    .map((k) => Array.from({ length: n }, (_, i) => `w${i}`).filter((_, i) => i % 3 === k).join(' '))
    .join('\n\n')

  it.each(FORMATS.filter((f) => f.maxWords).map((f) => [f.id, f]))('%s — at its syllabus maximum', (_id, f) => {
    expect(score(paragraphs(f.maxWords), { lang: f.lang, format: f.id }).subBands.content).toBe(6)
  })

  it('a 220-word answer to a 200-word format earns it (200 × 1.1 is 220.00000000000003 as a float)', () => {
    expect(score(paragraphs(220), { lang: 'eng', format: 'eng-letter-formal' }).subBands.content).toBe(6)
  })

  it('a 0546 Q3 answer at the syllabus MINIMUM already earns it (the range is too tight for a cushion)', () => {
    expect(score(paragraphs(130), { lang: 'malay', format: 'ms-rencana' }).subBands.content).toBe(6)
  })
})

describe('a spec-perfect answer is awarded band 6', () => {
  it('English 0510 article, graded against its task', () => {
    const r = score(EN_ARTICLE, { lang: 'eng', format: 'eng-article', task: EN_TASK })
    expect(r.taskCoverage.onTopic).toBe(true)
    expect(r.band).toBe(6)
  })

  it('Malay 0546 e-mel, with the format the student picked', () => {
    expect(score(MS_EMAIL, { lang: 'malay', format: 'ms-email' }).band).toBe(6)
  })

  it('Malay 0546 e-mel, auto-detected (what the calibration harness runs)', () => {
    expect(score(MS_EMAIL, { lang: 'malay', format: 'auto' }).band).toBe(6)
  })
})
