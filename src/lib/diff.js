export function computeWordDiff(oldText, newText) {
  const oldWords = oldText.split(/\s+/).filter(w => w.length > 0)
  const newWords = newText.split(/\s+/).filter(w => w.length > 0)

  const n = oldWords.length
  const m = newWords.length
  
  // Create DP table
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS and diff
  let i = n
  let j = m
  const diff = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      diff.unshift({ type: 'equal', value: oldWords[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'add', value: newWords[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'remove', value: oldWords[i - 1] })
      i--
    }
  }

  // Group adjacent identical types
  const grouped = []
  for (const item of diff) {
    if (grouped.length > 0 && grouped[grouped.length - 1].type === item.type) {
      grouped[grouped.length - 1].value += ' ' + item.value
    } else {
      grouped.push({ type: item.type, value: item.value })
    }
  }

  return grouped
}
