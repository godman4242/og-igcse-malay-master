/**
 * Pronunciation scoring — compares spoken text vs expected text
 * Returns per-word feedback with Malay-specific tips
 */

// Common Malay pronunciation confusions for ms-MY Speech API
const MALAY_TIPS = {
  'ny': 'The "ny" sound (like "nyamuk") is a single nasal sound, similar to Spanish ñ.',
  'ng': 'The "ng" at the start of words (like "nganga") is a velar nasal. Practice: ngarai, ngeri.',
  'r': 'Malay "r" is a trilled/tapped r, not the English r. Practice: rumah, roti.',
  'kh': 'The "kh" (like "khabar") is a fricative from the back of the throat.',
  'sy': 'The "sy" (like "syarikat") sounds like English "sh".',
  'gh': 'The "gh" (like "ghairah") is a soft guttural sound.',
}

export function scorePronunciation(expected, spoken) {
  const expWords = normalize(expected).split(/\s+/)
  const spkWords = normalize(spoken).split(/\s+/)

  const result = []
  let score = 0

  for (let i = 0; i < expWords.length; i++) {
    const exp = expWords[i]
    const spk = spkWords[i] || ''

    if (exp === spk) {
      result.push({ word: exp, status: 'correct', spoken: spk })
      score++
    } else if (levenshtein(exp, spk) <= Math.ceil(exp.length * 0.3)) {
      result.push({ word: exp, status: 'close', spoken: spk })
      score += 0.5
    } else {
      result.push({ word: exp, status: 'wrong', spoken: spk || '—' })
    }
  }

  // Extra words spoken
  for (let i = expWords.length; i < spkWords.length; i++) {
    result.push({ word: '', status: 'extra', spoken: spkWords[i] })
  }

  // Generate contextual tips based on missed words
  const tips = generateTips(result)

  return {
    words: result,
    score: Math.round((score / Math.max(1, expWords.length)) * 100),
    total: expWords.length,
    correct: result.filter(r => r.status === 'correct').length,
    close: result.filter(r => r.status === 'close').length,
    wrong: result.filter(r => r.status === 'wrong').length,
    tips,
  }
}

function generateTips(wordResults) {
  const tips = []
  const missed = wordResults.filter(w => w.status === 'wrong' || w.status === 'close')

  for (const m of missed) {
    for (const [pattern, tip] of Object.entries(MALAY_TIPS)) {
      if (m.word.includes(pattern)) {
        tips.push(tip)
        break
      }
    }
  }

  // General tips based on patterns
  if (missed.length > 0 && tips.length === 0) {
    if (missed.some(w => w.word.length > 8)) {
      tips.push('For longer words, try breaking them into syllables: me-nu-lis, per-hu-bu-ngan.')
    }
    if (missed.some(w => /^(me|ber|di|ter|per)/.test(w.word))) {
      tips.push('Imbuhan prefixes change pronunciation flow. Practice: me-NA-iki, ber-JA-lan.')
    }
  }

  if (missed.length === 0) {
    tips.push('Perfect pronunciation! Try a harder sentence.')
  }

  return [...new Set(tips)].slice(0, 3)
}

function normalize(text) {
  return text.toLowerCase().replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ').trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    }
  }
  return dp[m][n]
}

/**
 * Generate practice sentences from flashcards
 */
export function generatePracticeSentences(cards, count = 5) {
  const pool = cards.filter(c => c.ex && c.ex.length > 5)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(c => ({
    malay: c.ex?.split('(')[0]?.trim() || c.m,
    english: c.e,
    word: c.m,
  }))
}

/**
 * Generate pronunciation drills from weak/missed words
 */
export function getPronunciationDrills(mistakes, dictionary, count = 8) {
  // Get words from recent mistakes
  const weakWords = mistakes
    .filter(m => m.type === 'vocab' && !m.reviewed)
    .slice(0, count)
    .map(m => m.word)

  // Look up example sentences from dictionary
  const drills = weakWords.map(word => {
    const entry = dictionary[word]
    return {
      word,
      sentence: entry ? `${word} (${entry})` : word,
      english: entry || word,
    }
  })

  return drills
}
