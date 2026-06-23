// pageGuideRoutes.js — the tiny EAGER seam: just the route keys that have a Full
// Page Guide. The header ▶ ("Tour this page") imports ONLY this (zero deps) to
// decide its visibility, so the eager Layout never pulls the heavy lazy
// pageGuides.js content into the index chunk (same pattern as guideState.js).
// A unit test pins this list === Object.keys(PAGE_GUIDES) so it can't drift.
export const PAGE_GUIDE_ROUTES = ['/', '/pdf-reader', '/study', '/smart-study', '/practice', '/roleplay', '/grammar', '/writing', '/comprehension', '/listening', '/speaking', '/import', '/mistakes']
