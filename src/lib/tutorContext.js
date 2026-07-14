// Pure helper: turns a `buildLearnerProfile()` result into a one-line hint
// appended to the AI tutor's context note. See
// docs/2026-05-26-adaptive-scaffolding-design.md for the profile shape.
//
// Deliberately silent for the common case (`medium` / absent profile) so
// nothing changes for most students — only nudge the prompt when the
// learner is clearly struggling (heavy) or clearly coasting (light).
const NOTE = {
  heavy: '\nScaffold level: heavy (student is struggling — smaller steps, one idea at a time, more checks).',
  light: '\nScaffold level: light (student is strong — you can be brisk).',
}

export function learnerScaffoldNote(profile) {
  return (profile && NOTE[profile.scaffoldLevel]) || ''
}
