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
  const expWords = normalize(expected).split(/\s+/).filter(Boolean)
  const spkWords = normalize(spoken).split(/\s+/).filter(Boolean)

  // Sequence-align (not index-align) so a single inserted/dropped word does not
  // cascade every downstream word to "wrong" — one filler said mid-sentence used
  // to drag a fully-correct utterance down to ~25%.
  const result = alignWords(expWords, spkWords)

  let score = 0
  for (const r of result) {
    if (r.status === 'correct') score += 1
    else if (r.status === 'close') score += 0.5
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

// Levenshtein alignment of expected vs spoken tokens. Diagonal (align) costs 0 when
// the words are equal else 1 (substitution); an indel costs 1 — so a mispronounced
// word stays aligned (sub cost 1 < delete+insert cost 2) and only a genuine length
// mismatch becomes an insertion/deletion. Returns rows IN SPOKEN ORDER:
//   diagonal → classifyPair (correct/close/wrong); delete (expected unsaid) → wrong '—';
//   insert (extra spoken) → { word:'', status:'extra' }.
function alignWords(exp, spk) {
  const m = exp.length, n = spk.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const subCost = exp[i - 1] === spk[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + subCost, // align (match / substitute)
        dp[i - 1][j] + 1,           // expected word not spoken (deletion)
        dp[i][j - 1] + 1,           // extra spoken word (insertion)
      )
    }
  }
  const rows = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    const subCost = i > 0 && j > 0 && exp[i - 1] === spk[j - 1] ? 0 : 1
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + subCost) {
      rows.push(classifyPair(exp[i - 1], spk[j - 1]))
      i--; j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      rows.push({ word: exp[i - 1], status: 'wrong', spoken: '—' })
      i--
    } else {
      rows.push({ word: '', status: 'extra', spoken: spk[j - 1] })
      j--
    }
  }
  return rows.reverse()
}

function classifyPair(exp, spk) {
  if (exp === spk) return { word: exp, status: 'correct', spoken: spk }
  if (levenshtein(exp, spk) <= Math.ceil(exp.length * 0.3)) return { word: exp, status: 'close', spoken: spk }
  return { word: exp, status: 'wrong', spoken: spk }
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
