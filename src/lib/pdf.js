// PDF text extraction via pdfjs-dist v4. We deliberately keep this layer
// small: callers get back paragraph-grouped plain text per page, and we
// hand off to higher-level UIs from there.
//
// Past papers tend to have noisy line breaks (every line becomes its own
// item). We cluster items on Y position so paragraphs survive extraction
// instead of falling apart into single sentences.

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

function clusterParagraphs(items) {
  if (!items.length) return []
  // Each item: { str, transform: [a,b,c,d,e,f], width, height }
  // y = transform[5]; lines on the same row share y; paragraph break = y gap > 1.5 * lineHeight.
  const sorted = [...items].sort((a, b) => {
    const ay = a.transform[5]
    const by = b.transform[5]
    if (Math.abs(ay - by) < 2) return a.transform[4] - b.transform[4] // same line, sort by x
    return by - ay // PDF y is from bottom-up; sort top-down
  })

  const lines = []
  let current = null
  for (const it of sorted) {
    const y = it.transform[5]
    const h = it.height || 12
    if (current && Math.abs(current.y - y) < h * 0.6) {
      current.text += (current.text.endsWith(' ') || it.str.startsWith(' ')) ? it.str : ' ' + it.str
    } else {
      if (current) lines.push(current)
      current = { y, h, text: it.str }
    }
  }
  if (current) lines.push(current)

  // Group lines into paragraphs by Y gap.
  const paragraphs = []
  let buf = []
  let prevY = null
  let prevH = null
  for (const line of lines) {
    if (prevY !== null) {
      const gap = prevY - line.y
      const expected = prevH * 1.4
      if (gap > expected) {
        if (buf.length) paragraphs.push(buf.join(' ').replace(/\s+/g, ' ').trim())
        buf = []
      }
    }
    buf.push(line.text)
    prevY = line.y
    prevH = line.h
  }
  if (buf.length) paragraphs.push(buf.join(' ').replace(/\s+/g, ' ').trim())
  return paragraphs.filter(p => p.length > 0)
}

export async function extractPdfText(file) {
  const buf = await file.arrayBuffer()
  const doc = await getDocument({ data: buf }).promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent({ includeMarkedContent: false })
    const items = (tc.items || []).filter(it => it.str !== undefined)
    const paragraphs = clusterParagraphs(items)
    pages.push({
      pageNum: i,
      text: paragraphs.join('\n\n'),
      paragraphs,
    })
  }
  let meta = {}
  try {
    const m = await doc.getMetadata()
    meta = {
      title: m?.info?.Title || '',
      author: m?.info?.Author || '',
      numPages: doc.numPages,
    }
  } catch {
    meta = { title: '', author: '', numPages: doc.numPages }
  }
  return { pages, meta }
}
