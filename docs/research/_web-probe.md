# Cloud Web-Access Probe — 2026-06-10

## Check 1: WebSearch — `spaced repetition FSRS algorithm 2025`
**WORKS**
Returned 8 real results including links to Neurako, RemNote, QuizCat, DeepWiki, and the open-spaced-repetition GitHub repo, plus a substantive summary of FSRS.

## Check 2: WebFetch — `https://en.wikipedia.org/wiki/Spaced_repetition`
**BLOCKED**
HTTP 403 Forbidden. No page content retrieved.

## Check 3: Bash curl — `https://example.com`
**BLOCKED**
HTTP response code: 403 (expected 200 for example.com; outbound direct TCP appears to be filtered/proxied).

---

WEB BLOCKED
