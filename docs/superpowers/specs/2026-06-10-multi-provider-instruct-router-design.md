# Multi-provider AI key router — Design & Research (2026-06-10)

The router parked in `[[project_idea_ai_provider_router]]` and flagged as the next pass by the
Option F spec (`docs/superpowers/specs/2026-06-10-option-f-l2-simplification-design.md`, decision
F3): users register **their own** Gemini / Ollama / OpenRouter key, the app auto-picks an available
provider, and every instruct feature consumes it through `src/lib/instruct.js` only. Option F built
the seam (`hasInstructProvider()` / `callInstruct()`) precisely so this router could land with
**zero call-site changes**.

| Provider | What the user pastes | Works on | Setup friction | Status |
|---|---|---|---|---|
| OpenRouter | API key (openrouter.ai) | phone + desktop | none (shipped field) | shipped BYOK, becomes adapter 1 |
| **Gemini** | API key (aistudio.google.com/apikey) | **phone + desktop** | none — paste & go | **this spec** |
| **Ollama** | local URL (default `http://localhost:11434`) | **desktop only** | 3 steps (advanced card) | **this spec** |

Researched **plan→research→implement** per `docs/process/feature-development-methodology.md`:
options + assumptions were drafted first, then each load-bearing assumption was adversarially
verified (live docs + live code, 2026-06-10). Companion plan:
`docs/superpowers/plans/2026-06-10-multi-provider-instruct-router.md`.

---

## Problem + who it's for

Instruct features (Option F's simpler-Malay ladder today; quality translate / Cikgu / AI decks as
fast-follows) are gated on exactly one BYOK provider: a user OpenRouter key. Learners who already
have a **Gemini** key (very common — free tier, no card) or run **Ollama** locally get nothing,
and a learner whose single provider hits its quota mid-session loses the feature until tomorrow.

The router fixes both: **more ways in** (reuse a key you already have — Kheshav's explicit ask,
2026-06-06 and re-affirmed 2026-06-10) and **resilience** (quota on one provider → auto-switch to
the next configured one, with an honest toast). The no-paywall invariant is untouched: zero keys →
instruct features hide exactly as today; free paths stay byte-identical.

## Assumptions drafted up-front, then adversarially verified

1. **Gemini is callable directly from the browser with a user key — VERIFIED, with a catch.**
   Google's official `@google/genai` SDK explicitly supports browser runtimes with an API key
   (context7, 2026-06-10: "apiKey … is specifically needed on browser runtimes"). The widely
   reported CORS failures are specific to the **OpenAI-compatibility endpoint**
   (`/v1beta/openai/…` — confirmed on Google's AI dev forum); the **native**
   `…/v1beta/models/<model>:generateContent` endpoint is CORS-open. → The adapter MUST use the
   native endpoint + `x-goog-api-key` header. Google's "don't expose keys client-side" warning is
   about *deployment* keys; here the key is the **user's own**, stored only on their device — the
   exact BYOK posture already shipped for OpenRouter (browser → openrouter.ai direct).
2. **An HTTPS site can reach local Ollama — VERIFIED, desktop-only, two gates.** Browsers exempt
   `http://localhost` from mixed-content blocking, **but** (a) Ollama rejects foreign origins
   unless the user sets `OLLAMA_ORIGINS` to the site origin and restarts it, and (b) Chrome 142+
   (Oct 2025) gates public-site→loopback fetches behind the new **Local Network Access / "Loopback
   Network" permission prompt** (Chrome 146+ splits it out by that name). Both are one-time,
   acceptable for a power-user card. **Phones are out by physics**: no Ollama on the phone, and a
   LAN URL (`http://192.168.…`) from an HTTPS page is hard-blocked mixed content (only
   localhost/127.0.0.1 are exempt).
3. **Cheap auth-only key tests exist everywhere — VERIFIED.** OpenRouter `GET /api/v1/key`
   (shipped, `openrouter.js:188` — chosen after the "Test key proxied a flaky completion" lesson);
   Gemini `GET /v1beta/models` with the key (200 = valid, 400/403 = invalid — and the response
   doubles as model discovery); Ollama `GET /api/version` (also proves CORS + LNA are open).
4. **Quota exhaustion is detectable — VERIFIED.** OpenRouter and Gemini both return HTTP 429 on
   rate/quota limits; Ollama's failure mode is network-level (connection refused / CORS). A 429 is
   the auto-switch trigger; other failures cool the provider down too.
5. **Gemini model slugs rotate — same trap as OpenRouter.** `gemini-2.0-flash` was retired in the
   2025-12 wave (documented in `api/gemini.js`); `gemini-3.5-flash` is current. → The adapter
   **discovers** models via ListModels (24h cache) with `gemini-3.5-flash` as the offline
   fallback, mirroring `getFreeModels()`/`FALLBACK_FREE_MODELS` (the CLAUDE.md
   "discover, never hardcode" convention).

## The synthesis

> **A provider-adapter registry behind the existing `instruct.js` seam.** Each provider is a small
> module with the same five-part contract (id, label, `hasKey`, `call`, `verify`) and its own
> localStorage key slot (the shipped OpenRouter BYOK pattern — never the Zustand store, so keys can
> never enter the cloud sync blob). `callInstruct` tries the preferred provider first; on quota
> (429) or failure it puts that provider on an exponential cooldown and falls through to the next
> configured one; a successful fallback emits a switch event that a Layout-mounted toast surfaces
> ("Gemini hit a limit — switched to OpenRouter · AI settings →"). `hasInstructProvider()` becomes
> "any provider configured". **Public API, call sites, store schema, and server: all unchanged.**

Tiered presentation (the ADD-friction guardrail, Kheshav sign-off 2026-06-10): the Settings section
shows two paste-a-key fields (OpenRouter, Gemini) — Ollama is a **collapsed "Advanced — local AI on
your computer" card, hidden on phones**, and last in auto-order. A learner who just wants it
working sees two fields and is done; options exist without cognitive load on the main path.

---

## Options considered

### Architecture — where does multi-provider logic live? → **CHOSEN: B (adapter registry under instruct.js)**
- **A — Grow `instruct.js` inline (REJECTED).** Put all three providers' fetch/key code in one
  file. Fewest files, but mixes three HTTP dialects + three key stores into the seam, and every
  future provider grows it further. Rejected: the seam's value is being thin and stable.
- **B — Adapter registry: `src/lib/instructProviders/{openrouter,gemini,ollama}.js` + routing in
  `instruct.js` (CHOSEN).** Each adapter implements one contract; `instruct.js` keeps its two-
  function public API and gains ordering/cooldown/switch-events. Mirrors the proven
  `src/lib/translate/providers/` shape. Adding provider #4 = one new file + one registry line.
- **C — Extend `aiText.js` into the universal router (REJECTED).** `callTextAI` already routes
  user-OpenRouter → server-Gemini, so "just generalize it"? No: it serves a **different
  invariant** — its features (writing tutor, speaking coach, comprehension) are allowed to fall
  back to Kheshav's server proxy; instruct features are BYOK-only by design (F3, "don't use my
  key"). Merging the two would either leak server fallback into BYOK features or strip it from
  Gemini-default ones. The registry can serve `aiText` later as a fast-follow.

### Scope — which call paths route through the router in v1? → **CHOSEN: the instruct seam only**
Verified against live code before deciding (the kickoff's "every instruct feature through
instruct.js" needed a precision pass):
- `callInstruct` consumers today: **PDFReader Option F only** (`PDFReader.jsx:38,133,643`). ✅ in.
- **Quality translation** (`translate.js:73`) keys off `isOpenRouterAvailable()` — the **env key
  counts**, so it works for every user on the deployed site today. Forcing it through the
  BYOK-only seam would silently **regress free users** — exactly the kind of free-path change the
  invariant forbids. → untouched in v1; "Gemini/Ollama as quality-translate providers" is its own
  fast-follow decision (it needs the env-key question answered separately).
- **`callTextAI` features + Cikgu free chat** — server/env fallbacks are part of their contract;
  untouched (fast-follow: prefer a user Gemini key there too).
- **New instruct features** (AI decks, roleplay seeds…) get multi-provider for free by calling the
  seam — that was the point of F3.

### Provider lineup v1 → **CHOSEN: OpenRouter + Gemini + Ollama, tiered (Kheshav sign-off)**
- **OpenRouter + Gemini + Ollama (CHOSEN).** All three Kheshav named. Friction is contained by
  tiering: Ollama = collapsed desktop-only advanced card, last in auto-order, and the **plan's
  final detachable task** (the cut line if the build runs long).
- **OpenRouter + Gemini only (REJECTED as v1, kept as cut line).** Leanest, both work on phones —
  but drops an explicit ask, and the registry makes Ollama cheap enough to include tiered.
- **+ OpenAI/Anthropic direct adapters (REJECTED).** OpenRouter already fronts both (one key
  reaches every model), so direct adapters add key-security surface and two more HTTP dialects for
  almost no new capability. Backlog only if users ask.
- Honest learning-quality note (medium confidence, reasoning not citation): local 4–8B Ollama
  models are generally **weaker at Malay** (lower-resource language) than Gemini Flash or
  OpenRouter's free 70B-class models — Ollama's value is privacy/no-quota, not quality. Hence last
  in auto-order.

### Auto-switch UX → **CHOSEN: silent switch + one-line toast with Settings link**
- **Toast (CHOSEN).** Kheshav's own 2026-06-06 design ("toast/notification + change-in-settings
  hyperlink"). Mid-feature interruption ("ask before switching") would block a learner mid-sentence
  for a decision they already made by configuring multiple keys. Toast is throttled (one per
  from→to pair per minute) so retry loops can't spam.
- **Notifications log surface (DEFERRED).** The optional history page from the memory note adds a
  route + store surface for marginal value in v1. The toast + telemetry events cover it. Backlog.

### Key/preference storage → **CHOSEN: per-provider localStorage slots (the shipped BYOK pattern)**
- **Own localStorage entries (CHOSEN).** `igcse-gemini-key`, `igcse-ollama-url`,
  `igcse-ollama-model`, `igcse-instruct-preferred` — exactly like `igcse-openrouter-key`
  (`openrouter.js:130-148`): module-cached, try/catch for private mode, **never in the Zustand
  store** → can never reach the `user_state` cloud blob or sync queue. Consequence (by design):
  keys are **per-device** — a phone only shows the ladder once a key is pasted *on the phone*.
  **No STORE_VERSION bump anywhere in this feature.**
- **Zustand + SYNC_OMIT (REJECTED).** Convenient (reactive), but one missed omit-list entry ships
  every user's API keys to Supabase. The standing rule (BYOK design 2026-05-30) exists for this
  reason; not reopening it.

### Scope scoring (Impact × Confidence ÷ Effort)
| Scope | Impact | Confidence | Effort | Score | Verdict |
|---|---|---|---|---|---|
| **Router + Gemini + tiered Ollama (this spec)** | 4 | 4.5 | 2.5 | **7.2** | **Build (v1)** |
| Quality-translate via router | 3 | 3 | 2 | 4.5 | Fast-follow (env-key question first) |
| `aiText` features prefer user Gemini key | 2.5 | 4 | 1.5 | 6.7 | Fast-follow (small, after router proves out) |
| Notifications history surface | 1.5 | 3 | 2 | 2.25 | Backlog |
| OpenAI/Anthropic direct adapters | 1.5 | 4 | 2 | 3.0 | Backlog (OpenRouter fronts them) |

---

## Chosen design (v1) + WHY + verified hook points

1. **Adapter contract — `src/lib/instructProviders/` (new dir, three small modules).** Each exports
   `{ id, label, hasKey(), call({systemPrompt, messages, maxTokens, signal}), verify({signal}) }`.
   - `hasKey()` is **sync** (module-cached localStorage read) — `hasInstructProvider()` must stay
     callable in render (`PDFReader.jsx:133` computes `ladder` synchronously).
   - `call()` returns `Promise<string>`; failures throw with `err.cause ∈
     'no_key'|'quota'|'http'|'empty'|'network'` (the typed-error convention from `gemini.js:18`);
     **429 → `'quota'`**; a Gemini safety-block / empty candidates → `'empty'`. `AbortError`
     always propagates raw.
   - `verify()` is **auth-only, never a completion** (the `verifyOpenRouterKey` lesson,
     `openrouter.js:173-205`).
2. **`openrouter` adapter (thin wrapper, no behavior change).** Wraps the shipped
   `hasUserOpenRouterKey` / `callOpenRouter` / `verifyOpenRouterKey`. **Gate stays the USER key
   only** — the env `VITE_OPENROUTER_KEY` never makes `hasKey()` true (F3 invariant; today's exact
   semantics, locked by existing tests).
3. **`gemini` adapter (new, client-direct).** Key slot `igcse-gemini-key` (+ set/get/has mirroring
   `openrouter.js:142-159`). `call()` POSTs the **native** endpoint
   `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` with the key
   in the **`x-goog-api-key` header** (never the URL query — keys don't belong in URLs/logs);
   request shaping mirrors `gemini.js:33-53` (`contents` + `systemInstruction` +
   `maxOutputTokens`); **does NOT touch `/api/gemini`** — the server proxy and Kheshav's
   `GEMINI_KEY` stay reserved for the `aiText` features. Model comes from
   `pickGeminiModels()` over `GET /v1beta/models` (filter `generateContent`-supporting flash
   models; 24h cache `igcse-gemini-models`; fallback `['gemini-3.5-flash']`) — pure + unit-tested
   like `pickFreeModels` (`openrouter.js:69`). `verify()` = the same ListModels call.
4. **`ollama` adapter (new, advanced).** Slots `igcse-ollama-url` (default
   `http://localhost:11434`, must parse as http(s) URL) + `igcse-ollama-model`. `call()` POSTs
   `<url>/api/chat` `{model, messages:[system,…], stream:false, options:{num_predict:maxTokens}}`;
   `verify()` = `GET <url>/api/version`; `listOllamaModels()` = `GET <url>/api/tags` (feeds the
   Settings model picker). `hasKey()` = URL **and** model set.
5. **Router — `src/lib/instruct.js` (public API unchanged).**
   - Registry `[openrouter, gemini, ollama]` (= the auto-order: quality + speed first, local last).
   - `hasInstructProvider()` → any adapter `hasKey()`. `getConfiguredInstructProviders()` exported
     for Settings.
   - Preference: `igcse-instruct-preferred` = `'auto'` (default) or a provider id; preferred
     adapter goes first, the rest keep auto-order.
   - `callInstruct(args)`: iterate configured adapters, **skipping any on active cooldown**
     (unless *all* are cooling — then try them anyway; never dead-end without one real attempt).
     On failure: set cooldown — base 120s, **doubling per consecutive `'quota'` failure up to
     30 min** (a daily-quota'd Gemini shouldn't eat a failed fetch every 2 minutes), reset on
     success — record `lastError`, continue. On success by an adapter that wasn't the first
     configured choice → `emitInstructSwitch({from, to})`. All fail → throw `lastError` (callers
     keep their shipped degrade: Option F falls back to the English reveal). `AbortError` rethrows
     immediately, no cooldown, no switch.
   - `subscribeInstructSwitch(cb)` → unsubscribe fn (module-level listener set — toast hook).
   - Time injected as `now = Date.now()` params (pure-testable, mirrors `getFreeModels`).
6. **Switch toast — `src/components/InstructSwitchToast.jsx`, mounted in `Layout.jsx` beside
   `MistakeToast` (`Layout.jsx:237` — the proven global-toast pattern).** Subscribes on mount;
   shows ~6s: *"⚡ Gemini hit a limit — switched to OpenRouter"* + **"AI settings →"** link to
   `/settings#byok`. Throttle: one toast per from→to pair per 60s. Telemetry: `trackEvent`
   `instruct_provider_switch` with `{from, to, cause}` — **provider ids only, never key material**.
7. **Settings — generalize the BYOK section (`Settings.jsx:709-792`, anchor `#byok` kept).**
   Section title → "AI providers — use your own keys". Extract the field chrome of
   `OpenRouterKeyField` into a shared `ProviderKeyCard` (label, blurb, input, Save/Remove/Test
   states) used by: **OpenRouter card** (existing behavior, existing deep-link), **Gemini card**
   (same paste-key UX; blurb links aistudio.google.com/apikey), **Ollama advanced card** —
   collapsed disclosure, **rendered only on desktop-class viewports**, containing the URL field,
   "Connect" test, model dropdown (from `/api/tags`), and a 3-step setup note (install Ollama →
   `launchctl setenv OLLAMA_ORIGINS https://upg-igcse-malay-master.vercel.app` (or `*`) + restart
   Ollama → accept Chrome's "local network" permission when prompted). **Preferred-provider
   picker** (Auto recommended / per-provider) appears only when ≥2 adapters are configured. The
   key-restriction security note (`Settings.jsx:859`) gains a Gemini line (restrict the key to the
   Generative Language API in Google Cloud console).
8. **No store change.** No STORE_VERSION bump, no migration, no sync events, no schema/table work,
   no edge-function work. The whole feature is client-side modules + one toast + one Settings
   section.

## Safety / quality bars
- **No paywall.** Zero providers → `hasInstructProvider()` false → instruct features hide exactly
  as shipped; the English reveal and every free path stay **byte-identical**. No locked/teaser UI.
- **Key security.** Keys live ONLY in their own localStorage slots; never in the Zustand store,
  cloud blob, sync queue, telemetry, logs, or error messages (greppable bar: no
  `instructProviders/` module imports `useStore`). Gemini key travels only in the
  `x-goog-api-key` header to `generativelanguage.googleapis.com`; OpenRouter key only as Bearer to
  `openrouter.ai`; the user's BYOK Gemini key **never** touches `/api/gemini` or any of our
  servers. Test buttons are auth-only — never a completion.
- **Seam stability.** `hasInstructProvider()` / `callInstruct()` signatures and semantics
  (string-resolving, AbortError-propagating) unchanged — `PDFReader.jsx` and the 697-test baseline
  need zero call-site edits. No caller may import an adapter directly.
- **Bounded, honest failure.** Max one pass over configured adapters per call (≤3 attempts);
  cooldowns are in-memory only (a reload forgets them — fine); all-fail throws and the caller's
  shipped degrade path runs; the switch toast names real providers and links to Settings;
  exponential cooldown caps retry burn on daily quotas.
- **Tiered friction (ADD guardrail).** Phone + default desktop view: two paste-a-key cards, no
  Ollama. Ollama is opt-in disclosure, desktop-only, last in auto-order, honest about its 3 setup
  steps in the card itself.
- **Per-device truth.** Keys don't sync (by design); the Settings cards are the single source of
  what this device can do. No cross-device key UX in v1.
- `var(--color-*)` only; React-19 purity (no `Date.now()` in render — router takes `now` params);
  no allocation in Zustand selectors (no new selectors at all); touch-first 390×844; both themes;
  toast is `aria-live="polite"` and keyboard-dismissible.

## Decision log
| # | Decision | Evidence / source (grade) | Effect | Confidence |
|---|---|---|---|---|
| R1 | **Gemini adapter calls the NATIVE endpoint client-side with `x-goog-api-key`** | official `@google/genai` supports browser runtimes (context7, high); CORS failures isolated to the OpenAI-compat endpoint (Google AI forum, med-high) | Gemini BYOK feasible with no server; compat endpoint banned | **High** |
| R2 | **Ollama ships desktop-only as a collapsed advanced card** | localhost mixed-content exemption + `OLLAMA_ORIGINS` requirement (Ollama FAQ/issues, high); Chrome 142+ LNA loopback permission (Chrome dev blog, high); LAN-from-HTTPS = blocked mixed content (high) | phones never see a dead card; setup steps documented honestly | **High** |
| R3 | **Adapter registry under the unchanged `instruct.js` seam** | seam + sole consumer verified live (`instruct.js:20,30`; `PDFReader.jsx:38,133,643`, high) | zero call-site change; provider #4 = one file | **High** |
| R4 | **v1 scope = instruct seam only; translate/aiText untouched** | `translate.js:73` lights quality-translate on the **env** key — BYOK-only routing would regress free users (high, code-grounded) | no free-path regression; fast-follows logged | **High** |
| R5 | **Per-provider localStorage slots; no STORE_VERSION bump** | shipped BYOK pattern `openrouter.js:130-148` + 2026-05-30 BYOK design rationale (high) | keys can't reach cloud blob; keys are per-device | **High** |
| R6 | **Auto-switch on 429/failure + throttled toast, no mid-feature prompt** | Kheshav's own router design (memory, high); learner-flow argument (med) | resilience without interruption | **Med-High** |
| R7 | **Exponential cooldown (120s → ×2 → cap 30 min) on quota** | Gemini free tier has daily quotas — fixed 120s would burn a failed fetch every 2 min all day (med-high, reasoning) | bounded retry waste | **Med-High** |
| R8 | **Discover Gemini models via ListModels, fallback `gemini-3.5-flash`** | gemini-2.0 retirement documented in `api/gemini.js` (high); CLAUDE.md discover-don't-hardcode convention (high) | survives the next rotation | **High** |
| R9 | **Auto-order OpenRouter → Gemini → Ollama** | local 4–8B models weaker at Malay than Flash/70B-class (med, reasoning not citation); OpenRouter first = today's behavior for existing key holders | best quality first; no behavior change for current users | **Med** |
| R10 | **Test buttons auth-only** | the shipped "Test key proxied a flaky completion" bug + fix (`openrouter.js:176-186`, high) | reliable tests, zero token spend | **High** |

## Open questions for Kheshav
None blocking — both product forks were resolved live on 2026-06-10 (lineup: all three, tiered;
design: approved). Two wording-level defaults stand unless vetoed at implementation review:
- Toast copy: *"⚡ Gemini hit a limit — switched to OpenRouter"* + "AI settings →".
- Ollama card title: *"Advanced — local AI on your computer (desktop)"*.

## Test plan
- **Pure units (TDD first, no network) — adapters:**
  - Gemini: key slot set/get/has + private-mode fallback (mirror the OpenRouter tests); request
    shaping (`contents` role mapping, `systemInstruction`, `maxOutputTokens`); response text
    extraction; typed errors — 429→`'quota'`, safety-block/empty candidates→`'empty'`,
    network→`'network'`; never sends the key in the URL. `pickGeminiModels`: filters to
    `generateContent` flash models, fallback on empty/garbage, 24h cache honored (`now` injected).
  - Ollama: URL validation (http/https only) + slot handling; `/api/chat` payload shape incl.
    `num_predict`; `/api/tags` → model list parse; `hasKey()` false until URL **and** model set.
  - OpenRouter adapter: delegates to existing fns; env key still never counts.
- **Router units — `instruct.js`:** auto-order; preferred-first ordering; `hasInstructProvider`
  any-adapter; cooldown skip + all-cooling still-tries; exponential growth on consecutive quota
  failures + reset on success (injected `now`); switch event fires only on non-first success;
  AbortError propagates with no cooldown/no event; all-fail throws `lastError`; subscribe/
  unsubscribe. Existing `instruct.test.js` updated for multi-provider semantics.
- **e2e + GO WILD** (`[[feedback_go_wild_smoke_test]]`, bindStore + live-`?t=`-URL per
  `[[project_e2e_config_invocation]]`): with ONLY a stubbed **Gemini** key → the Option F ladder
  appears (proves the seam gates feature-wide, not OpenRouter-specific); stub primary to 429 →
  call succeeds via fallback + switch toast appears, links to `/settings#byok`, throttles on spam;
  no keys → sentence reveal **byte-identical** to shipped; Settings: save/remove/test all three
  cards, garbage keys, spam Save/Test, preferred picker appears only at ≥2 providers, `#byok`
  deep-link still scrolls; 390×844 hides the Ollama card; offline → graceful; theme swap; light +
  dark screenshots.
- **Verification gate:** `npm run build` (chunks within bars) · `npm run lint` (0 errors, no new
  warnings) · `npm run test:run` (697+ green) · `npm run test:e2e` (SOLO).

---

## Paste-ready Implementation kickoff (next session)
*(Lean per `[[reference_lean_kickoff_template]]`. Canonical copy — keep in sync with RESUME_HERE.md.)*

```text
Continue the IGCSE Malay Master app (React/Vite SPA). Implementation session — build the approved
multi-provider AI key router.

Read first: RESUME_HERE.md (top block),
docs/superpowers/specs/2026-06-10-multi-provider-instruct-router-design.md,
docs/superpowers/plans/2026-06-10-multi-provider-instruct-router.md. Follow any memories the plan
names.

Build in the plan's TDD order: failing tests first, surgical diffs. The instruct.js public API
(hasInstructProvider/callInstruct) must not change — PDFReader needs zero edits. Keys live ONLY in
their own localStorage slots (never the Zustand store/cloud blob); Gemini uses the NATIVE
generateContent endpoint with the x-goog-api-key header (the OpenAI-compat endpoint CORS-fails).
Task 6 (Ollama) is the detachable cut line if the session runs long.

Done means: build + lint + test:run + the new e2e green (show output, don't assert); light AND
dark eyeballed at 390x844; committed (gate runs the suite, repo auto-pushes); PUBLIC Vercel
(upg-…) READY; RESUME_HERE.md refreshed in the same commit. Make the clear calls yourself; stop
only for product forks or destructive actions.
```

## Sources (graded)
- `@google/genai` SDK — browser-runtime apiKey support (context7 `/googleapis/js-genai`, official, **high**)
- Gemini OpenAI-compat CORS failure isolation — https://discuss.ai.google.dev/t/gemini-api-cors-error-with-openai-compatability/58619 (forum, **med-high**)
- AI Studio's proxy rationale (deployment-key context) — https://glaforge.dev/posts/2026/02/09/decoded-how-google-ai-studio-securely-proxies-gemini-api-requests/ (**med**)
- Chrome Local Network Access permission (142+; loopback split in 146) — https://developer.chrome.com/blog/local-network-access (official, **high**)
- Ollama CORS / `OLLAMA_ORIGINS` — https://docs.ollama.com/faq + https://github.com/ollama/ollama/issues/300 + https://objectgraph.com/blog/ollama-cors/ (**high**)
- Gemini rate limits & current flash models (incl. gemini-3.5-flash) — https://ai.google.dev/gemini-api/docs/rate-limits (official, **high**)
- Live code (read 2026-06-10): `src/lib/instruct.js`, `src/lib/openrouter.js`, `src/lib/gemini.js`,
  `api/gemini.js`, `src/lib/aiText.js`, `src/lib/translate.js:62-89`,
  `src/lib/translate/providers/openrouter.js`, `src/pages/Settings.jsx:709-992`,
  `src/components/Layout.jsx:236-240`, `src/pages/PDFReader.jsx:38,133,643` (**high**)
