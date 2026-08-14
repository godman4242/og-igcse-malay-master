// Pins the off-topic guard on the `content` sub-band.
//
// THE DEFECT IT FIXES (measured, Gauntlet lane L1, docs/gauntlet/L1/): `content` was
// computed purely from word count, so a 174-word script the examiner awarded
// **Communication 0/10** — "This paragraph is not relevant to the question. It
// demonstrates that candidate does not understand the tasks required." — scored
// `content` 6/6, the TOP band, because it was long.
//
// Authority — Cambridge IGCSE Malay 0546 Paper 4 specimen mark scheme (from 2028),
// "Task completion":
//   "All tasks must be completed for full marks to be awarded in 'task completion'."
//   1–3 "Attempts some tasks with some success. Ambiguity or irrelevance compromises
//        meaning."
//   https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf
//
// ⚠ THE INVARIANT THAT MATTERS MOST is the on-topic case: this guard may only ever
// LOWER a band, so a false "off-topic" verdict is an unfair penalty on a student who
// did the work. Every change here must keep the on-topic essay byte-identical to its
// no-task grade.
import { describe, it, expect } from 'vitest'
import { score } from '../writingGrader'
import { taskCoverage, malayStem, ON_TOPIC_THRESHOLD } from '../taskCoverage'
import { WRITING_TASKS } from '../../data/writingTasks'

const EN_TASK = WRITING_TASKS.find((t) => t.id === 'eng-article-phone-free-lessons')
const MS_TASK = WRITING_TASKS.find((t) => t.lang === 'malay' && t.formatId === 'ms-surat-rasmi')

// All four texts below are authored for this test — NOT candidate exam material.
const EN_ON_TOPIC = `Should students be allowed to use phones during lessons? I believe they should, but only with clear rules.

Firstly, a phone is a powerful learning tool. Students can look up a word they do not know, check a fact, or record homework instructions they might otherwise forget. Teachers can also share resources instantly.

However, phones affect learning badly when they are used carelessly. Messages arrive constantly, and it is difficult to concentrate when a screen is lighting up beside you.

Therefore, a fair rule would be simple. Phones stay in bags during lessons unless a teacher asks for them, and they may be used freely at break. This respects both learning and independence.

In conclusion, banning phones completely ignores their value. A fair rule teaches responsibility instead.`

// Deliberately LONGER and well written than the on-topic answer, and about something
// else entirely. Under the old rules this scored the top content band.
const EN_OFF_TOPIC = `Last summer my family travelled to the coast for a fortnight, and it was easily the best holiday we have ever had together.

We left very early on a Saturday morning and drove for nearly four hours. My younger brother slept for most of the journey, while I watched the fields slowly give way to low hills and then, finally, to the sea.

The cottage we rented was small but comfortable. Every morning we walked down to the harbour to buy bread, and every evening we cooked together and played cards until it grew dark outside.

On the last day we climbed the cliff path to the lighthouse. The wind was fierce at the top, but the view across the bay was unforgettable and none of us wanted to leave.

I still think about that fortnight whenever the weather turns warm again.`

const MS_ON_TOPIC = `Taman permainan berhampiran kediaman kami berada dalam keadaan yang sangat usang.

Buaian telah patah dan papan gelongsor pula berkarat. Keadaan ini amat berbahaya kepada kanak-kanak yang bermain di situ setiap petang.

Penduduk berasa bimbang kerana anak mereka mungkin cedera. Ramai ibu bapa tidak lagi membenarkan anak mereka ke taman itu.

Saya mencadangkan pihak berkuasa membaiki peralatan yang rosak dan menyediakan jadual penyelenggaraan berkala.`

// Long enough to earn a high length-only content band, so the guard has something
// real to cut. Under the old rules this scored well simply for being long.
const MS_OFF_TOPIC = `Makanan kegemaran saya ialah nasi lemak yang dijual di gerai berdekatan rumah kami.

Nasi lemak dimasak dengan santan dan daun pandan sehingga wangi baunya. Ibu saya juga pandai memasak hidangan itu pada hujung minggu. Beliau akan bangun awal pagi untuk menyediakan sambal yang pedas dan ikan bilis yang rangup.

Saya suka memakannya pada waktu pagi bersama keluarga sebelum pergi ke sekolah. Adik saya pula lebih gemar makan roti canai dengan kuah dhal. Kadang-kadang kami membeli kedua-dua hidangan itu supaya semua orang gembira.

Rakan-rakan saya di sekolah juga bersetuju bahawa nasi lemak amat sedap. Kami sering berbual tentang gerai mana yang menjual nasi lemak paling enak di pekan kami.

Harganya murah dan rasanya sungguh enak, jadi kami sering membelinya. Pada pendapat saya, nasi lemak ialah hidangan terbaik di negara kita kerana ia sesuai dimakan pada bila-bila masa sahaja.`

describe('taskCoverage — is the essay even about the task?', () => {
  it('scores a genuinely on-topic essay well above the threshold', () => {
    const c = taskCoverage(EN_ON_TOPIC, EN_TASK, 'eng')
    expect(c.checkable).toBe(true)
    expect(c.onTopic).toBe(true)
    expect(c.ratio).toBeGreaterThan(ON_TOPIC_THRESHOLD * 2) // wide margin, not borderline
  })

  it('scores a long, well-written, entirely off-topic essay at the floor', () => {
    const c = taskCoverage(EN_OFF_TOPIC, EN_TASK, 'eng')
    expect(c.checkable).toBe(true)
    expect(c.onTopic).toBe(false)
    expect(c.ratio).toBeLessThan(ON_TOPIC_THRESHOLD / 2) // wide margin the other way
  })

  it('works in Malay, where affixes hide the root', () => {
    expect(taskCoverage(MS_ON_TOPIC, MS_TASK, 'malay').onTopic).toBe(true)
    expect(taskCoverage(MS_OFF_TOPIC, MS_TASK, 'malay').onTopic).toBe(false)
  })

  it('stems Malay affixes so "permainan" and "bermain" match', () => {
    expect(malayStem('permainan')).toBe(malayStem('bermain'))
    expect(malayStem('makan')).toBe('makan') // never over-strips to "mak"
  })

  it('says so, rather than guessing, when there is nothing to check', () => {
    expect(taskCoverage(EN_ON_TOPIC, null, 'eng').checkable).toBe(false)
    expect(taskCoverage(EN_ON_TOPIC, { prompt: '', requirements: [] }, 'eng').checkable).toBe(false)
  })
})

describe('the off-topic guard only ever lowers, and only when off-topic', () => {
  it('an off-topic answer loses the top content band it used to get for free', () => {
    const withTask = score(EN_OFF_TOPIC, { lang: 'eng', format: 'eng-article', task: EN_TASK })
    const noTask = score(EN_OFF_TOPIC, { lang: 'eng', format: 'eng-article' })
    expect(noTask.subBands.content).toBe(6) // the old, length-only verdict
    expect(withTask.subBands.content).toBe(3)
    expect(withTask.band).toBeLessThan(noTask.band)
  })

  it('an ON-TOPIC answer is completely untouched — no false penalty', () => {
    const withTask = score(EN_ON_TOPIC, { lang: 'eng', format: 'eng-article', task: EN_TASK })
    const noTask = score(EN_ON_TOPIC, { lang: 'eng', format: 'eng-article' })
    expect(withTask.band).toBe(noTask.band)
    expect(withTask.subBands.content).toBe(noTask.subBands.content)
  })

  it('grading with no task is unchanged — the whole calibration baseline depends on it', () => {
    const a = score(EN_ON_TOPIC, { lang: 'eng', format: 'eng-article' })
    const b = score(EN_ON_TOPIC, { lang: 'eng', format: 'eng-article', task: null })
    expect(b).toEqual(a)
    expect(a.taskCoverage).toBeNull()
  })

  it('applies in Malay too', () => {
    const off = score(MS_OFF_TOPIC, { lang: 'malay', format: 'ms-surat-rasmi', task: MS_TASK })
    const offNoTask = score(MS_OFF_TOPIC, { lang: 'malay', format: 'ms-surat-rasmi' })
    expect(off.subBands.content).toBeLessThan(offNoTask.subBands.content)

    const on = score(MS_ON_TOPIC, { lang: 'malay', format: 'ms-surat-rasmi', task: MS_TASK })
    const onNoTask = score(MS_ON_TOPIC, { lang: 'malay', format: 'ms-surat-rasmi' })
    expect(on.band).toBe(onNoTask.band)
  })
})
