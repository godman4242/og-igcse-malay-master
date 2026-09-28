import { it, expect } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { check, problems, loadConfig } from '../../../scripts/instruction-paths.mjs'

// Every repo path the standing rule files (CLAUDE.md + folder CLAUDE.md + .claude/rules) name must
// resolve — prose isn't compiled, so a moved file leaves a false rule that every agent obeys.
// The pre-commit hook runs the same gate on docs-only commits too; this covers CI + --no-verify.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

it('every repo path a standing rule file names resolves', () => {
  expect(problems(check(root, loadConfig(root)))).toEqual([])
})
