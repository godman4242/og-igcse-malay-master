// The $250 cloud credit (Kheshav, 2026-09-30) runs Claude Code on Anthropic's machines against a
// fresh clone of this repo. A commit there must never reach main — main IS the live site — until the
// driver on Kheshav's Mac has re-gated it (docs/sessions/2026-09-30-cloud-credit-driver.md).
//  - .githooks/pre-push: in a cloud session, only the lane branches (and claude/…) may be pushed.
//  - .githooks/post-commit: in a cloud session, never auto-pushes (it would push main).
//  - scripts/cloud/setup.sh: does nothing on a normal machine.
import { describe, it, expect } from 'vitest'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ZERO = '0'.repeat(40)
const SHA = 'a'.repeat(40)
const run = (script, { cloud, stdin = '', path } = {}) => {
  const env = { ...process.env, CLAUDE_CODE_REMOTE: cloud ? 'true' : '' }
  if (path) env.PATH = `${path}:${process.env.PATH}`
  return spawnSync('sh', [script], { input: stdin, env, encoding: 'utf8' })
}
const push = (rref, { cloud, loid = SHA } = {}) =>
  run('.githooks/pre-push', { cloud, stdin: `refs/heads/x ${loid} ${rref} ${ZERO}\n` }).status

describe('pre-push: a cloud session pushes only its lane', () => {
  it.each(['refs/heads/cloud-code', 'refs/heads/cloud-content', 'refs/heads/claude/fix-pdf'])('cloud → %s is allowed', (rref) => {
    expect(push(rref, { cloud: true })).toBe(0)
  })
  it.each(['refs/heads/main', 'refs/heads/master', 'refs/heads/dependabot/x', 'refs/tags/v1'])('cloud → %s is refused', (rref) => {
    expect(push(rref, { cloud: true })).toBe(1)
  })
  it('cloud → deleting main is refused too', () => {
    expect(push('refs/heads/main', { cloud: true, loid: ZERO })).toBe(1)
  })
  it('on Kheshav\'s Mac every push is allowed (the driver promotes to main from here)', () => {
    expect(push('refs/heads/main', { cloud: false })).toBe(0)
  })
})

describe('post-commit: no auto-push from a cloud session', () => {
  const fakeGit = () => {
    const dir = mkdtempSync(join(tmpdir(), 'fakegit-'))
    const log = join(dir, 'calls')
    writeFileSync(join(dir, 'git'), `#!/bin/sh\necho "$@" >> "${log}"\n`)
    chmodSync(join(dir, 'git'), 0o755)
    return { dir, calls: () => { try { return readFileSync(log, 'utf8') } catch { return '' } } }
  }
  it('cloud: the commit is not pushed', () => {
    const g = fakeGit()
    expect(run('.githooks/post-commit', { cloud: true, path: g.dir }).status).toBe(0)
    expect(g.calls()).toBe('')
  })
  it('Mac: the commit is pushed, as before', () => {
    const g = fakeGit()
    run('.githooks/post-commit', { cloud: false, path: g.dir })
    expect(g.calls()).toMatch(/^push/)
  })
})

describe('scripts/cloud/setup.sh', () => {
  it('does nothing outside a cloud session', () => {
    const r = spawnSync('bash', ['scripts/cloud/setup.sh'], { env: { ...process.env, CLAUDE_CODE_REMOTE: '' }, encoding: 'utf8' })
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })
  it('is wired as the SessionStart hook', () => {
    const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'))
    const cmds = settings.hooks.SessionStart.flatMap(h => h.hooks.map(x => x.command))
    expect(cmds.some(c => c.includes('scripts/cloud/setup.sh'))).toBe(true)
  })
})
