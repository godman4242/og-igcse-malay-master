// Dependabot pins. `npm audit` listed 5 known vulnerabilities (3 high) on
// 2026-09-29 with nothing to surface them; `.github/dependabot.yml` opens a
// weekly PR that CI gates (build + unit + lint + e2e) before anyone merges.
//
// Two rules the bot must never break:
//  - `@huggingface/transformers` stays on v3 (package.json `^3.x`): v4
//    deadlocks in the browser (CLAUDE.md), which no gate here would catch.
//  - Dependabot PRs get NO Actions secrets (GitHub docs, "Troubleshooting
//    Dependabot on GitHub Actions"), so the Claude review job would fail red
//    on every one of them — it must skip `dependabot[bot]`.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { load } from 'js-yaml'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

describe('dependabot config', () => {
  const cfg = load(read('.github/dependabot.yml'))
  const npm = cfg.updates.find((u) => u['package-ecosystem'] === 'npm')

  it('watches npm and GitHub Actions weekly', () => {
    expect(cfg.version).toBe(2)
    const ecosystems = cfg.updates.map((u) => u['package-ecosystem']).sort()
    expect(ecosystems).toEqual(['github-actions', 'npm'])
    for (const u of cfg.updates) {
      expect(u.directory).toBe('/')
      expect(u.schedule.interval).toBe('weekly')
    }
  })

  it('never proposes @huggingface/transformers v4 while package.json pins v3', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.dependencies['@huggingface/transformers']).toMatch(/^\^3\./)
    const rule = (npm.ignore || []).find((r) => r['dependency-name'] === '@huggingface/transformers')
    expect(rule?.['update-types']).toEqual(['version-update:semver-major'])
  })
})

describe('Claude PR review workflow', () => {
  it('skips Dependabot PRs (they get no secrets, so the job would fail red)', () => {
    const wf = load(read('.github/workflows/claude-code-review.yml'))
    expect(wf.jobs['claude-review'].if).toMatch(/github\.actor != 'dependabot\[bot\]'/)
  })
})
