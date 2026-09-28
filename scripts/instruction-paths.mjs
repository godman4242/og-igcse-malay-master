// VENDORED from agent-harness harness/instruction-paths/instruction-paths.mjs @62cd5e2 — fix it THERE
// (it has the tests), then re-copy. Config: instruction-paths.config.json at the repo root.
/**
 * INSTRUCTION-PATH GATE — every repo path your standing instruction files name must exist.
 *
 * WHY: prose is not compiled. A CLAUDE.md line told every session a contract auto-loaded from a
 * file that had been deleted nine days earlier, and every other gate stayed green. An agent reads
 * that line as fact. This gate turns "the docs point at something that moved" into a red commit.
 *
 * WHY IT IS THIS SMALL — the scope IS the design, and it was measured. A first version also read
 * the session handoff file (RESUME_HERE.md): 24 unresolved tokens, ONE real defect (4% precision),
 * because a scratchpad rewritten every session is full of templates (`src/<Name>.ts`) and run-scoped
 * fragments. Policing it is how a gate becomes the thing people bypass with --no-verify. So it reads
 * only the STANDING rule files (CLAUDE.md and friends: rules that change rarely), and it has NO
 * exemption list: an exemption list is a hiding place, so a red is always real.
 *
 * WHAT IT DOES NOT CLAIM: that a named path RESOLVES, not that the sentence around it is true.
 *
 * Config: instruction-paths.config.json in the directory you run from:
 *   { "files": ["CLAUDE.md", "src/CLAUDE.md"],        // the standing rule files (each must exist)
 *     "roots": ["src", "tests", "scripts", "docs"] }  // top-level dirs, so an extensionless
 *                                                     // `scripts/gate` is still read as a path
 * Run:  node instruction-paths.mjs            exit 0 = every path resolves, 1 = problems (listed)
 * Zero dependencies. Node 20+.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const TOKEN = /`([^`\n]+)`/g;
const PATHY = /^[A-Za-z0-9._~/@-]+$/;
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|sh|py|yml|yaml|html|css|toml)$/;

/**
 * Path-ish backticked tokens. Bare filenames (no slash) are out of scope: prose is full of them
 * and they carry no location to check. `~`-rooted tokens are out of scope too: they name files on
 * one machine, and resolving them against $HOME would make this gate GREEN over its founding
 * defect (the deleted repo file still existed under ~/). A trailing `:12` or `:12-40` is dropped.
 * A token resolves from the repo root OR from the instruction file's own folder.
 */
export function extract(text, roots) {
  const out = [];
  for (const m of text.matchAll(TOKEN)) {
    const t = (m[1] ?? '').trim().replace(/:\d+(-\d+)?$/, '');
    if (!t.includes('/') || !PATHY.test(t) || !/[A-Za-z0-9]/.test(t)) continue;
    if (t.startsWith('~') || /^(https?|git@)/.test(t)) continue;
    const first = t.split('/')[0] ?? '';
    if (!EXT.test(t) && !t.endsWith('/') && !roots.includes(first)) continue;
    out.push(t);
  }
  return out;
}

/**
 * Batched `git check-ignore --stdin`. Exit 1 = "none matched" and still a result. Anything else
 * (not a git repo, EPIPE on a huge input) FAILS CLOSED with a legible reason: if we cannot tell
 * what is gitignored, we cannot tell a local-only path from a dead one.
 */
function gitIgnored(root, tokens) {
  const uniq = [...new Set(tokens)];
  if (uniq.length === 0) return { ignored: new Set(), error: null };
  try {
    const out = execFileSync('git', ['-C', root, 'check-ignore', '--stdin'], { input: uniq.join('\n'), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ignored: new Set(out.split('\n').filter(Boolean)), error: null };
  } catch (e) {
    if (e.status === 1) return { ignored: new Set((e.stdout ?? '').split('\n').filter(Boolean)), error: null };
    return { ignored: new Set(), error: String(e.stderr || e.message || e).split('\n')[0] || 'unknown' };
  }
}

export function check(root, { files, roots }) {
  const missingFiles = files.filter((f) => !existsSync(join(root, f)));
  const all = files.filter((f) => !missingFiles.includes(f))
    .flatMap((file) => extract(readFileSync(join(root, file), 'utf8'), roots).map((token) => ({ file, token })));
  const { ignored, error: gitError } = gitIgnored(root, all.map((t) => t.token));
  const ignoredSkipped = all.filter((t) => ignored.has(t.token)).map((t) => t.token);
  const tokens = all.filter((t) => !ignored.has(t.token));
  // A nested rule file (src/lib/CLAUDE.md) may name paths relative to its own folder (`guide/`),
  // exactly as an agent reading it in that folder would resolve them. Either anchor counts.
  const resolves = ({ file, token }) => existsSync(join(root, token)) || existsSync(join(root, dirname(file), token));
  const dead = tokens.filter((t) => !resolves(t)).map(({ file, token }) => `${file} -> ${token}`);
  const missingRoots = roots.filter((r) => !existsSync(join(root, r)));
  // A file yielding no tokens is indistinguishable from one never read: the broken-extractor
  // guard. Deliberately not a count floor (a second copy of a number every prose edit drifts).
  const emptyFiles = files.filter((f) => !missingFiles.includes(f) && !all.some((t) => t.file === f));
  return { tokens, dead, ignoredSkipped, missingRoots, missingFiles, emptyFiles, gitError };
}

export function problems(r) {
  const out = [];
  if (r.gitError !== null) out.push(`git check-ignore could not run (${r.gitError}) — cannot tell a local-only path from a dead one`);
  for (const f of r.missingFiles) out.push(`config names an instruction file that does not exist: ${f}`);
  for (const d of r.dead) out.push(`names a path that does not exist: ${d}`);
  for (const f of r.emptyFiles) out.push(`${f} yielded no path tokens — the extractor is broken, or the file moved`);
  for (const m of r.missingRoots) out.push(`roots entry \`${m}\` does not exist — a top-level directory was renamed`);
  return out;
}

export function loadConfig(root) {
  const p = join(root, 'instruction-paths.config.json');
  if (!existsSync(p)) throw new Error(`no instruction-paths.config.json in ${root}`);
  const c = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(c.files) || c.files.length === 0 || !Array.isArray(c.roots)) {
    throw new Error('instruction-paths.config.json needs a non-empty "files" array and a "roots" array');
  }
  return c;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = process.cwd();
  let r;
  try { r = check(root, loadConfig(root)); } catch (e) { process.stdout.write(`❌ ${e.message}\n`); process.exit(1); }
  process.stdout.write(`\nINSTRUCTION PATHS\npath tokens checked ${r.tokens.length}\ngitignored, skipped ${r.ignoredSkipped.length}  (local-only trees a clean clone does not have)\n`);
  const probs = problems(r);
  if (probs.length > 0) {
    process.stdout.write(`\n❌ ${probs.length} problem(s):\n${probs.map((p) => `   - ${p}`).join('\n')}\n\n`);
    process.exit(1);
  }
  process.stdout.write('\n✅ every path an instruction file names resolves.\n\n');
}
