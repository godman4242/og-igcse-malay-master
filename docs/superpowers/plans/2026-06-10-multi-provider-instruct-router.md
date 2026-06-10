# Multi-provider AI key router — Implementation plan (2026-06-10)

Spec: `docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md`.
TDD, **pure logic first**. Surgical diffs — the `instruct.js` public API
(`hasInstructProvider`/`callInstruct`) must not change; `PDFReader.jsx` gets **zero edits**.
Task 6 (Ollama) is the **detachable cut line** if the session runs long — Tasks 1–5 + 7 ship a
complete OpenRouter+Gemini router on their own.

Hook points (verified live 2026-06-10):
- `src/lib/instruct.js` — `hasInstructProvider()` (`:20`), `callInstruct()` (`:30`); sole consumer
  `src/pages/PDFReader.jsx` (`:38` import, `:133` `ladder`, `:643` call).
- `src/lib/openrouter.js` — BYOK pattern to mirror: `USER_KEY_STORAGE` + module-cached key
  (`:136-148`), `hasUserOpenRouterKey` (`:157`), `verifyOpenRouterKey` auth-only (`:188`),
  `callOpenRouter` (`:217`), discovery `pickFreeModels`/`getFreeModels` + fallback (`:42-128`).
- `src/lib/gemini.js` — request shaping to mirror for the BYOK adapter: `toGeminiContents` (`:33`),
  `systemInstruction`/`maxOutputTokens` body (`:43-53`), typed `makeError` causes (`:18`). The
  `/api/gemini` proxy itself is NOT touched.
- `src/pages/Settings.jsx` — `OpenRouterKeyField` (`:713-792`), `#byok` deep-link effect (`:724`),
  section mount (`:992`), key-restriction note (`:859`).
- `src/components/Layout.jsx` — global toast mounting pattern (`MistakeToast` `:237`,
  `MistakePromotedToast` `:240`).
- Telemetry: `trackEvent` (used app-wide; events mirror to the `telemetry_events` table).

---

## Task 1 — `src/lib/instructProviders/gemini.js` (pure parts, TDD)
**Test first** (`src/lib/instructProviders/__tests__/gemini.test.js`):
- Key slot: `setUserGeminiKey`/`getUserGeminiKey`/`hasUserGeminiKey` — trims, empty→removes,
  private-mode (throwing localStorage) keeps in-memory value (mirror OpenRouter behavior).
- `buildGeminiRequest({systemPrompt, messages, maxTokens})` → body with `contents` (role
  `assistant`→`model`, others→`user`), `systemInstruction` only when systemPrompt set,
  `generationConfig.maxOutputTokens`.
- `parseGeminiResponse(json)` → joined `candidates[0].content.parts[*].text`; empty/missing/
  safety-blocked → throws `cause:'empty'`.
- `pickGeminiModels(json)` (pure): filters `models[*]` to ids supporting `generateContent` whose
  name contains `flash`, strips the `models/` prefix, dedupes, caps; garbage/empty input → `[]`.
- `getGeminiModels({signal, now})`: fresh (<24h) `igcse-gemini-models` cache wins; live fetch
  caches; failure → `['gemini-3.5-flash']` fallback; AbortError propagates (mirror
  `getFreeModels`).
- `callGeminiByok({systemPrompt, messages, maxTokens, signal})` (mock `fetch`): POSTs the NATIVE
  endpoint `…/v1beta/models/<model>:generateContent`, key in **`x-goog-api-key` header**, key
  NEVER in the URL; 429 → throws `cause:'quota'`; non-ok → `'http'`; network → `'network'`;
  no key → `'no_key'`; AbortError raw.
- `verifyGeminiKey(key, {signal})`: GET `/v1beta/models` with the header; 400/401/403 → throws
  "Invalid"; other non-ok → error with status; ok → resolves true. Never a completion.
**Then implement** to green. Module is standalone — no `useStore` import (greppable security bar).

## Task 2 — `src/lib/instructProviders/openrouter.js` (thin adapter, TDD)
**Test first**: adapter object `{id:'openrouter', label, hasKey, call, verify}` — `hasKey()`
delegates to `hasUserOpenRouterKey` (env key still never counts — stub both states), `call`
forwards args to `callOpenRouter` and maps a 429-ish failure (`message` contains `: 429`) to
`cause:'quota'` (wrap, don't swallow; AbortError raw), `verify` delegates to
`verifyOpenRouterKey`.
**Then implement.** No change to `src/lib/openrouter.js` itself.

## Task 3 — router in `src/lib/instruct.js` (TDD, public API frozen)
**Test first** (extend `src/lib/__tests__/instruct.test.js`; stub the adapter modules):
- `hasInstructProvider()` true iff ANY adapter `hasKey()`; existing v1 tests keep passing with
  only-OpenRouter configured.
- Ordering: auto = openrouter → gemini → ollama (registry order, configured only);
  `igcse-instruct-preferred` = an id → that adapter first, rest keep auto-order; `'auto'`/unset/
  unknown id → pure auto-order.
- `callInstruct`: first configured success → its string, no switch event; first throws
  (`'quota'`) → second tried, success → resolves AND `subscribeInstructSwitch` cb fires once with
  `{from:'openrouter', to:'gemini', cause:'quota'}`; all throw → rejects with the LAST error;
  AbortError from any adapter → rethrows immediately, no further adapters, no cooldown, no event.
- Cooldowns (inject `now`): after a failure the adapter is skipped while cooling; cooldown expiry
  → tried again; consecutive `'quota'` failures double the cooldown (120s → 240s → … cap 30 min);
  success resets it; ALL configured cooling → they are tried anyway (never dead-end untried).
- `subscribeInstructSwitch` returns an unsubscribe fn; unsubscribed cb never fires. Export a
  test-only `__resetInstructRouter()` to clear cooldowns/listeners between tests.
**Then implement.** Keep the file's header comment accurate (it documents the seam contract).

## Task 4 — `src/components/InstructSwitchToast.jsx` + Layout mount
- Component subscribes via `subscribeInstructSwitch` on mount (unsubscribe on unmount); shows ~6s:
  "⚡ {fromLabel} hit a limit — switched to {toLabel}" + Link "AI settings →" → `/settings#byok`;
  throttle one toast per from→to pair per 60s; `aria-live="polite"`; dismiss button; no
  `Date.now()` in render (event timestamps come from the router payload); `var(--color-*)` only.
- Mount in `Layout.jsx` beside `MistakeToast` (`:237`). Fire `trackEvent('instruct_provider_switch',
  {from, to, cause})` in the router (ids only — never key material).
- Covered by the Task 7 e2e (presentational component, mirror `MistakePromotedToast`'s testing
  approach).

## Task 5 — Settings "AI providers" section (surgical refactor)
- Extract the field chrome of `OpenRouterKeyField` (`Settings.jsx:713-792`) into a local
  `ProviderKeyCard` (label, blurb, input, Save/Remove/Test button states) — the OpenRouter card
  keeps its exact behavior + the `#byok` deep-link (anchor moves to the section wrapper).
- Add the **Gemini card** (same paste-key UX; blurb: free key at aistudio.google.com/apikey;
  Test = `verifyGeminiKey`).
- Add the **preferred-provider picker** (Auto recommended / per configured provider chips) —
  rendered only when ≥2 adapters configured; writes `igcse-instruct-preferred`.
- Extend the key-restriction note (`:859`) with the Gemini line (restrict to Generative Language
  API).
- Local component state only — nothing enters the Zustand store.

## Task 6 — Ollama (DETACHABLE — cut here if long)
- `src/lib/instructProviders/ollama.js` (TDD like Task 1): URL slot (http/https validation,
  default `http://localhost:11434`) + model slot; `hasKey()` = both set; `call()` → POST
  `<url>/api/chat` `{model, messages:[{role:'system',…},…], stream:false,
  options:{num_predict:maxTokens}}`, parse `message.content`; `verify()` → GET `/api/version`;
  `listOllamaModels()` → GET `/api/tags` parse. Register in the router (last in auto-order — the
  Task 3 ordering tests already anticipate it via stubs).
- Settings: collapsed **"Advanced — local AI on your computer (desktop)"** disclosure, hidden on
  small/touch viewports; URL field + Connect test + model dropdown (`/api/tags`) + 3-step setup
  note (install Ollama → set `OLLAMA_ORIGINS` to the site origin (or `*`) + restart → accept
  Chrome's "local network" permission prompt).

## Task 7 — e2e + verification (GO WILD)
- `tests/e2e/instruct-router.spec.js` (bindStore + live-`?t=`-URL per
  `[[project_e2e_config_invocation]]`; localStorage seeding for keys): ONLY a Gemini key (stub
  fetch) → PDF sentence ladder appears (seam-wide gating, not OpenRouter-specific); primary 429 →
  fallback succeeds + switch toast shows, links to `/settings#byok`, throttles on spam; **no
  keys → sentence reveal byte-identical to shipped** (existing option-f suite must stay green
  untouched); Settings: save/remove/test all cards, garbage key, spam Save/Test, picker appears
  only at ≥2, `#byok` deep-link scrolls; 390×844 hides the Ollama card; offline → graceful; theme
  swap; light + dark screenshots.
- Gate: `npm run build` (chunk bars hold) · `npm run lint` (0 errors, no new warnings) ·
  `npm run test:run` (697+ green) · `npm run test:e2e` (SOLO per
  `[[project_e2e_config_invocation]]`).

## Commit & ship
- Atomic commits per task (pre-commit gate runs build→test→lint and `git add -A` — keep the tree
  task-clean before each commit).
- Final commit refreshes `RESUME_HERE.md` (next up: Option F fast-follows / quality-translate-via-
  router decision / multimodal). Repo auto-pushes; confirm PUBLIC `upg-…vercel.app` READY.
- Bounded self-review of the Settings + router diff before the final commit; honest verdict.
