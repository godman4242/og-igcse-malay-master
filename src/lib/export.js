/**
 * Export utilities for flashcard data
 * Supports CSV, JSON, and PDF formats
 */

// Sanitize cell value to prevent CSV formula injection
function sanitizeCSVCell(value) {
  const str = String(value)
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str
  }
  return str
}

// Export to CSV format
export function exportToCSV(cards, filename = 'igcse-malay.csv') {
  if (cards.length === 0) return

  const headers = ['Malay', 'English', 'Example', 'Topic', 'Progress', 'Ease', 'Interval']
  const rows = cards.map(card => [
    `"${sanitizeCSVCell(card.m).replace(/"/g, '""')}"`,
    `"${sanitizeCSVCell(card.e).replace(/"/g, '""')}"`,
    `"${sanitizeCSVCell(card.ex || '').replace(/"/g, '""')}"`,
    `"${sanitizeCSVCell(card.t || 'General').replace(/"/g, '""')}"`,
    card.p || 'n',
    Math.round((card.ease || 2.5) * 100) / 100,
    card.interval || 1
  ])

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

// Export to JSON format
export function exportToJSON(cards, filename = 'igcse-malay.json') {
  if (cards.length === 0) return

  const data = {
    exported: new Date().toISOString(),
    version: '1.0',
    cardCount: cards.length,
    cards: cards.map(card => ({
      malay: card.m,
      english: card.e,
      example: card.ex || '',
      topic: card.t || 'General',
      progress: card.p || 'n',
      ease: Math.round((card.ease || 2.5) * 100) / 100,
      interval: card.interval || 1,
      box: card.box || 0,
      lastReview: card.lastReview || null,
      nextReview: card.nextReview || null
    }))
  }

  const json = JSON.stringify(data, null, 2)
  downloadFile(json, filename, 'application/json;charset=utf-8;')
}

// Export to printable HTML (opens print dialog)
export function exportToPDF(cards) {
  if (cards.length === 0) return

  const title = 'IGCSE Malay Flashcards'
  const date = new Date().toLocaleDateString()

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; }
    td { padding: 8px; border: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .malay { font-weight: bold; color: #2563eb; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    <p>Exported: ${escapeHtml(date)}</p>
    <p>Total cards: ${cards.length}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Malay</th>
        <th>English</th>
        <th>Example</th>
        <th>Topic</th>
        <th>Progress</th>
      </tr>
    </thead>
    <tbody>
      ${cards.map(card => `
        <tr>
          <td class="malay">${escapeHtml(card.m)}</td>
          <td>${escapeHtml(card.e)}</td>
          <td>${escapeHtml(card.ex || '')}</td>
          <td>${escapeHtml(card.t || 'General')}</td>
          <td>${escapeHtml(card.p || 'new')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`

  const printWindow = window.open('', '', 'height=600,width=800')
  if (!printWindow) {
    // Popup blocked — fall back to downloading the HTML file
    downloadFile(html, 'igcse-malay-cards.html', 'text/html;charset=utf-8;')
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.print()
}

// Export progress statistics
export function exportProgressStats(cards, deck = null) {
  const filtered = deck ? cards.filter(c => c.t === deck) : cards

  const stats = {
    exported: new Date().toISOString(),
    totalCards: filtered.length,
    byProgress: {
      new: filtered.filter(c => c.p === 'n').length,
      learning: filtered.filter(c => c.p === 'l').length,
      mastered: filtered.filter(c => c.p === 'm').length
    },
    byTopic: {},
    averageEase: 0,
    averageInterval: 0
  }

  filtered.forEach(card => {
    const topic = card.t || 'General'
    stats.byTopic[topic] = (stats.byTopic[topic] || 0) + 1
  })

  const nonNewCards = filtered.filter(c => c.p !== 'n')
  if (nonNewCards.length > 0) {
    stats.averageEase = Math.round((nonNewCards.reduce((sum, c) => sum + (c.ease || 2.5), 0) / nonNewCards.length) * 100) / 100
    stats.averageInterval = Math.round(nonNewCards.reduce((sum, c) => sum + (c.interval || 1), 0) / nonNewCards.length)
  }

  return stats
}

// Helper: Download file via blob URL
function downloadFile(data, filename, mime) {
  const blob = new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Helper: Escape HTML entities
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return String(text).replace(/[&<>"']/g, m => map[m])
}
