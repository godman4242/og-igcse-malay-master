#!/usr/bin/env node
// SOFT, non-gated report: lists content words used in dictionary examples that
// are NOT in dictionary.js (minus a closed-class allowlist). Lower = more
// "comprehensible input" (a beginner meets fewer unknown words per example).
// Advisory only — a natural, correct sentence always wins over a zero score;
// this is a tool I read while authoring a batch, never a test.
//
// Run: node scripts/report-example-vocab.mjs
import DICTIONARY from '../src/data/dictionary.js'
import EXAMPLES from '../src/data/dictionaryExamples.js'

// Closed-class function words / pronouns / particles / common time+number words
// that are fine to use freely even if not headwords in the dictionary.
const ALLOW = new Set([
  'saya','awak','dia','kami','kita','mereka','anda','aku','engkau','kau','beliau','nya','ku','mu','kamu',
  'ini','itu','yang','dan','atau','tetapi','tapi','kerana','sebab','jika','kalau','untuk','pada','di','ke',
  'dari','dengan','oleh','akan','telah','sudah','sedang','masih','juga','pula','lah','kah','pun','para','se',
  'ia','adalah','ialah','tidak','tak','bukan','sangat','amat','sekali','lebih','paling','setiap','semua',
  'sedikit','beberapa','ramai','begitu','begini','seperti','supaya','agar','apabila','ketika','selepas',
  'sebelum','sambil','seorang','sebuah','sebiji','sekeping','sehelai','sepasang','dua','tiga','empat','lima',
  'pukul','tahun','hari','pagi','petang','malam','tadi','nanti','esok','semalam','puan','encik','cik','tuan',
])
const dictKeys = new Set(Object.keys(DICTIONARY))
const strip = (w) => w.toLowerCase().replace(/[^a-zà-ɏ-]/g, '')

let totalOOV = 0
let examplesWithOOV = 0
for (const [word, ex] of Object.entries(EXAMPLES)) {
  const oov = ex.split(/\s+/).map(strip).filter(Boolean)
    .filter((w) => w !== word && !dictKeys.has(w) && !ALLOW.has(w))
  if (oov.length) {
    totalOOV += oov.length
    examplesWithOOV++
    console.log(`${word.padEnd(22)} OOV: ${[...new Set(oov)].join(', ')}`)
  }
}
console.log(
  `\n${totalOOV} out-of-vocabulary content-word use(s) across ${examplesWithOOV}/${Object.keys(EXAMPLES).length} examples.`,
)
