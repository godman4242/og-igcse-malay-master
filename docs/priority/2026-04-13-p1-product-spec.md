# P1 Product Spec - Engagement Core

## Objectives
- Improve habit consistency without increasing anxiety.
- Tie motivation to meaningful study behavior.
- Keep all engagement features compatible with offline-first constraints.

## Daily Challenge
- Challenge generated per day from:
  - due FSRS cards
  - weak-topic cards
  - one grammar task quota
- Progress model:
  - `reviewTarget`
  - `grammarTarget`
  - `completedAt`
- Completion rewards:
  - visual celebration
  - XP increment (local metric, sync-ready later)

## Streak 2.0
- Keep current streak counting logic.
- Add freeze inventory:
  - earn at milestones (7, 14, 30, 50, 100)
  - auto-consume on first missed day
- Grace logic:
  - when offline, queue local proof and avoid premature streak reset
  - resolve on reconnect

## Install Funnel
- Capture `beforeinstallprompt`.
- Prompt only after meaningful engagement:
  - at least 3 active study days OR 2 challenge completions.
- Prompt surfaces:
  - dashboard CTA card
  - optional settings entry

## UX Constraints
- No manipulative dark patterns.
- No punitive streak messaging.
- Clear explanation when features are disabled offline.

## Acceptance Criteria
- User can see challenge, progress, and completion state.
- Freeze usage is explicit and reversible only by activity.
- Install prompt never appears on first visit.
