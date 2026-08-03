// RLS least-privilege pin for `telemetry_events`.
//
// The SELECT policy was `auth.role() = 'authenticated'`, i.e. EVERY signed-in
// user could read EVERY telemetry row. Measured against live prod
// (sfrpbnmhvhtsgzqwnent) with a fabricated attacker principal:
//
//   BEGIN; SET LOCAL ROLE authenticated;
//   SET LOCAL request.jwt.claims =
//     '{"role":"authenticated","email":"attacker@example.com","sub":"…0001"}';
//   SELECT count(*) FROM telemetry_events;            -- → 26280
//   ROLLBACK;
//
// The rows are not anonymous: `user_id` and `session_id` live INSIDE the JSONB
// payload (there is no user_id COLUMN — the original finding got that detail
// wrong), next to `band`, `score`, `wordCount`, `durationSec`, `scenarioId`,
// `topicId`, `category` and `severity`. That is a per-user learning-performance
// stream keyed by a stable auth uid. Signup is open, so any student who joins
// can read every other student's.
//
// Two copies of this schema exist and have already drifted (the src/config one
// still carries the superseded `WITH CHECK (true)` insert policy). Both are
// asserted here so a fix to one cannot silently leave the other permissive —
// the repo's documented "prod DB lags committed SQL" gotcha, one level up.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const read = (p) => readFileSync(resolve(repo, p), 'utf8')

const SCHEMAS = [
  'supabase/setup_all_tables.sql',
  'src/config/supabase.js', // the exported SCHEMA_SQL copy-paste block
]

// The telemetry SELECT policy body, whichever file it lives in.
const telemetrySelectPolicy = (sql) => {
  const m = sql.match(/CREATE POLICY\s+"[^"]*read telemetry"[\s\S]{0,200}?FOR SELECT\s+USING\s*\(([\s\S]*?)\)\s*;/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

describe('telemetry_events RLS — reading is owner-only, not any-authenticated', () => {
  for (const file of SCHEMAS) {
    it(`${file} does not grant telemetry SELECT to every authenticated user`, () => {
      const policy = telemetrySelectPolicy(read(file))
      expect(policy, `no telemetry SELECT policy found in ${file}`).toBeTruthy()
      expect(policy).not.toMatch(/auth\.role\(\)\s*=\s*'authenticated'/)
    })

    it(`${file} gates telemetry SELECT on the owner's email`, () => {
      expect(telemetrySelectPolicy(read(file))).toMatch(/auth\.jwt\(\)\s*->>\s*'email'/)
    })
  }

  it('keeps telemetry INSERT open — the client fires and forgets, signed in or not', () => {
    // Verified in prod under BEGIN/ROLLBACK: with the owner-only SELECT policy
    // in place an `authenticated` non-owner INSERT still succeeds, because
    // supabase-js `.insert()` with no chained `.select()` never reads back.
    // Losing that would silently kill all telemetry (sendTelemetryEvent
    // swallows its own errors by construction).
    for (const file of SCHEMAS) {
      expect(read(file)).toMatch(/CREATE POLICY\s+"[^"]*insert[^"]*telemetry"/i)
    }
  })
})
