#!/usr/bin/env node
import { execSync } from 'child_process';
import { watch } from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const debounceMs = 5000;
const ignoredPaths = ['.git', 'node_modules', 'dist', 'build', '.DS_Store'];
let timer;
let isSyncing = false;

function shouldIgnore(filePath) {
  if (!filePath) return true;
  const normalized = filePath.replace(/\\\\/g, '/');
  return ignoredPaths.some((ignore) => normalized.includes(ignore));
}

function runGit(command) {
  return execSync(command, { cwd: repoRoot, stdio: 'pipe' }).toString().trim();
}

function syncRepo() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const status = runGit('git status --porcelain');
    if (!status) {
      isSyncing = false;
      return;
    }

    console.log('[auto-sync] staging all changes...');
    runGit('git add -A');

    const commitMessage = `Auto save ${new Date().toISOString()}`;
    console.log(`[auto-sync] committing: ${commitMessage}`);
    try {
      runGit(`git commit -m "${commitMessage}"`);
    } catch (error) {
      const message = error.message || '';
      if (message.includes('nothing to commit') || message.includes('no changes added to commit')) {
        console.log('[auto-sync] no commit created because nothing changed.');
      } else {
        console.error('[auto-sync] commit failed:', message);
        isSyncing = false;
        return;
      }
    }

    console.log('[auto-sync] pushing to remote...');
    runGit('git push');
    console.log('[auto-sync] sync complete.');
  } catch (error) {
    console.error('[auto-sync] sync error:', error.message || error);
  } finally {
    isSyncing = false;
  }
}

function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(syncRepo, debounceMs);
}

console.log('[auto-sync] watching repository for file changes...');
watch(repoRoot, { recursive: true }, (eventType, filename) => {
  if (!filename || shouldIgnore(filename)) return;
  scheduleSync();
});

process.on('SIGINT', () => {
  console.log('\n[auto-sync] stopped.');
  process.exit(0);
});
