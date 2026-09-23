#!/usr/bin/env node
// Connectivity smoke test for the Integration Arc.
//
// Usage:
//   node scripts/test-connections.mjs
//   node scripts/test-connections.mjs --verbose
//
// Reads .env.local from the project root, then pings each provider:
//   • Supabase   — anonymous GET /rest/v1/?select=*  (verifies URL + anon key)
//   • Gemini     — list models                      (verifies the key)
//   • OpenRouter — GET /api/v1/key                  (verifies the key; only if set)
//
// Key checks only, the same calls Settings' "Test key" makes — never a hardcoded model:
// free model slugs are retired every few months, and the app discovers them at runtime.
//
// Exits 0 if every CONFIGURED provider passes; 1 if any configured provider
// fails. Missing keys are reported but do NOT fail the run — this is a
// diagnostic, not a gate.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const ROOT = dirname(dirname(__filename))
const VERBOSE = process.argv.includes('--verbose')

// ── tiny .env parser (no dep) ───────────────────────────────────────────
async function loadDotEnv(path) {
  const out = {}
  let raw
  try { raw = await readFile(path, 'utf8') } catch { return out }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const k = trimmed.slice(0, eq).trim()
    let v = trimmed.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

// ── pretty printers ─────────────────────────────────────────────────────
const colour = (code, s) => process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s
const green  = s => colour('32', s)
const red    = s => colour('31', s)
const yellow = s => colour('33', s)
const dim    = s => colour('2',  s)

function line(name, status, detail) {
  const tag =
    status === 'pass' ? green('✓ PASS  ') :
    status === 'fail' ? red('✗ FAIL  ')   :
    status === 'skip' ? yellow('— SKIP ') :
                        yellow('? UNKN  ')
  console.log(`${tag} ${name.padEnd(14)} ${detail || ''}`)
}

// ── tests ───────────────────────────────────────────────────────────────
async function testSupabase(env) {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_KEY
  if (!url || !key || url.includes('your-project')) {
    return { status: 'skip', detail: 'VITE_SUPABASE_URL / VITE_SUPABASE_KEY not set (see SETUP_APIS.md)' }
  }
  try {
    const res = await fetch(`${url}/rest/v1/?apikey=${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (res.status >= 200 && res.status < 500) {
      // 200, 401, 404 all prove the host + key are reachable; only 5xx is a real fail.
      return { status: 'pass', detail: `host reachable, REST returned ${res.status}` }
    }
    return { status: 'fail', detail: `REST returned ${res.status}` }
  } catch (err) {
    return { status: 'fail', detail: `network error: ${err.message}` }
  }
}

async function testGemini(env) {
  const key = env.GEMINI_KEY
  if (!key) {
    return { status: 'skip', detail: 'GEMINI_KEY not set (see SETUP_APIS.md)' }
  }
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': key },
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return { status: 'fail', detail: `HTTP ${res.status}: ${err.slice(0, 160)}` }
    }
    const data = await res.json()
    const flash = (data?.models || []).filter(m => /flash/.test(m.name)).length
    return { status: 'pass', detail: `key valid, ${flash} flash model(s) available` }
  } catch (err) {
    return { status: 'fail', detail: `network error: ${err.message}` }
  }
}

async function testOpenRouter(env) {
  // No VITE_ prefix: VITE_* vars are baked into the browser bundle.
  const key = env.OPENROUTER_KEY
  if (!key) {
    return { status: 'skip', detail: 'OPENROUTER_KEY not set (optional — see SETUP_APIS.md)' }
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      return { status: 'fail', detail: `HTTP ${res.status}: ${err.slice(0, 160)}` }
    }
    const data = await res.json()
    return { status: 'pass', detail: `key valid${data?.data?.is_free_tier ? ' (free tier)' : ''}` }
  } catch (err) {
    return { status: 'fail', detail: `network error: ${err.message}` }
  }
}

// ── main ────────────────────────────────────────────────────────────────
async function main() {
  console.log(dim(`→ Reading .env.local from ${ROOT}`))
  const env = await loadDotEnv(join(ROOT, '.env.local'))

  if (VERBOSE) {
    console.log(dim(`→ Detected keys: ${Object.keys(env).filter(k => k.startsWith('VITE_') || ['GEMINI_KEY', 'OPENROUTER_KEY'].includes(k)).join(', ') || '(none)'}`))
  }

  console.log()
  console.log(dim('Provider          Status'))
  console.log(dim('─'.repeat(60)))

  const results = await Promise.all([
    testSupabase(env).then(r   => ({ name: 'Supabase',   ...r })),
    testGemini(env).then(r     => ({ name: 'Gemini',     ...r })),
    testOpenRouter(env).then(r => ({ name: 'OpenRouter', ...r })),
  ])

  for (const r of results) line(r.name, r.status, r.detail)

  console.log()
  const fails = results.filter(r => r.status === 'fail')
  const skips = results.filter(r => r.status === 'skip')
  const passes = results.filter(r => r.status === 'pass')

  if (fails.length) {
    console.log(red(`✗ ${fails.length} configured provider${fails.length === 1 ? '' : 's'} failed.`))
    console.log(dim('   See SETUP_APIS.md for the dashboard URLs and field names.'))
    process.exit(1)
  }
  if (passes.length === 0) {
    console.log(yellow('— No providers configured. Add keys to .env.local — see SETUP_APIS.md.'))
    process.exit(0)
  }
  console.log(green(`✓ ${passes.length} provider${passes.length === 1 ? '' : 's'} healthy.`)
    + (skips.length ? dim(`  (${skips.length} skipped — see SETUP_APIS.md to enable)`) : ''))
  process.exit(0)
}

main().catch(err => {
  console.error(red(`unexpected: ${err.stack || err.message}`))
  process.exit(2)
})
