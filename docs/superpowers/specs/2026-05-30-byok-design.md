# Bring-Your-Own-Key (BYOK) v1 — Design Spec

**Status:** APPROVED design (Option 1 + polish) — ready for implementation plan
**Date:** 2026-05-30
**Author:** Claude + Kheshav (brainstorm session, on mobile)
**Follows:** the Speaking Progression spec's deferred "Feature B" + its inert
`aiCoachAvailable()` hook.

---

## 1. Goal (plain terms)

Let any user paste **their own OpenRouter API key**. When set, the app's AI runs
on **their** key — billed to them, stored only on their device — so the owner
pays nothing for AI. This also unlocks the **Speaking AI-coach summary** (the
inert button left in the Speaking Progress widget).

Why OpenRouter only: OpenRouter is called **directly from the browser** (clean
BYOK). Gemini here is **server-proxied** (`/api/gemini`), so a user can't BYO a
Gemini key without re-exposing a secret or reworking the server. Instead, when a
user has their own OpenRouter key, we **route the two Gemini-only features
through OpenRouter** as well — so one key covers everything.

## 2. Guiding rules (what makes it "perfect")

1. **No regression for non-key users.** If no user key is set, every feature
   behaves EXACTLY as today (server Gemini / env OpenRouter). The user key only
   ever *adds* capability. Routing is **strict opt-in** (gated on a *user* key,
   not the env key).
2. **Secrets never leave the device.** The key lives in its **own localStorage
   entry** — NOT in the Zustand store, so it can never enter the cloud state
   blob. No `STORE_VERSION` bump, no `useStore.js` edit, no sync risk.
3. **Verifiable.** A "Test key" button tells the user ✓ working / ✗ invalid so a
   typo never fails silently.
4. **Safety nets preserved.** Existing fallbacks stay: OpenRouter rotates its
   free models; on failure the call falls back to the server/expert system; the
   50/day client cap and circuit breaker remain.
5. **New AI cost is BYOK-gated.** The brand-new coach summary requires a *user*
   key (`aiCoachAvailable()` ⇒ user key present), so it never adds owner cost.

## 3. Current AI plumbing (facts)

- `src/lib/openrouter.js` — `isOpenRouterAvailable()` + `callOpenRouter()` read
  `import.meta.env.VITE_OPENROUTER_KEY`; browser-direct. Also `chatWithFreeModel`.
  Consumers: **CikguBot**, **WritingTutor** (when provider = openrouter).
- `src/lib/gemini.js` — `callGemini()` posts to **`/api/gemini`** (server key);
  `isGeminiAvailable()` always `true`. Gemini-only call sites:
  **`speakingGrader.js` `aiGrade`** and **`Comprehension.jsx`**.
- No production secret is added client-side by this feature.

## 4. Architecture (5 units; store untouched)

### 4.1 `src/lib/openrouter.js` — own the user key (localStorage)

Add a device-local user-key layer; make availability/calls prefer it.

```js
const USER_KEY_STORAGE = 'igcse-openrouter-key'

let userKey = (() => {
  try { return localStorage.getItem(USER_KEY_STORAGE) || null } catch { return null }
})()

export function setUserOpenRouterKey(k) {
  userKey = (k && k.trim()) || null
  try {
    if (userKey) localStorage.setItem(USER_KEY_STORAGE, userKey)
    else localStorage.removeItem(USER_KEY_STORAGE)
  } catch { /* private mode / SSR — in-memory only */ }
}

export function getUserOpenRouterKey() { return userKey }
export function hasUserOpenRouterKey() { return !!userKey }

function resolveKey() { return userKey || import.meta.env.VITE_OPENROUTER_KEY || null }
```

- `isOpenRouterAvailable()` → `!!resolveKey()` (now true when EITHER a user key
  or the env key exists — additive, no regression).
- `callOpenRouter()` → use `resolveKey()` instead of the bare env read.
- `chatWithFreeModel` (if it reads the env key) → same `resolveKey()` swap.

Net effect: **Cikgu + Writing-tutor-via-OpenRouter start working on the user's
key with zero changes to those files.**

### 4.2 `src/lib/aiText.js` — provider router (NEW)

One place that decides which provider a *text* AI call uses.

```js
import { hasUserOpenRouterKey, callOpenRouter } from './openrouter'
import { callGemini } from './gemini'

// Strict opt-in: only a USER OpenRouter key reroutes Gemini-default features
// (so non-key users are unchanged). On OpenRouter error, fall back to the
// server Gemini proxy so the user never hits a dead end.
export async function callTextAI(opts) {
  if (hasUserOpenRouterKey()) {
    try { return await callOpenRouter(opts) }
    catch { /* fall through to the server default */ }
  }
  return callGemini(opts)
}
```

`opts` is the shared `{ systemPrompt, messages, maxTokens, signal }` shape;
both providers return a string, so existing JSON-parsing at call sites is
unaffected.

### 4.3 Route the two Gemini-only features through `callTextAI`

- `src/lib/speakingGrader.js` `aiGrade` — swap the `callGemini({...})` at ~L270
  for `callTextAI({...})` (import from `./aiText`). The `\`\`\`json` fence
  cleanup + `JSON.parse` + `{ error:'parse' }` fallback stay; the heuristic
  always renders regardless, so a weaker free-model JSON can't break the page.
- `src/pages/Comprehension.jsx` — swap the `callGemini({...})` at ~L98 for
  `callTextAI({...})`.

No other Gemini call sites change. WritingTutor already has a provider toggle;
CikguBot already branches on `isOpenRouterAvailable()`.

### 4.4 `src/pages/Settings.jsx` — the key UI

Add a section near the existing AI-provider picker: **"Use your own AI key
(optional)"**.

- A password `<input>` bound to `getUserOpenRouterKey()` /
  `setUserOpenRouterKey()`.
- **Save** (persists), **Clear** (removes), **Test** button → makes a tiny
  `callOpenRouter({ systemPrompt:'ping', messages:[{role:'user',content:'Reply OK'}], maxTokens: 5 })`
  and shows ✓ working / ✗ invalid (catch → invalid).
- Privacy copy: *"Stored only in this browser, never sent to our servers. Get a
  free key at openrouter.ai."*
- Link/explanation that this powers Cikgu, Writing, Speaking feedback,
  Comprehension, and the Speaking coach.

### 4.5 Speaking AI-coach summary (the payoff)

- `src/lib/speakingCoach.js` (NEW) — pure prompt builder + the call:
  ```js
  export function buildCoachPrompt(series, weakness, lang) // -> { systemPrompt, userMsg } (pure, testable)
  export async function speakingCoachSummary({ series, weakness, lang, signal })
    // calls callTextAI(buildCoachPrompt(...)) and returns a short string
  ```
  The prompt feeds the already-computed trend (avg/best/delta/bands) + top
  weakness and asks for: one encouraging line on trajectory + the single most
  useful thing to drill next. Bilingual.
- `src/components/dashboard/SpeakingProgress.jsx`:
  - `aiCoachAvailable()` → `hasUserOpenRouterKey()` (import from openrouter).
  - The existing inert button becomes live: on click, call
    `speakingCoachSummary`, show a loading state, render the returned text in
    the card (and a friendly error fallback). Telemetry: `speaking_coach_clicked`
    (Enhanced tier).

## 5. Data flow

```
Settings → setUserOpenRouterKey(key) → localStorage('igcse-openrouter-key')
                                     → openrouter.js userKey (in-memory)

any AI feature:
  Cikgu / Writing(OpenRouter)  → isOpenRouterAvailable() (now true) → callOpenRouter(resolveKey)
  speaking grade / comprehension → callTextAI → hasUserOpenRouterKey()?
                                      yes → callOpenRouter(user key)   [free for owner]
                                      no  → callGemini (server)         [unchanged]
  speaking coach (NEW)          → aiCoachAvailable()=hasUserOpenRouterKey()
                                  → speakingCoachSummary → callTextAI
```

## 6. Error handling & edge cases

- **No key:** everything behaves as today. Coach button hidden.
- **Bad key:** Test button reports ✗; live calls throw → `callTextAI` falls back
  to Gemini for routed features (no dead end); Cikgu/Writing surface their
  existing "couldn't reach AI" messages.
- **Private-mode / SSR (no localStorage):** `setUserOpenRouterKey` degrades to
  in-memory; never throws.
- **Coach parse/network failure:** show a one-line "couldn't generate a summary
  right now" and keep the rest of the widget intact.
- **Rate/cost:** existing 50/day cap + circuit breaker still apply.

## 7. Testing

- **Unit** (`src/lib/__tests__/`):
  - openrouter key layer: `setUserOpenRouterKey` sets/clears; `hasUserOpenRouterKey`
    reflects it; `isOpenRouterAvailable` true with a user key and false with
    neither (mock `import.meta.env`).
  - `callTextAI`: routes to OpenRouter when a user key is set; to Gemini when
    not; falls back to Gemini when OpenRouter throws (inject mocks).
  - `buildCoachPrompt`: includes the band trend + weakness; bilingual switch.
- **UI** (Settings key field + Test, widget coach button): build + lint + manual
  browser check (can't automate the live key here).
- Gates: `npm run build` (no material `index` regression; aiText/speakingCoach
  ride the lazy chunks that consume them), `npm run lint` (0 errors), `npm run
  test:run` (all pass).

## 8. Explicitly deferred

- BYO **Gemini** key / client-direct Gemini transport (re-exposes a secret —
  rejected). Claude edge-function stays owner-side.
- **Routing `fetchAIGrade` (English auto writing band score) through BYOK —
  deliberately NOT done.** It relies on Gemini's strict-JSON mode
  (`responseMimeType`), which OpenRouter lacks, and `gemini.js` importing
  `aiText.js` is a circular import (`aiText` imports `gemini`). Rerouting would
  trade reliable JSON grading for flakier free-model output for marginal cost
  savings. If ever wanted: lift the prompt-building into a `writingGrader.js`
  that imports `callTextAI` (breaks the cycle) + add robust JSON extraction +
  prefer a non-reasoning free model. The Writing *tutor* chat IS routed.
- A full multi-provider settings matrix (the JCLAW-style page) — YAGNI.
- Per-provider model pickers, usage dashboards.

## 9. Touch surface

| File | Change |
|---|---|
| `src/lib/openrouter.js` | + user-key layer (localStorage); availability/calls use `resolveKey()` |
| `src/lib/aiText.js` | NEW — `callTextAI` router |
| `src/lib/speakingGrader.js` | `aiGrade`: `callGemini` → `callTextAI` |
| `src/pages/Comprehension.jsx` | `callGemini` → `callTextAI` |
| `src/pages/Settings.jsx` | NEW key UI: input + Save/Clear/Test + privacy copy |
| `src/lib/speakingCoach.js` | NEW — `buildCoachPrompt` + `speakingCoachSummary` |
| `src/components/dashboard/SpeakingProgress.jsx` | live AI-coach button |
| `src/lib/__tests__/*` | unit tests for the key layer, router, prompt builder |

**No `STORE_VERSION` bump. No `useStore.js` change. No schema change. No secret
in the cloud blob. No new dependency.**
