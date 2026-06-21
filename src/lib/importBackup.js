// Pure guard for the Settings "Restore from backup" path.
//
// `importData` (useStore.js) OVERWRITES the whole store — every backup key is
// replaced, and any key missing from the file resets to its default. So a
// malformed-but-parseable file (e.g. `{}`, a bare array, or unrelated JSON)
// would silently WIPE the user's entire deck and progress. A real backup is a
// plain object whose `cards` field is an array.
//
// Kept tiny + pure so it can be unit-tested without mounting Settings.
// (Added after the 2026-06-21 workflow audit flagged silent import data-loss.)
export function isValidBackup(data) {
  return (
    !!data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Array.isArray(data.cards)
  )
}
