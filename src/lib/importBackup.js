// Pure guard for the Settings "Restore from backup" path.
//
// `importData` (useStore.js) OVERWRITES the whole store — every backup key is
// replaced, and any key missing from the file resets to its default. So a
// malformed-but-parseable file (e.g. `{}`, a bare array, or unrelated JSON)
// would silently WIPE the user's entire deck and progress. A real backup is a
// plain object with `exportDate` (exportData has stamped it since the first
// commit) and a `cards` array.
//
// Settings' Export JSON (`{exported,…,cards:[{malay,english}]}`) and a shared
// `.deck.json` (`{v,cards}`) also carry a `cards` array — restoring either
// wiped streak/exam date/mistakes (R1 #7, 2026-09-28), so each gets a message
// naming the file that does work.
//
// Kept tiny + pure so it can be unit-tested without mounting Settings.
// (Added after the 2026-06-21 workflow audit flagged silent import data-loss.)

/** null when `data` is a real backup, else the message to show. */
export function backupRejection(data) {
  const obj = !!data && typeof data === 'object' && !Array.isArray(data)
  if (obj && typeof data.exportDate === 'string' && Array.isArray(data.cards)) return null
  if (obj && 'v' in data && Array.isArray(data.cards)) {
    return 'That’s a shared deck — use “Import a Shared Deck (file)”'
  }
  if (obj && 'exported' in data && Array.isArray(data.cards)) {
    return 'That’s a card export — restore needs a “Backup All Data” file'
  }
  return 'Not a valid backup file'
}

export function isValidBackup(data) {
  return backupRejection(data) === null
}
