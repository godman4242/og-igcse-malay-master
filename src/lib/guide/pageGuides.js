// pageGuides.js — Full Page Guide content (LAZY: loaded only when ▶ is tapped).
// PURE data + buildPageSteps. Structure (selectors/order) is hand-derived from
// the live page; prose is hand-authored + verified against the code (no AI,
// no confident-wrong — the load-bearing learning-tool rule). Anchors are
// [data-guide="{page}-{control}"] added to the page component (or a reused
// [data-tour="…"]). A missing anchor is skipped by the engine — never dead-ends.
//
// Step shape: { selector, title, body, example?, side?, align?, arrow? }
//   arrow:'none' → a centered intro/outro step with no pointer.

export const PAGE_GUIDES = {
  '/': [
    {
      arrow: 'none',
      title: 'Tour: your home base 🏠',
      body: 'A 30-second look at everything on your dashboard and what each part is for. Tap Next.',
    },
    {
      selector: '[data-tour="dashboard-cta"]',
      title: 'Smart Session',
      body: 'Your daily adaptive cycle — short thematic rounds that move you from recognising a word to producing it, focused on what you owe today.',
      example: 'Tap it each morning for a ~10-minute mixed round.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-stats"]',
      title: 'Your deck at a glance',
      body: 'Your key numbers at a glance — due cards, your streak, and words mastered.',
      example: 'Due Now: 12 → tap it to start clearing them right now.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-quick-actions"]',
      title: 'Jump straight in',
      body: 'Three one-tap shortcuts: Review your due cards, Mix an interleaved round, or Speak with a roleplay.',
      example: 'Tap Mix for one round blending vocab, grammar and speaking.',
      side: 'top', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-exam"]',
      title: 'Exam Rehearsal',
      body: 'A timed run across reading, writing and speaking that scores your overall Readiness %.',
      example: 'Do one a week and watch your readiness climb before the real paper.',
      side: 'bottom', align: 'center',
    },
    {
      selector: '[data-guide="dashboard-mistakes"]',
      title: 'Mistake Journal',
      body: 'Every slip is logged, and the important ones come back as targeted re-drills until you fix them.',
      example: 'Miss a “ber-” word twice and it queues a drill on exactly that.',
      side: 'bottom', align: 'center',
    },
  ],
}

// Map page content → the engine's step shape (tourSteps), stamping the route so
// the controller treats them as same-route steps (no navigation). Pure.
export function buildPageSteps(route) {
  const steps = PAGE_GUIDES[route]
  if (!Array.isArray(steps)) return []
  return steps.map((s, i) => ({
    id: `page-${route}-${i}`,
    route,
    title: s.title,
    body: s.body + (s.example ? `\n\n${s.example}` : ''),
    ...(s.selector ? { selector: s.selector } : {}),
    ...(s.side ? { side: s.side } : {}),
    ...(s.align ? { align: s.align } : {}),
  }))
}
