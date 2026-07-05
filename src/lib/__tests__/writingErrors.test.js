import { describe, it, expect } from 'vitest'
import { findIssues, summariseIssues, ERROR_TYPES } from '../writingErrors.js'

const idsOf = (findings) => new Set(findings.map(f => f.id))

describe('findIssues — confusables (high signal)', () => {
  it('flags would-of', () => {
    const f = findIssues('I would of gone if I had time.')
    expect(idsOf(f)).toContain('would-of-error')
  })

  it('flags then vs than after a comparative', () => {
    // "taller" isn't in the curated comparative list; "bigger" is.
    const f = findIssues('She is bigger then me.')
    expect(idsOf(f)).toContain('then-comparative-error')
  })

  it('flags between you and I', () => {
    const f = findIssues('This is between you and I.')
    expect(idsOf(f)).toContain('between-you-and-i')
  })

  it('flags "their" used as a be-verb subject', () => {
    // their-be-verb fires on `their\s+(is|are|was|were)`.
    const f = findIssues('Their are many problems with this idea.')
    expect(idsOf(f)).toContain('their-be-verb')
  })
})

describe('findIssues — finding shape', () => {
  it('every finding has required fields with sane ranges', () => {
    const text = 'I would of seen them, but they was busy.'
    const f = findIssues(text)
    expect(f.length).toBeGreaterThan(0)
    for (const finding of f) {
      expect(finding).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        severity: expect.stringMatching(/^(high|medium|low)$/),
        start: expect.any(Number),
        end: expect.any(Number),
        message: expect.any(String),
      })
      expect(finding.start).toBeGreaterThanOrEqual(0)
      expect(finding.end).toBeGreaterThan(finding.start)
      expect(finding.end).toBeLessThanOrEqual(text.length)
      expect(ERROR_TYPES).toContain(finding.type)
    }
  })

  it('findings are sorted by start position', () => {
    const text = 'I would of done it. Then I past the shop. Their late again.'
    const f = findIssues(text)
    const starts = f.map(x => x.start)
    expect(starts).toEqual([...starts].sort((a, b) => a - b))
  })
})

describe('summariseIssues', () => {
  it('counts severities and types correctly', () => {
    const f = findIssues('I would of gone. She is taller then me. Their late.')
    const s = summariseIssues(f)
    expect(s.counts.total).toBe(f.length)
    expect(s.counts.high + s.counts.medium + s.counts.low).toBe(f.length)
    const sumByType = Object.values(s.byType).reduce((a, b) => a + b, 0)
    expect(sumByType).toBe(f.length)
  })
})

describe('findIssues — calibration negatives (no false positives)', () => {
  // These are the exact calibration cases recorded in RESUME_HERE.md.
  // The English engine MUST NOT flag normal letter greetings, transitional
  // intros, or dialogue narration as errors.
  it('clean formal letter yields no high-severity findings', () => {
    const text = `Dear Sir,

I am writing to apply for the position of summer intern at your firm. I have recently completed my IGCSE examinations and I am keen to gain practical experience in your industry before starting university.

During my studies I have developed strong analytical skills and I am comfortable working in a team. I have attached my CV for your consideration and would welcome the opportunity to discuss my application further.

Yours faithfully,
Aisha Rahman`
    const f = findIssues(text, { formatId: 'eng-letter-formal' })
    const high = f.filter(x => x.severity === 'high')
    expect(high).toHaveLength(0)
  })

  it('narrative with dialogue does not over-flag', () => {
    const text = `It was a cold morning when I left the house. The sky was grey and the streets were almost empty.

"Are you sure about this?" my brother asked, his voice barely above a whisper.

"I have to be," I replied. I knew there was no turning back now. The bus rumbled in the distance and I tightened my grip on my bag.`
    const f = findIssues(text)
    const high = f.filter(x => x.severity === 'high')
    expect(high.length).toBeLessThanOrEqual(1)
  })
})

describe('findIssues — subject-verb agreement: he/she + bare verb', () => {
  it('flags "He go" (third-person singular needs -s)', () => {
    const f = findIssues('He go to school every day.')
    expect(idsOf(f)).toContain('subject-verb-bare')
  })
  it('flags "she walk" and suggests "she walks"', () => {
    const f = findIssues('She walk to the shop after lunch.')
    const hit = f.find(x => x.id === 'subject-verb-bare')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe('She walks')
  })

  // FP guards — conservative bias is law: every guard must leave the correct
  // (or genuinely-ambiguous) form untouched.
  it('does NOT flag the correct third-person form', () => {
    expect(idsOf(findIssues('She walks to the shop.'))).not.toContain('subject-verb-bare')
  })
  it('does NOT flag the subjunctive ("I suggest he go")', () => {
    expect(idsOf(findIssues('I suggest he go home now.'))).not.toContain('subject-verb-bare')
    expect(idsOf(findIssues('It is important that she stay.'))).not.toContain('subject-verb-bare')
  })
  it('does NOT flag a compound subject ("Tom and she walk")', () => {
    expect(idsOf(findIssues('Tom and she walk to school together.'))).not.toContain('subject-verb-bare')
  })
  it('does NOT flag a relative clause ("the girl who sit")', () => {
    expect(idsOf(findIssues('The girl who sit next to me is kind.'))).not.toContain('subject-verb-bare')
  })
  it('does NOT flag invariant-past bare forms ("He put", "He read")', () => {
    expect(idsOf(findIssues('He put the book on the table.'))).not.toContain('subject-verb-bare')
    expect(idsOf(findIssues('He read the letter twice.'))).not.toContain('subject-verb-bare')
  })
  it('does NOT flag "it" (dummy-subject / imperative collisions)', () => {
    expect(idsOf(findIssues('Let it go, the moment has passed.'))).not.toContain('subject-verb-bare')
  })
})

describe('findIssues — subject-verb agreement: determiner-anchored', () => {
  // Singular branch — every/each fixes the noun as singular.
  it('flags "every teenager have" and suggests "every teenager has"', () => {
    const f = findIssues('Almost every teenager have a smartphone.')
    const hit = f.find(x => x.id === 'subject-verb-determiner')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe('every teenager has')
  })
  it('flags "each student have" and "each pupil were"', () => {
    expect(idsOf(findIssues('Each student have a different opinion.'))).toContain('subject-verb-determiner')
    expect(idsOf(findIssues('Each pupil were given a new book.'))).toContain('subject-verb-determiner')
  })

  // Plural branch — many/several/few/both/numerous fixes the noun as plural.
  it('flags "many students is" and suggests "many students are"', () => {
    const f = findIssues('In our city, many students is struggling.')
    const hit = f.find(x => x.id === 'subject-verb-determiner')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe('many students are')
  })
  it('flags "several teachers is", "few people is", "both parents has"', () => {
    expect(idsOf(findIssues('Several teachers is unsure about the plan.'))).toContain('subject-verb-determiner')
    expect(idsOf(findIssues('Few people is aware of the danger.'))).toContain('subject-verb-determiner')
    expect(idsOf(findIssues('Both parents has agreed to it.'))).toContain('subject-verb-determiner')
  })

  // FP guards — conservative bias is law: each correct/ambiguous form stays untouched.
  it('does NOT flag correct determiner agreement', () => {
    expect(idsOf(findIssues('Every teenager has a smartphone.'))).not.toContain('subject-verb-determiner')
    expect(idsOf(findIssues('Many students are struggling this year.'))).not.toContain('subject-verb-determiner')
  })
  it('does NOT flag the "many a NOUN is" singular idiom', () => {
    expect(idsOf(findIssues('Many a student is anxious before the exams.'))).not.toContain('subject-verb-determiner')
  })
  it('does NOT flag collective "this/that NOUN are" (valid British usage)', () => {
    expect(idsOf(findIssues('This team are playing well today.'))).not.toContain('subject-verb-determiner')
    expect(idsOf(findIssues('That family are very kind to us.'))).not.toContain('subject-verb-determiner')
  })
  it('does NOT flag a measure/duration noun ("many years is a long time")', () => {
    expect(idsOf(findIssues('Many years is a long time to wait.'))).not.toContain('subject-verb-determiner')
  })
  it('does NOT flag a singular noun that merely ends in -s ("several species is")', () => {
    expect(idsOf(findIssues('Several species is endangered in this region.'))).not.toContain('subject-verb-determiner')
  })
  it('does NOT flag a relative clause ("every student that are")', () => {
    expect(idsOf(findIssues('Every student that are late will be marked absent.'))).not.toContain('subject-verb-determiner')
  })
  it('does NOT flag a compound subject ("every effort and resource are")', () => {
    expect(idsOf(findIssues('Every effort and resource are needed now.'))).not.toContain('subject-verb-determiner')
  })
})

describe('findIssues — uncountable nouns pluralised', () => {
  it('flags "informations" and suggests "information"', () => {
    const f = findIssues('I need more informations about this topic.')
    const hit = f.find(x => x.id === 'uncountable-plural')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe('information')
  })
  it('flags "equipments" and "advices"', () => {
    expect(idsOf(findIssues('The school bought new equipments.'))).toContain('uncountable-plural')
    expect(idsOf(findIssues('She shares advices with everyone.'))).toContain('uncountable-plural')
  })
  it('does NOT flag the correct singular uncountable', () => {
    expect(idsOf(findIssues('She gave me good advice and useful information.'))).not.toContain('uncountable-plural')
  })
  it('does NOT flag ambiguous words that are valid verbs ("researches")', () => {
    expect(idsOf(findIssues('He researches the topic carefully.'))).not.toContain('uncountable-plural')
  })
})

describe('findIssues — preposition-collocation gaps (new)', () => {
  it('flags "depend of", "interested about", "according with"', () => {
    expect(idsOf(findIssues('We depend of our parents.'))).toContain('preposition')
    expect(idsOf(findIssues('She is interested about science.'))).toContain('preposition')
    expect(idsOf(findIssues('According with the report, sales rose.'))).toContain('preposition')
  })
  it('does NOT flag "independent of" (no false match inside the word)', () => {
    expect(idsOf(findIssues('The result is independent of the method.'))).not.toContain('preposition')
  })
})

describe('findIssues — double comparative / superlative', () => {
  // Positives — "more/most" + an ALREADY-comparative/superlative word.
  it('flags "more better" and suggests "better"', () => {
    const f = findIssues('This phone is more better than my old one.')
    const hit = f.find(x => x.id === 'double-comparative')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe('better')
  })
  it('flags "most happiest" and suggests "happiest"', () => {
    const f = findIssues('It was the most happiest day of my life.')
    const hit = f.find(x => x.id === 'double-comparative')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe('happiest')
  })
  it('flags "more easier" and "most cleverest"', () => {
    expect(idsOf(findIssues('The new method is more easier to follow.'))).toContain('double-comparative')
    expect(idsOf(findIssues('She is the most cleverest girl in class.'))).toContain('double-comparative')
  })

  // FP guards — the correct periphrastic forms (more/most + BASE adjective) and
  // more/most + noun MUST stay untouched. Conservative bias is law.
  it('does NOT flag "more important" / "most beautiful" (correct periphrastic)', () => {
    expect(idsOf(findIssues('Honesty is more important than money.'))).not.toContain('double-comparative')
    expect(idsOf(findIssues('It was the most beautiful sunset I had seen.'))).not.toContain('double-comparative')
  })
  it('does NOT flag "more teachers" / "most interest" (more/most + noun)', () => {
    expect(idsOf(findIssues('We need more teachers in rural schools.'))).not.toContain('double-comparative')
    expect(idsOf(findIssues('The topic that holds the most interest for me is biology.'))).not.toContain('double-comparative')
  })
})

describe('findIssues — "much" + countable plural', () => {
  // Positives — "much" directly before a curated countable plural noun.
  it('flags "much people" and suggests "many people"', () => {
    const f = findIssues('There were much people at the concert.')
    const hit = f.find(x => x.id === 'much-countable')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe('many people')
  })
  it('flags "much books" and "much friends"', () => {
    expect(idsOf(findIssues('He owns much books about history.'))).toContain('much-countable')
    expect(idsOf(findIssues('She has much friends at university.'))).toContain('much-countable')
  })

  // FP guards — uncountable nouns after "much" are CORRECT and MUST stay untouched.
  it('does NOT flag "much time" / "much money" / "much water" / "much information"', () => {
    expect(idsOf(findIssues('We do not have much time left.'))).not.toContain('much-countable')
    expect(idsOf(findIssues('He spent much money on the trip.'))).not.toContain('much-countable')
    expect(idsOf(findIssues('There is not much water in the tank.'))).not.toContain('much-countable')
    expect(idsOf(findIssues('She gathered much information for the report.'))).not.toContain('much-countable')
  })
})

describe('findIssues — do-support + past tense ("didn\'t went")', () => {
  // Positives — after do-support the main verb must be the BASE form.
  it('flags "didn\'t went" and suggests "didn\'t go"', () => {
    const f = findIssues("Yesterday I didn't went to school.")
    const hit = f.find(x => x.id === 'do-support-past')
    expect(hit).toBeTruthy()
    expect(hit.suggestion).toBe("didn't go")
  })
  it('flags "did not gave" and "doesn\'t knew"', () => {
    expect(idsOf(findIssues('She did not gave me any help.'))).toContain('do-support-past')
    expect(idsOf(findIssues("He doesn't knew the answer."))).toContain('do-support-past')
  })

  // FP guards — the correct base form, invariant verbs (past == base), and
  // do-as-a-main-verb MUST stay untouched.
  it('does NOT flag the correct base form ("didn\'t go")', () => {
    expect(idsOf(findIssues("I didn't go to school yesterday."))).not.toContain('do-support-past')
  })
  it('does NOT flag invariant verbs whose past equals the base ("didn\'t put", "didn\'t read")', () => {
    expect(idsOf(findIssues("She didn't put the book away."))).not.toContain('do-support-past')
    expect(idsOf(findIssues("He didn't read the letter."))).not.toContain('do-support-past')
    expect(idsOf(findIssues("They didn't cut the rope."))).not.toContain('do-support-past')
  })
  it('does NOT flag "do/did" as a main verb ("did my homework")', () => {
    expect(idsOf(findIssues('I did my homework before dinner.'))).not.toContain('do-support-past')
    expect(idsOf(findIssues('She does yoga every morning.'))).not.toContain('do-support-past')
  })
  it('does NOT flag base/noun collisions left to BYOK ("didn\'t saw", "didn\'t found")', () => {
    expect(idsOf(findIssues("They didn't saw the wood in half."))).not.toContain('do-support-past')
    expect(idsOf(findIssues("They didn't found a new company."))).not.toContain('do-support-past')
  })
})

// False-positive elimination cluster (2026-07-05, adversarial review #2–#5).
// Four rules were flagging CORRECT English as HIGH errors — confident-wrong
// output is worse than silence for a learning tool. Each fix must preserve the
// genuine-error catch (guards below).
describe('findIssues — FP cluster #2–#5 (never flag correct English)', () => {
  // #2 — case-only day entries (saturday→Saturday) fired even on the correctly
  // capitalised word because the executor compared the fix to the LOWERCASED word.
  it('#2 does not flag correctly-capitalised "Saturday"/"Tuesday"', () => {
    expect(idsOf(findIssues('We will meet on Saturday morning.'))).not.toContain('spell-saturday')
    expect(idsOf(findIssues('The mock exam is on Tuesday.'))).not.toContain('spell-tuesday')
  })

  // #3 — "everyday" is a valid adjective ("everyday life"); it was flagged always.
  it('#3 does not flag the adjective "everyday"', () => {
    expect(idsOf(findIssues('Exercise is part of my everyday life.'))).not.toContain('spell-everyday')
    expect(idsOf(findIssues('These are everyday problems for teenagers.'))).not.toContain('spell-everyday')
  })

  // #4 — acronyms spoken letter-by-letter take "an" when the letter-name starts
  // with a vowel sound (M="em", N="en", X="ex"). "an MP/NGO/X-ray" is CORRECT.
  it('#4 does not flag "an" before a vowel-sound acronym (MP / NGO / X-ray)', () => {
    expect(idsOf(findIssues('She became an MP last year.'))).not.toContain('an-before-consonant')
    expect(idsOf(findIssues('He volunteers for an NGO abroad.'))).not.toContain('an-before-consonant')
    expect(idsOf(findIssues('The doctor ordered an X-ray of my arm.'))).not.toContain('an-before-consonant')
  })

  // #5 — "your right/wrong" is a valid possessive ("on your right", "your right to…").
  it('#5 does not flag possessive "your right"/"your wrong"', () => {
    expect(idsOf(findIssues('The library is on your right.'))).not.toContain('your-areerror')
    expect(idsOf(findIssues('It is your right to remain silent.'))).not.toContain('your-areerror')
  })

  // Regression guards — the genuine error each rule targets MUST still fire.
  it('still flags the genuine errors these rules target', () => {
    expect(idsOf(findIssues('Your welcome to join us anytime.'))).toContain('your-areerror')     // → you're welcome
    expect(idsOf(findIssues('Your going to enjoy this trip.'))).toContain('your-areerror')       // → you're going
    expect(idsOf(findIssues('I borrowed an book from the library.'))).toContain('an-before-consonant') // an book
  })
})

describe('findIssues — empty/edge inputs', () => {
  it('returns [] for empty', () => {
    expect(findIssues('')).toEqual([])
    expect(findIssues('   ')).toEqual([])
  })
})
