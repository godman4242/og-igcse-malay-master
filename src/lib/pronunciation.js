/**
 * Pronunciation scoring — compares spoken text vs expected text
 * Returns per-word feedback: correct, close, or wrong
 */

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

  return {
    words: result,
    score: Math.round((score / expWords.length) * 100),
    total: expWords.length,
    correct: result.filter(r => r.status === 'correct').length,
    close: result.filter(r => r.status === 'close').length,
    wrong: result.filter(r => r.status === 'wrong').length,
  }
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
