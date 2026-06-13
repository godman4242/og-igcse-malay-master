import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DICTIONARY from '../data/dictionary';
import TOPIC_PACKS from '../data/topics';
import EXAMPLES from '../data/dictionaryExamples';
import { reviewCard, getDueCards, createNewCardState, migrateFromSM2, Rating, RECALL_PROBE_DEFAULT, resolveRecallProbe } from '../lib/fsrs';
import { fireConfetti, checkStreakMilestone } from '../lib/confetti';
import { composeReadiness } from '../lib/examReadiness';
import { cardLang } from '../lib/cardLang';
// Pure, dependency-free helper — safe as a STATIC import (unlike syncEngine,
// which is dynamic-imported below). Heals a stale persisted 'syncing' status
// at rehydration; see src/lib/syncStatus.js for the deadlock it prevents.
import { reconcileSyncStatusOnLoad } from '../lib/syncStatus';
// syncEngine + cloudSync are dynamic-imported inside the actions that
// actually fire them (flushSyncQueue, hydrateCloudData) so guest users
// never pay for cloud-sync bytes on cold load. The two pure helpers
// below (formerly createSyncEvent + enqueueSyncEvent in syncEngine) are
// inlined here so we can drop the eager import entirely — keeping it as
// a static import would defeat the dynamic split (Rollup warning
// INEFFECTIVE_DYNAMIC_IMPORT).
function createSyncEvent(type, payload = {}) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    id,
    idempotencyKey: `sync:${id}`,
    type,
    payload,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };
}
function enqueueSyncEvent(queue, event) { return [...queue, event]; }
import { trackEvent } from '../lib/telemetry';
import { SUPABASE_CONFIG } from '../config/supabaseConfig';
import { getTodayISO, toLocalISO } from '../lib/localDay';

export const STORE_VERSION = 34; // v34 = True English study mode: per-card `lang` ('ms'|'en') + global `studyLang`

// Skills that log into skillActivity (the rest derive from existing slices —
// see lib/skillBalance.js). Retention bounds the persisted log; the meter only
// ever reads a 7-day window.
const LOGGED_SKILLS = ['reading', 'listening', 'grammar'];
const SKILL_LOG_RETENTION_DAYS = 30;

// v26 migration step — add the in-app guide progress slice with defaults,
// preserving any existing fields (and a guide slice that somehow already
// exists). Exported pure so the upgrade is unit-testable directly.
export function migrateGuideSlice(state) {
  return {
    ...state,
    guide: state.guide || { seenQuick: false, seenFull: false },
  };
}

// Module-level debounce for cloud sync — safe to call inside actions
let _cloudSyncTimer = null;

// Module-level retry timer for flushSyncQueue. Replaces the previous
// effect-driven retry storm — Layout used to re-fire flushSyncQueue on every
// `sync.syncStatus` oscillation, which hammered the API in a tight loop on
// flaky networks (the mobile sync loop). Now flushSyncQueue schedules a
// single setTimeout at the earliest queued `nextRetryAt` after a failure.
let _syncRetryTimer = null;

// Re-entrancy guard for flushSyncQueue (P1-2). Layout's `online` handler and
// the queue.length effect can both fire a flush, and a mutation can enqueue
// mid-flight — without this, two overlapping flushes double-process the same
// events. A plain module boolean is enough: flush is single-threaded per tab.
let _flushInFlight = false;

// Mistake pruning thresholds. When the active `mistakes` list exceeds the
// threshold, the oldest *reviewed* (resolved) items are moved to
// `mistakeHistory` so localStorage reads stay fast.
const MISTAKE_PRUNE_THRESHOLD = 500;
const MISTAKE_PRUNE_BATCH = 100;
const MISTAKE_HISTORY_CAP = 2000;

// Categories used by logMistake — keep in sync with MistakeJournal renderer.
const MISTAKE_CATEGORIES = ['vocab', 'imbuhan', 'tense', 'spelling', 'cohesion', 'register', 'pronunciation', 'comprehension', 'fluency', 'other'];
const MISTAKE_SEVERITIES = ['low', 'med', 'high'];
const AUTO_PROMOTE_CATEGORIES = new Set(['vocab', 'imbuhan']);

// Which mistakes auto-promote to FSRS cards, by language. Malay misses promote
// vocab + imbuhan; English misses promote vocab ONLY (English has no imbuhan
// morphology). Any other / untagged language never promotes — preserving the
// pre-v34 strict `language === 'ms'` gate byte-identically. The promoted card's
// gloss direction is already handled by promoteMistakeToCard (m=word, e=correct,
// lang from mistake.language). (v34 — True English study mode, F5 follow-up.)
function canAutoPromoteMistake(language, category) {
  if (language === 'ms') return AUTO_PROMOTE_CATEGORIES.has(category);
  if (language === 'en') return category === 'vocab';
  return false;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

// ── Backup round-trip (P2-C6) ───────────────────────────────────────────────
// Single source of truth for Settings export/import. exportData picks these
// keys from the live store; importData restores them, falling back to each
// field's default when an OLDER backup file is missing a key. Because BOTH
// sides iterate the SAME list, a newly added user field can't be silently
// dropped from a device migration (the old code kept two literal lists that
// drifted — exportData omitted examAttempts/guide/pdfReader/examRehearsalLang
// and importData ignored `ai`).
//
// DELIBERATELY EXCLUDED — device-transient or auth/session state that must NOT
// migrate: sync (queue/network), auth (session), installPrompt (per-device A/B
// variant + dismissal), lastMutationAt + userRole (sync/auth-derived),
// reviewedToday/lastStudyDate/activeDeck (daily-session counters, re-derived).
const makeBackupDefaults = () => ({
  // Cards & learning data
  cards: [],
  grammarCards: {},
  mistakes: [],
  mistakeHistory: [],
  confidenceLog: [],
  mistakeReasons: {},
  sessionFeedback: [],
  reflections: [],
  studyHistory: {},
  skillActivity: {},
  cognitiveProfile: { studentId: 'local_user', masteredConcepts: [], learningConcepts: [], recentMistakes: [] },
  writingHistory: [],
  speakingHistory: [],
  examAttempts: [],
  pdfRecents: [],
  // Streak / engagement
  streak: { count: 0, last: '' },
  streakFreezes: 0,
  streakFreezeLog: [],
  dailyChallenge: null,
  challengeHistory: {},
  // Identity / motivation
  identity: { idealSelf: '', label: null, cue: null, identityChosenAt: null, goalPreset: null },
  lastSessionAt: null,
  // Exam
  examDate: null,
  examRehearsalLang: 'ms',
  studyLang: 'ms',
  // Settings / prefs
  theme: 'dark',
  dailyGoal: 20,
  dailyGoalLevel: 'standard',
  theaterModeEnabled: true,
  showDictionaryImages: true,
  dyslexicFont: false,
  highContrast: false,
  highlightMode: 'saved',
  recallProbe: { ...RECALL_PROBE_DEFAULT },
  userInterests: [],
  ui: { useAdaptiveScaffolding: true },
  interleaveSettings: { vocabRatio: 0.5, grammarRatio: 0.3, compRatio: 0.2, sessionSize: 15 },
  translation: { preferredProvider: 'auto', showComparisonLink: true, cacheToCloud: false },
  writingTutor: { provider: 'gemini', autoDetectFormat: true },
  pdfReader: { layoutView: false, sentenceRender: 'inline', autoHelpDensePages: false, ocrLang: 'ms', visionConsent: false, asrLang: 'ms' },
  guide: { seenQuick: false, seenFull: false },
  ai: { dailyCalls: 0, dailyCallsDate: null, roleplayHistory: [], cikguHistory: [] },
});
const BACKUP_KEYS = Object.keys(makeBackupDefaults());

// v34 migration (exported for unit tests): backfill per-card target language and
// the global studyLang. Pure; preserves all other state. Every pre-v34 card is
// Malay, so backfill lang:'ms' (lossless); an already-tagged 'en' card is left
// untouched. See docs/superpowers/specs/2026-06-14-true-english-study-mode-design.md.
export function applyV34Migration(state) {
  if (!state) return state;
  return {
    ...state,
    studyLang: state.studyLang === 'en' ? 'en' : 'ms',
    cards: Array.isArray(state.cards)
      ? state.cards.map((c) => (c && c.lang ? c : { ...c, lang: 'ms' }))
      : state.cards,
  };
}

const useStore = create(
  persist(
    (set, get) => ({
      // Store version for migrations
      _version: STORE_VERSION,

      // Cards & Decks
      cards: [],
      activeDeck: 'All',

      // Settings
      theme: 'dark',
      dailyGoal: 20,
      dailyGoalLevel: 'standard', // 'casual' (10), 'standard' (20), 'intensive' (40)
      theaterModeEnabled: true,        // v13 — auto-hide chrome during active tasks. Off in Settings disables the whole feature.
      showDictionaryImages: true,      // v15 — Visual Dictionary (UDL Principle 2). Off hides every DictionaryIcon site-wide.
      dyslexicFont: false,             // v16 — UDL Principle 1. Swap body font to Lexend with wider tracking + taller line-height.
      highContrast: false,             // v16 — UDL Principle 1. Push contrast to WCAG AAA and double border widths.
      highlightMode: 'saved',          // v22 — Tier-2 saved-word highlight: 'off' | 'saved' (personally-saved only) | 'all' (every deck's words).
      recallProbe: { ...RECALL_PROBE_DEFAULT }, // v23 — "Still remember these?" For-You shelf config: { enabled, mode:'default'|'strict'|'custom', stabilityDays, idleDays }.
      userInterests: [],               // v17 — UDL Principle 1 — Personal Interests. Star-topic IDs from src/lib/interests.js. Matching content floats to the top of Comprehension + Roleplay lists.
      ui: {                            // v20 — UI feature flags. Adaptive scaffolding gates writing-feedback-v2 + roleplay learnerProfile injection.
        useAdaptiveScaffolding: true,
      },

      // Streak
      streak: { count: 0, last: '' },

      // Study session
      reviewedToday: 0,
      lastStudyDate: '',
      studyHistory: {},  // { 'YYYY-MM-DD': { reviews: N, minutes: N } }
      skillActivity: {}, // v31 — { 'YYYY-MM-DD': { reading: N, listening: N, grammar: N } }, local-day keyed. Feeds the Dashboard paper-balance meter (lib/skillBalance.js).

      // Grammar SRS state (Phase 1B)
      grammarCards: {},

      // Mistakes (Phase 1C)
      mistakes: [],
      // Archived resolved mistakes (v14) — older `reviewed` items moved here once
      // the active `mistakes` array crosses MISTAKE_PRUNE_THRESHOLD. Kept on
      // disk so the journal can still surface them on demand without bloating
      // the hot path.
      mistakeHistory: [],

      // Exam countdown (Phase 1E)
      examDate: null,

      // Engagement layer (P1). engagementXP was retired in v32 (feature #6) —
      // the abstract counter served no learning principle; the Dashboard tile
      // now shows Mastered words (lib/fsrs.js countMastered).
      streakFreezes: 0,
      streakFreezeLog: [],
      dailyChallenge: null,
      challengeHistory: {},
      installPrompt: {
        accepted: false,
        dismissedAt: null,
        variant: Math.random() < 0.5 ? 'dashboard_card' : 'post_session',
      },

      // AI features (Phase 2)
      ai: {
        dailyCalls: 0,
        dailyCallsDate: null,
        roleplayHistory: [],   // { scenarioId, turns, score, date }
        cikguHistory: [],      // { role, content, timestamp }[]
      },

      // Cognitive Profile (Phase 3 TS Core Agent)
      cognitiveProfile: {
        studentId: 'local_user',
        masteredConcepts: [], // string IDs of mastered schemas
        learningConcepts: [], // string IDs
        recentMistakes: [],   // StudentMistake objects
      },

      // Metacognitive confidence tracking (v6)
      confidenceLog: [],  // { word, level: 1|2|3, correct: bool, ts, mode? }

      // Cluster B — Metacognitive close-the-loop (v7)
      mistakeReasons: {},     // { [mistakeId]: 'unknown' | 'confused' | 'typo' | 'misread' }
      sessionFeedback: [],    // [{ ts, deck, accuracy, perceived: 'easy'|'right'|'hard' }]
      reflections: [],        // [{ ts, bestMode: 'vocab'|'grammar'|'speak'|'read', note }]

      // Cluster E — Long-game motivation (v7)
      identity: {
        idealSelf: '',
        label: null,
        cue: null,
        identityChosenAt: null,
        goalPreset: null,     // v23 — chosen GOAL_PRESETS id (src/lib/goals.js); shapes the For You "Toward your goal" shelf.
      },
      lastSessionAt: null,
      // Wall-clock of the last local mutation (bumped in enqueueSyncEventAction).
      // The cloud-sync tie-break compares this against the blob's updated_at
      // (apples to apples) to decide newer-wins — far more reliable than the
      // old coarse lastStudyDate. See AuthGuard.handleSignIn.
      lastMutationAt: null,

      // Translation preferences (v8)
      translation: {
        preferredProvider: 'auto',     // 'auto' | 'deepl' | 'google' | 'gtx'
        showComparisonLink: true,      // surface "compare on DeepL/Google" links
        cacheToCloud: false,           // Supabase read-through/write-through cache opt-in
      },

      // PDF reader prefs (v24) — device-local UI: remember the last-used view so
      // reopening a PDF lands in your preference (first-ever open = Reflow).
      pdfReader: {
        layoutView: false,             // false = Reflow (simple text) · true = Layout (faithful page)
        sentenceRender: 'inline',      // 'inline' = slide-down under the sentence · 'sheet' = fixed bottom panel
        autoHelpDensePages: false,     // v28 — beginner pref: auto-show English help on dense pages instead of asking
        ocrLang: 'ms',                 // v29 — past-paper photo OCR language: 'ms' (0546, primary) | 'en'
        visionConsent: false,          // v30 — "Don't ask again" on the Sharper-read upload consent dialog
        asrLang: 'ms',                 // v33 — audio transcription language: 'ms' (0546, primary) | 'en'
      },

      // In-app guide / "App tour" progress (v26). Two booleans — progress, not a
      // secret — so it persists + rides the cloud blob like other prefs.
      guide: { seenQuick: false, seenFull: false },

      // Exam Rehearsal subject (v27) — 'ms' (0546, primary) | 'en'. Persisted so a
      // rehearsal opens in your last-chosen language instead of a random MS/EN mix.
      examRehearsalLang: 'ms',

      // True English study mode (v34) — which language the learner is REVISING:
      // 'ms' (0546 Malay, primary) | 'en' (0510 English as a Second Language). Scopes
      // the Study session, Smart-Study queue, and Dashboard counts to one language.
      studyLang: 'ms',

      // Writing tutor settings (v8)
      writingTutor: {
        provider: 'gemini',            // 'gemini' | 'openrouter' | 'claude'
        autoDetectFormat: true,
      },

      // Writing tutor history (v8)
      writingHistory: [],              // [{ ts, lang, format, score, messages }]

      // Speaking history (v8) — used by /speaking page (og's grader)
      speakingHistory: [],             // [{ ts, topicId, band, durationSec, wordCount, transcript }]

      // Exam rehearsal attempts (v12) — composite Paper 1+2+3 simulation
      examAttempts: [],                // [{ id, ts, passageId, lang, comprehensionPct, writingBand, speakingBand, readinessScore, durationSec }]

      // PDF reader recents (v8)
      pdfRecents: [],                  // [{ name, sizeKB, pages, addedAt }]

      // User role / access tier (v6)
      userRole: 'static',  // 'static'|'enhanced'|'admin'|'owner'

      // Interleave settings (v6)
      interleaveSettings: { vocabRatio: 0.5, grammarRatio: 0.3, compRatio: 0.2, sessionSize: 15 },

      // Offline-first sync state (P0)
      sync: {
        networkStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
        syncStatus: 'synced', // synced | pending | syncing | error
        queue: [],
        lastSyncAt: null,
        lastError: null,
      },

      // Auth state (v19)
      auth: {
        user: null,          // { id, email } when signed in, null for guests
        showModal: false,    // controls AuthModal visibility
        lastCloudSyncAt: null,
      },

      // Actions
      setNetworkStatus: (isOnline) => set(state => {
        const networkStatus = isOnline ? 'online' : 'offline';
        trackEvent('network_status_changed', { status: networkStatus });
        return {
          sync: {
            ...state.sync,
            networkStatus,
            syncStatus: isOnline && state.sync.queue.length === 0 ? 'synced' : state.sync.syncStatus,
          }
        };
      }),

      enqueueSyncEventAction: (type, payload = {}) => {
        set(state => {
          const event = createSyncEvent(type, payload);
          const queue = enqueueSyncEvent(state.sync.queue, event);
          trackEvent('sync_queue_enqueued', { eventType: type, queueLength: queue.length });
          return {
            // Stamp the local mutation time for the cloud-sync tie-break.
            // Every mutation that matters for sync funnels through here.
            lastMutationAt: new Date().toISOString(),
            sync: {
              ...state.sync,
              queue,
              syncStatus: 'pending',
              lastError: null,
            }
          };
        });
        // Also push the full state blob (debounced 5s in triggerCloudSync) so
        // cross-device restore via pullStateBlob sees fresh streak / XP /
        // settings / identity. Per-table data (cards / writing / speaking) is
        // already covered by hydrateCloudData on the read side.
        get().triggerCloudSync();
      },

      flushSyncQueue: async () => {
        // Re-entrancy guard (P1-2): a second flush while one is in-flight would
        // re-process the same events. Layout's `online` handler + the
        // queue.length effect both call this unguarded, so bail fast here.
        if (_flushInFlight) return false;

        // Cancel any pending retry — we're about to make a fresh attempt.
        if (_syncRetryTimer) { clearTimeout(_syncRetryTimer); _syncRetryTimer = null; }

        const { sync } = get();
        if (sync.queue.length === 0) return true;

        _flushInFlight = true;

        set(state => ({
          sync: {
            ...state.sync,
            syncStatus: 'syncing',
            lastError: null,
          }
        }));

        trackEvent('sync_flush_started', { queueLength: sync.queue.length });

        const scheduleRetry = (remainingQueue) => {
          if (typeof window === 'undefined') return;
          if (!remainingQueue?.length) return;
          // Lazy import keeps the helper alongside processSyncQueue without
          // pulling syncEngine into the cold-load critical path.
          import('../lib/syncEngine').then(({ nextScheduledRetryMs }) => {
            const delayMs = nextScheduledRetryMs(remainingQueue, Date.now());
            if (delayMs == null) return;
            if (_syncRetryTimer) clearTimeout(_syncRetryTimer);
            _syncRetryTimer = setTimeout(() => {
              _syncRetryTimer = null;
              const s = get();
              if (
                s.sync.networkStatus === 'online' &&
                s.sync.queue.length > 0 &&
                s.sync.syncStatus !== 'syncing'
              ) {
                s.flushSyncQueue();
              }
            }, delayMs);
          });
        };

        const start = Date.now();
        let succeeded = false;
        let leftoverPending = 0;
        try {
          const [{ processSyncQueue }, cloudSyncMod] = await Promise.all([
            import('../lib/syncEngine'),
            import('../lib/cloudSync'),
          ]);
          const { processCloudSyncEvent, archiveCloudSyncEvent } = cloudSyncMod;
          // Snapshot the queue we flush THIS pass. Anything enqueued after this
          // point (mid-flight) must survive — below we re-slice the LIVE queue by
          // these ids rather than replacing it wholesale (P1-2).
          const q0 = get().sync.queue;
          const q0Ids = new Set(q0.map(e => e.id));
          const result = await processSyncQueue({
            queue: q0,
            isOnline: get().sync.networkStatus === 'online',
            cloudSyncEnabled: SUPABASE_CONFIG.enabled && get().userRole !== 'static',
            processEvent: (event) => processCloudSyncEvent(event, get()),
          });

          // Surface any dead-lettered events — pre-2026-05-29 the syncEngine
          // dropped them silently, which is why user_cards stayed empty even
          // when the queue flushed to 0. Log, telemetry, and best-effort
          // archive to sync_events with the failure metadata so future
          // debugging can query for `payload._deadLetter = true`.
          const deadLetter = result.deadLetter || [];
          if (deadLetter.length) {
            console.warn(
              `[sync] dead-lettered ${deadLetter.length} event(s) after max retries:`,
              deadLetter.map(e => ({ type: e.type, error: e.lastError, attempts: e.attempts }))
            );
            deadLetter.forEach(event => {
              trackEvent('sync_event_dead_lettered', {
                eventType: event.type,
                attempts: event.attempts,
                error: event.lastError,
              });
            });
            for (const event of deadLetter) {
              try {
                await archiveCloudSyncEvent({
                  ...event,
                  payload: {
                    ...(event.payload || {}),
                    _deadLetter: true,
                    _lastError: event.lastError,
                    _attempts: event.attempts,
                  },
                });
              } catch (archiveErr) {
                console.warn('[sync] failed to archive dead-letter event:', archiveErr?.message);
              }
            }
          }

          // Re-slice the LIVE queue (NOT q0): drop the processed + dead-lettered
          // events, keep failed ones (with their backoff metadata), and PRESERVE
          // anything enqueued during the await. The old code replaced the queue
          // with result.remainingQueue, clobbering those mid-flush adds — a
          // card_removed lost that way never reached the cloud (P1-2).
          const remainingById = new Map(result.remainingQueue.map(e => [e.id, e]));
          const deadIds = new Set(deadLetter.map(e => e.id));
          set(state => {
            const merged = [];
            let leftover = 0;
            for (const e of state.sync.queue) {
              if (remainingById.has(e.id)) merged.push(remainingById.get(e.id)); // failed → keep (updated)
              else if (deadIds.has(e.id)) continue;                              // dead-lettered → drop
              else if (q0Ids.has(e.id)) continue;                               // processed OK → drop
              else { merged.push(e); leftover += 1; }                            // enqueued mid-flush → keep
            }
            leftoverPending = leftover;
            const hasFailed = result.remainingQueue.length > 0;
            const newStatus = merged.length === 0 ? 'synced' : (hasFailed ? 'error' : 'pending');
            return {
              sync: {
                ...state.sync,
                queue: merged,
                syncStatus: newStatus,
                lastError: result.lastError,
                lastSyncAt: newStatus === 'synced' ? new Date().toISOString() : state.sync.lastSyncAt,
              }
            };
          });

          if (result.status === 'synced') {
            trackEvent('sync_flush_succeeded', {
              processed: result.processedCount,
              remaining: result.remainingQueue.length,
              deadLettered: deadLetter.length,
              durationMs: Date.now() - start,
            });
          } else {
            trackEvent('sync_flush_failed', {
              processed: result.processedCount,
              remaining: result.remainingQueue.length,
              deadLettered: deadLetter.length,
              error: result.lastError,
            });
            scheduleRetry(result.remainingQueue);
          }

          succeeded = result.status === 'synced';
        } catch (err) {
          set(state => ({
            sync: {
              ...state.sync,
              syncStatus: 'error',
              lastError: err?.message || 'sync_failed',
            }
          }));
          trackEvent('sync_flush_failed', { error: err?.message || 'sync_failed' });
          scheduleRetry(get().sync.queue);
          succeeded = false;
        } finally {
          _flushInFlight = false;
        }

        // Drain events enqueued mid-flush. The queue length can be UNCHANGED
        // across a flush (one processed, one added), so Layout's
        // [networkStatus, queue.length] effect won't re-fire — drain explicitly.
        // Re-entrancy-guarded above; terminates once nothing new is added (P1-2).
        if (leftoverPending > 0 && get().sync.networkStatus === 'online' && get().sync.queue.length > 0) {
          return get().flushSyncQueue();
        }
        return succeeded;
      },

      retrySync: async () => get().flushSyncQueue(),

      // Heal a stale 'syncing' status left by a flush that was interrupted by a
      // tab close/crash (it persists because the whole `sync` slice is stored).
      // Called once from persist.onRehydrateStorage — without it a single
      // interrupted flush permanently deadlocks the queue. See lib/syncStatus.js.
      reconcileSyncOnHydrate: () => set(state => ({
        sync: reconcileSyncStatusOnLoad(
          state.sync,
          typeof navigator === 'undefined' ? true : navigator.onLine,
        ),
      })),

      ensureDailyChallenge: () => set(state => {
        const today = getTodayISO();
        if (state.dailyChallenge?.date === today) return state;

        const dueCards = getDueCards(state.cards).length;
        const weakCards = state.cards.filter(c => (c.state ?? 0) <= 1 || (c.lapses || 0) >= 3).length;
        const daysLeft = state.examDate
          ? Math.max(0, Math.ceil((new Date(state.examDate) - new Date()) / 86400000))
          : null;
        const mode = daysLeft !== null
          ? (daysLeft <= 3 ? 'final_sprint' : daysLeft <= 10 ? 'exam_week' : 'normal')
          : 'normal';
        const challengeMultiplier = mode === 'final_sprint' ? 0.9 : mode === 'exam_week' ? 1.15 : 1;
        const goalMultiplier = state.dailyGoalLevel === 'casual' ? 0.5 : state.dailyGoalLevel === 'intensive' ? 2.0 : 1.0;
        const reviewTarget = Math.max(5, Math.min(50, Math.ceil(((dueCards + weakCards * 0.4) / 2) * challengeMultiplier * goalMultiplier)));
        const grammarTarget = Math.max(2, Math.min(15, Math.ceil((Math.max(1, weakCards) / 10) * challengeMultiplier * goalMultiplier)));

        const challengeHistory = { ...state.challengeHistory };
        if (state.dailyChallenge?.date && state.dailyChallenge.date !== today) {
          challengeHistory[state.dailyChallenge.date] = {
            completedAt: state.dailyChallenge.completedAt,
            reviewTarget: state.dailyChallenge.reviewTarget,
            grammarTarget: state.dailyChallenge.grammarTarget,
            reviewDone: state.dailyChallenge.reviewDone,
            grammarDone: state.dailyChallenge.grammarDone,
          };
        }

        trackEvent('daily_challenge_generated', { reviewTarget, grammarTarget });
        return {
          challengeHistory,
          dailyChallenge: {
            date: today,
            mode,
            reviewTarget,
            grammarTarget,
            reviewDone: 0,
            grammarDone: 0,
            completedAt: null,
          },
        };
      }),

      updateChallengeProgress: (type, amount = 1) => set(state => {
        const challenge = state.dailyChallenge;
        if (!challenge) return state;
        if (challenge.completedAt) return state;

        const nextChallenge = { ...challenge };
        if (type === 'review') {
          nextChallenge.reviewDone = Math.min(nextChallenge.reviewTarget, nextChallenge.reviewDone + amount);
        } else if (type === 'grammar') {
          nextChallenge.grammarDone = Math.min(nextChallenge.grammarTarget, nextChallenge.grammarDone + amount);
        }

        const completed = nextChallenge.reviewDone >= nextChallenge.reviewTarget
          && nextChallenge.grammarDone >= nextChallenge.grammarTarget;

        if (completed) {
          nextChallenge.completedAt = new Date().toISOString();
          const challengeHistory = {
            ...state.challengeHistory,
            [nextChallenge.date]: {
              completedAt: nextChallenge.completedAt,
              reviewTarget: nextChallenge.reviewTarget,
              grammarTarget: nextChallenge.grammarTarget,
            }
          };
          trackEvent('daily_challenge_completed', { date: nextChallenge.date });
          return {
            dailyChallenge: nextChallenge,
            challengeHistory,
          };
        }

        return { dailyChallenge: nextChallenge };
      }),

      getChallengeStats: () => {
        const challenge = get().dailyChallenge;
        if (!challenge) return null;
        const reviewPct = Math.round((challenge.reviewDone / Math.max(1, challenge.reviewTarget)) * 100);
        const grammarPct = Math.round((challenge.grammarDone / Math.max(1, challenge.grammarTarget)) * 100);
        const totalPct = Math.round(((reviewPct + grammarPct) / 2));
        return {
          ...challenge,
          reviewPct,
          grammarPct,
          totalPct,
          complete: !!challenge.completedAt,
        };
      },

      setInstallPromptAccepted: () => set(state => ({
        installPrompt: {
          ...state.installPrompt,
          accepted: true,
        },
      })),

      dismissInstallPrompt: () => set(state => ({
        installPrompt: {
          ...state.installPrompt,
          dismissedAt: new Date().toISOString(),
          accepted: false,
        },
      })),

      trackInstallPromptShown: () => {
        const { installPrompt } = get();
        trackEvent('install_prompt_shown', { surface: installPrompt.variant });
      },

      trackInstallPromptAccepted: () => {
        const { installPrompt } = get();
        trackEvent('install_prompt_accepted', { surface: installPrompt.variant });
      },

      shouldShowInstallPrompt: () => {
        const { installPrompt, studyHistory, challengeHistory } = get();
        if (installPrompt.accepted) return false;

        const activeStudyDays = Object.values(studyHistory).filter(entry => entry.reviews > 0).length;
        const completedChallenges = Object.keys(challengeHistory).length;
        const recentlyDismissed = installPrompt.dismissedAt
          ? (Date.now() - new Date(installPrompt.dismissedAt).getTime()) < 3 * 86400000
          : false;

        return !recentlyDismissed && (activeStudyDays >= 3 || completedChallenges >= 2);
      },

      // AI actions (Phase 2)
      incrementAICalls: () => set(state => {
        const today = getTodayISO();
        const ai = { ...state.ai };
        if (ai.dailyCallsDate !== today) {
          ai.dailyCalls = 1;
          ai.dailyCallsDate = today;
        } else {
          ai.dailyCalls += 1;
        }
        return { ai };
      }),

      resetDailyCallsIfNeeded: () => set(state => {
        const today = getTodayISO();
        if (state.ai.dailyCallsDate !== today) {
          return { ai: { ...state.ai, dailyCalls: 0, dailyCallsDate: today } };
        }
        return state;
      }),

      addRoleplayHistory: (entry) => set(state => {
        trackEvent('roleplay_completed', {
          scenarioId: entry.scenarioId,
          score: entry.score,
          turns: entry.turns,
        });
        return {
          ai: {
            ...state.ai,
            roleplayHistory: [
              { ...entry, date: new Date().toISOString() },
              ...state.ai.roleplayHistory,
            ].slice(0, 100), // keep last 100
          }
        };
      }),

      addCikguMessage: (message) => set(state => ({
        ai: {
          ...state.ai,
          cikguHistory: [
            ...state.ai.cikguHistory,
            { ...message, timestamp: Date.now() },
          ].slice(-50), // keep last 50
        }
      })),

      clearCikguHistory: () => set(state => ({
        ai: { ...state.ai, cikguHistory: [] }
      })),

      // Cognitive Profile Actions (Phase 3 TS Core Agent)
      logCognitiveMistake: (mistake) => set(state => {
        const profile = state.cognitiveProfile;
        const newMistake = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...mistake
        };
        return {
          cognitiveProfile: {
            ...profile,
            recentMistakes: [newMistake, ...profile.recentMistakes].slice(0, 100) // keep last 100
          }
        };
      }),

      addMasteredConcept: (conceptId) => set(state => {
        const profile = state.cognitiveProfile;
        if (profile.masteredConcepts.includes(conceptId)) return state;
        return {
          cognitiveProfile: {
            ...profile,
            masteredConcepts: [...profile.masteredConcepts, conceptId]
          }
        };
      }),

      // Confidence tracking actions (v6, extended v7 with optional mode)
      logConfidence: (word, level, correct, mode) => set(state => ({
        confidenceLog: [...state.confidenceLog, {
          word, level, correct, ts: Date.now(),
          ...(mode ? { mode } : {}),
        }].slice(-500),  // Keep last 500 entries
      })),

      getConfidenceCalibration: () => {
        const { confidenceLog } = get();
        if (confidenceLog.length < 5) return null;

        const byLevel = { 1: null, 2: null, 3: null };
        const levelEntries = { 1: [], 2: [], 3: [] };

        confidenceLog.forEach(e => {
          if (levelEntries[e.level]) levelEntries[e.level].push(e);
        });

        Object.keys(byLevel).forEach(l => {
          const entries = levelEntries[l];
          if (entries.length >= 3) {
            const correct = entries.filter(e => e.correct).length;
            byLevel[l] = Math.round((correct / entries.length) * 100);
          }
        });

        // Overconfident: said "Certain" but got wrong
        const certainEntries = levelEntries[3];
        const overconfidentPct = certainEntries.length > 0
          ? Math.round((certainEntries.filter(e => !e.correct).length / certainEntries.length) * 100)
          : 0;

        // Underconfident: said "Unsure" but got right
        const unsureEntries = levelEntries[1];
        const underconfidentPct = unsureEntries.length > 0
          ? Math.round((unsureEntries.filter(e => e.correct).length / unsureEntries.length) * 100)
          : 0;

        return {
          totalEntries: confidenceLog.length,
          byLevel,
          overconfidentPct,
          underconfidentPct,
        };
      },

      // Cluster B actions (v7)
      logMistakeReason: (mistakeId, reason) => set(state => ({
        mistakeReasons: { ...state.mistakeReasons, [mistakeId]: reason },
      })),

      logSessionFeedback: ({ deck, accuracy, perceived }) => set(state => ({
        sessionFeedback: [...state.sessionFeedback, {
          ts: Date.now(), deck, accuracy, perceived,
        }].slice(-100),
      })),

      logReflection: ({ bestMode, note }) => set(state => ({
        reflections: [...state.reflections, {
          ts: Date.now(), bestMode, note: note || '',
        }].slice(-100),
      })),

      // Cluster B getter — certain-but-wrong words (the hypercorrection set),
      // deduped, most-recent-first. Optional sinceTs narrows the window (the
      // SessionSummary panel passes the session start); default = last 14 days.
      getHypercorrectionTargets: (sinceTs) => {
        const { confidenceLog } = get();
        const cutoff = sinceTs ?? (Date.now() - 14 * 24 * 60 * 60 * 1000);
        const words = [];
        const seen = new Set();
        for (let i = confidenceLog.length - 1; i >= 0; i--) {
          const e = confidenceLog[i];
          if (e.ts >= cutoff && e.level === 3 && !e.correct && !seen.has(e.word)) {
            seen.add(e.word);
            words.push(e.word);
          }
        }
        return words;
      },

      // Cluster E actions (v7) — identity/motivation prefs ride the cloud blob,
      // so route through commitPrefMutation (stamp + push) — see P1-1.
      setIdealSelf: (text) => get().commitPrefMutation(state => ({
        identity: { ...state.identity, idealSelf: text || '' },
      })),

      // v23 — For You goal model. Preset shapes the "Toward your goal" shelf.
      setGoalPreset: (goalPreset) => get().commitPrefMutation(state => ({
        identity: { ...state.identity, goalPreset: goalPreset || null },
      })),

      // v23 — "Still remember these?" customization. Delegates the mode→days
      // rule to the pure resolveRecallProbe so it stays tested in one place.
      setRecallProbe: (patch) => get().commitPrefMutation(state => ({
        recallProbe: resolveRecallProbe(patch || {}, state.recallProbe || RECALL_PROBE_DEFAULT),
      })),

      setIdentityLabel: (label) => get().commitPrefMutation(state => ({
        identity: {
          ...state.identity,
          label,
          identityChosenAt: state.identity.identityChosenAt || new Date().toISOString(),
        },
      })),

      setStudyCue: (cue) => get().commitPrefMutation(state => ({
        identity: { ...state.identity, cue },
      })),

      markSessionStart: () => set({ lastSessionAt: new Date().toISOString() }),

      // PDF reader prefs (v24) — remember which view the user last used.
      // Blob-only prefs → commitPrefMutation (stamp + push), see P1-1.
      setPdfLayoutView: (on) => get().commitPrefMutation(state => ({
        pdfReader: { ...state.pdfReader, layoutView: !!on },
      })),

      // PDF sentence-reveal render location (v25) — 'inline' slide-down or 'sheet' bottom panel.
      setPdfSentenceRender: (mode) => get().commitPrefMutation(state => ({
        pdfReader: { ...state.pdfReader, sentenceRender: mode === 'sheet' ? 'sheet' : 'inline' },
      })),

      // PDF beginner auto-help (v28) — on a dense page, auto-show English help
      // instead of asking (still Malay-first, still one-tap to hide).
      setPdfAutoHelpDensePages: (on) => get().commitPrefMutation(state => ({
        pdfReader: { ...state.pdfReader, autoHelpDensePages: !!on },
      })),

      // PDF OCR language (v29) — 'ms' (Malay, default) | 'en'. Drives which
      // Tesseract traineddata the past-paper photo reader loads.
      setOcrLang: (lang) => get().commitPrefMutation(state => ({
        pdfReader: { ...state.pdfReader, ocrLang: lang === 'en' ? 'en' : 'ms' },
      })),

      // Sharper-read upload consent (v30) — true once the user ticks "Don't ask
      // again" on the one-time consent dialog. Consent to the UX flow only; the
      // BYOK keys themselves stay in per-provider localStorage, never here.
      setVisionConsent: (on) => get().commitPrefMutation(state => ({
        pdfReader: { ...state.pdfReader, visionConsent: !!on },
      })),

      // Audio transcription language (v33) — 'ms' (Malay, default) | 'en'. Drives
      // the Whisper language hint for the "study from a recording" reader.
      setAsrLang: (lang) => get().commitPrefMutation(state => ({
        pdfReader: { ...state.pdfReader, asrLang: lang === 'en' ? 'en' : 'ms' },
      })),

      // Exam Rehearsal subject (v27) — 'ms' | 'en'. Drives pickRehearsalPassage's pool.
      setExamRehearsalLang: (lang) => get().commitPrefMutation({ examRehearsalLang: lang === 'en' ? 'en' : 'ms' }),

      // Study language (v34) — 'ms' | 'en'. Scopes the deck/queue/dashboard to one language.
      setStudyLang: (lang) => get().commitPrefMutation({ studyLang: lang === 'en' ? 'en' : 'ms' }),

      // Translation preferences (v8)
      setTranslationProvider: (provider) => get().commitPrefMutation(state => ({
        translation: { ...state.translation, preferredProvider: provider },
      })),
      setTranslationComparisonLink: (show) => get().commitPrefMutation(state => ({
        translation: { ...state.translation, showComparisonLink: !!show },
      })),
      setTranslationCacheToCloud: (enabled) => get().commitPrefMutation(state => ({
        translation: { ...state.translation, cacheToCloud: !!enabled },
      })),

      // Writing tutor settings (v8)
      setWritingTutorProvider: (provider) => get().commitPrefMutation(state => ({
        writingTutor: { ...state.writingTutor, provider },
      })),
      setWritingTutorAutoDetect: (enabled) => get().commitPrefMutation(state => ({
        writingTutor: { ...state.writingTutor, autoDetectFormat: !!enabled },
      })),

      // Writing tutor history (v8)
      logWritingFeedback: (entry) => {
        const record = {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          ...entry,
        };
        set(state => ({
          writingHistory: [
            ...state.writingHistory,
            record,
          ].slice(-100), // cap at 100 entries
        }));
        trackEvent('writing_analyzed', {
          lang: record.lang,
          format: record.format,
          band: record.band,
          words: record.words,
        });
        get().enqueueSyncEventAction('writing_feedback_logged', { entry: record });
      },

      hydrateCloudData: async () => {
        if (!SUPABASE_CONFIG.enabled || get().userRole === 'static') return false;
        try {
          const {
            fetchCloudCards,
            fetchCloudWritingHistory,
            fetchCloudSpeakingHistory,
            fetchCloudDeletedCardKeys,
            syncCloudSnapshot,
          } = await import('../lib/cloudSync');
          const [cloudCards, cloudWriting, cloudSpeaking, deletedKeys] = await Promise.all([
            fetchCloudCards(),
            fetchCloudWritingHistory(),
            fetchCloudSpeakingHistory(),
            fetchCloudDeletedCardKeys(),
          ]);
          let mergedCards = [];
          let mergedWriting = [];
          let mergedSpeaking = [];
          set(state => {
            const localCardKeys = new Set(state.cards.map(card => `${card.m}::${card.t || ''}`));
            const missingCards = cloudCards.filter(card => !localCardKeys.has(`${card.m}::${card.t || ''}`));
            const localWritingKeys = new Set(state.writingHistory.map(entry => entry.id || `${entry.ts}:${entry.lang}:${entry.format}:${entry.words || ''}`));
            const missingWriting = cloudWriting.filter(entry => !localWritingKeys.has(entry.id || `${entry.ts}:${entry.lang}:${entry.format}:${entry.words || ''}`));
            const localSpeakingKeys = new Set((state.speakingHistory || []).map(entry => entry.id || `${entry.ts}:${entry.scenarioId}:${entry.turnIndex}:${entry.words || ''}`));
            const missingSpeaking = cloudSpeaking.filter(entry => !localSpeakingKeys.has(entry.id || `${entry.ts}:${entry.scenarioId}:${entry.turnIndex}:${entry.words || ''}`));
            // P2-C2: tombstone wins on sign-in. After the add-missing union,
            // DROP any local card whose m::t key the cloud has tombstoned —
            // otherwise the snapshot push below (syncCloudSnapshot →
            // upsertCloudCards, deleted:false) would resurrect a card another
            // device deleted. A later explicit addCard re-clears the tombstone
            // going forward (card_added → upsert deleted:false). cloudCards is
            // already tombstone-free, so missingCards can't reintroduce them.
            mergedCards = [...state.cards, ...missingCards]
              .filter(card => !deletedKeys.has(`${card.m}::${card.t || ''}`));
            mergedWriting = [...state.writingHistory, ...missingWriting]
              .sort((a, b) => new Date(a.ts) - new Date(b.ts))
              .slice(-100);
            mergedSpeaking = [...(state.speakingHistory || []), ...missingSpeaking]
              .sort((a, b) => new Date(b.ts) - new Date(a.ts))
              .slice(0, 100);
            return {
              cards: mergedCards,
              writingHistory: mergedWriting,
              speakingHistory: mergedSpeaking,
            };
          });
          const uploaded = await syncCloudSnapshot({
            cards: mergedCards,
            writingHistory: mergedWriting,
            speakingHistory: mergedSpeaking,
          });
          trackEvent('cloud_data_hydrated', {
            cards: cloudCards.length,
            writingEntries: cloudWriting.length,
            speakingEntries: cloudSpeaking.length,
            uploadedCards: uploaded.cards,
            uploadedWritingEntries: uploaded.writingEntries,
            uploadedSpeakingEntries: uploaded.speakingEntries,
          });
          return true;
        } catch (err) {
          // Distinguish a fatal failure (schema / permission drift) from a
          // transient network blip. Fatal hydrate failures were swallowed
          // silently for 9+ days during the 2026-05-29 user_cards outage —
          // a telemetry event nobody watched. Surface fatal ones LOUDLY so the
          // next drift is caught immediately, not months later. Transient
          // errors stay quiet (they self-heal on the next sign-in).
          let fatal = false;
          try {
            const { classifySyncError } = await import('../lib/syncEngine');
            fatal = classifySyncError(err) === 'fatal';
          } catch { /* classifier unavailable — leave fatal=false */ }
          if (fatal) {
            console.error('[sync] hydrateCloudData failed with a non-transient error (likely Supabase schema/permission drift — check table columns):', err?.message);
          }
          trackEvent('cloud_data_hydrate_failed', { error: err?.message || 'unknown', fatal });
          return false;
        }
      },

      // Speaking history (v8) — used by /speaking page (og's grader). Syncs to
      // Supabase via the queue when cloud sync is enabled.
      logSpeakingSession: (entry) => {
        const record = {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          ...entry,
        };
        set(state => ({
          speakingHistory: [
            ...state.speakingHistory,
            record,
          ].slice(-100),
        }));
        trackEvent('speaking_attempt', {
          topicId: record.topicId,
          band: record.band,
          durationSec: record.durationSec,
          wordCount: record.wordCount,
        });
        get().enqueueSyncEventAction('speaking_attempt_logged', { entry: record });
      },

      // Exam rehearsal (v12)
      logExamAttempt: (entry) => {
        const record = {
          id: crypto.randomUUID(),
          ts: new Date().toISOString(),
          ...entry,
        };
        set(state => ({
          examAttempts: [
            record,
            ...state.examAttempts,
          ].slice(0, 50), // cap at 50 attempts
        }));
        trackEvent('exam_rehearsal_completed', {
          passageId: record.passageId,
          readiness: record.readinessScore,
          comp: record.comprehensionPct,
          writing: record.writingBand,
          speaking: record.speakingBand,
        });
        get().enqueueSyncEventAction('exam_attempt_logged', { entry: record });
      },

      // Composite "Exam Readiness %" — 0..100, via the shared composeReadiness()
      // scorer (comp 0.30 / writing 0.35 / speaking 0.35, + listening 0.30 when an
      // attempt recorded it — see src/lib/examReadiness.js). Most-recent attempt
      // anchored at 70% weight, prior three at 30%.
      getExamReadiness: () => {
        const { examAttempts } = get();
        if (!examAttempts?.length) return null;
        const latest = composeReadiness(examAttempts[0]);
        const prior = examAttempts.slice(1, 4);
        const priorAvg = prior.length
          ? Math.round(prior.reduce((sum, a) => sum + composeReadiness(a), 0) / prior.length)
          : latest;
        return {
          latest,
          smoothed: Math.round(latest * 0.7 + priorAvg * 0.3),
          attempts: examAttempts.length,
          lastAttemptAt: examAttempts[0]?.ts,
        };
      },

      // FSRS-ish scheduling: high readiness pushes the next attempt out, weak
      // attempts pull it in. Days = clamp(round(readiness/100 * 30), 3, 30).
      getNextExamDue: () => {
        const { examAttempts } = get();
        if (!examAttempts?.length) return { dueNow: true, daysLeft: 0 };
        const latest = examAttempts[0];
        const readiness = get().getExamReadiness()?.smoothed || 0;
        const intervalDays = Math.max(3, Math.min(30, Math.round((readiness / 100) * 30)));
        const lastAt = new Date(latest.ts).getTime();
        const dueAt = lastAt + intervalDays * 86400000;
        const now = Date.now();
        const daysLeft = Math.ceil((dueAt - now) / 86400000);
        return {
          dueNow: now >= dueAt,
          daysLeft: Math.max(0, daysLeft),
          intervalDays,
          dueAt: new Date(dueAt).toISOString(),
        };
      },

      // PDF reader recents (v8) — newest-first, dedup by name+sizeKB, cap 10
      addPdfRecent: (entry) => set(state => {
        const key = `${entry.name}|${entry.sizeKB}`;
        const filtered = state.pdfRecents.filter(p => `${p.name}|${p.sizeKB}` !== key);
        trackEvent('pdf_opened', { sizeKB: entry.sizeKB, pages: entry.pages });
        return {
          pdfRecents: [
            { addedAt: new Date().toISOString(), ...entry },
            ...filtered,
          ].slice(0, 10),
        };
      }),

      // Cluster E getters
      getDaysSinceLastSession: () => {
        const { lastSessionAt } = get();
        if (!lastSessionAt) return null;
        const ms = Date.now() - new Date(lastSessionAt).getTime();
        return Math.floor(ms / (24 * 60 * 60 * 1000));
      },

      isComeback: () => {
        const days = get().getDaysSinceLastSession();
        return days !== null && days >= 7;
      },

      // User role actions (v6)
      // ── Auth actions (v19) ──────────────────────────────────
      setAuthUser: (user) => set(s => ({
        auth: { ...s.auth, user, showModal: false },
        // Elevate to 'enhanced' when signed in (unless already higher)
        userRole: s.userRole === 'static' ? 'enhanced' : s.userRole,
      })),

      clearAuthUser: () => set(s => ({
        auth: { ...s.auth, user: null },
        userRole: 'static',
      })),

      showAuthModal: () => set(s => ({ auth: { ...s.auth, showModal: true } })),
      hideAuthModal: () => set(s => ({ auth: { ...s.auth, showModal: false } })),

      // Snapshot the current store to localStorage before any cloud overwrite.
      // Restored with restoreFromBackup() if the user wants to undo.
      backupState: () => {
        try {
          const snapshot = JSON.stringify(get());
          localStorage.setItem('igcse-malay-backup', snapshot);
        } catch (e) { console.warn('[backupState]', e) }
      },

      restoreFromBackup: () => {
        try {
          const raw = localStorage.getItem('igcse-malay-backup');
          if (raw) useStore.setState(JSON.parse(raw));
        } catch (e) { console.warn('[restoreFromBackup]', e) }
      },

      // Debounced cloud sync — safe to call after any state mutation.
      // Only fires when a user is signed in; no-ops for guests.
      triggerCloudSync: () => {
        if (_cloudSyncTimer) clearTimeout(_cloudSyncTimer);
        _cloudSyncTimer = setTimeout(async () => {
          const s = get();
          if (!s.auth?.user) return;
          try {
            const { pushStateBlob } = await import('../config/supabase');
            await pushStateBlob(s);
            set(st => ({ auth: { ...st.auth, lastCloudSyncAt: Date.now() } }));
          } catch (e) {
            console.warn('[cloud sync]', e.message);
          }
        }, 5000);
      },

      // Funnel for blob-only persisted-PREFERENCE mutations (exam date, theme,
      // daily goal, identity, mistake-reviewed flag, guide-seen, PDF /
      // translation / writing-tutor / a11y prefs, …) — everything that rides the
      // `user_state` cloud blob but is NOT a card / writing / speaking event
      // (those go through enqueueSyncEventAction, which already stamps + pushes).
      // Stamps `lastMutationAt` for AuthGuard's newer-wins tie-break AND kicks the
      // debounced blob push, so a settings-only change survives a signed-in
      // reload instead of being silently overwritten by the cloud restore.
      // Single-sourced on purpose (NOT ~10 copy-paste stamps) — see P1-1 in
      // docs/reviews/2026-06-12-full-codebase-review.md. Callers that may no-op
      // (e.g. markGuideSeen on an unknown tier) must guard BEFORE calling this so
      // a non-change doesn't bump the stamp or schedule a needless push.
      commitPrefMutation: (patch) => {
        set(state => {
          const next = typeof patch === 'function' ? patch(state) : patch;
          return { ...next, lastMutationAt: new Date().toISOString() };
        });
        get().triggerCloudSync();
      },

      setUserRole: (role) => set({ userRole: role }),

      setDailyGoalLevel: (level) => {
        const goal = level === 'casual' ? 10 : level === 'intensive' ? 40 : 20;
        trackEvent('daily_goal_updated', { level, goal });
        get().commitPrefMutation({ dailyGoalLevel: level, dailyGoal: goal });
      },

      // Interleave settings (v6)
      setInterleaveSettings: (settings) => get().commitPrefMutation(state => ({
        interleaveSettings: { ...state.interleaveSettings, ...settings },
      })),

      addCard: (card) => {
        let addedCard = null;
        set(state => {
          const lang = card.lang || state.studyLang || 'ms';
          // Dedupe on (m, t, lang) so an English card is never blocked by a
          // same-spelled Malay card in the same deck (e.g. "main") (v34).
          if (state.cards.some(c => c.m === card.m && c.t === card.t && cardLang(c) === lang)) return state;
          const fsrsState = createNewCardState();
          addedCard = { ...card, lang, ...fsrsState };
          return { cards: [...state.cards, addedCard] };
        });
        if (addedCard) get().enqueueSyncEventAction('card_added', { card: addedCard });
      },

      addCards: (newCards) => {
        let addedCards = [];
        set(state => {
          const studyLang = state.studyLang || 'ms';
          const langOf = (c) => c.lang || studyLang;
          // Dedupe on (m, t, lang) — see addCard (v34).
          const existing = new Set(state.cards.map(c => `${c.m}::${c.t}::${cardLang(c)}`));
          const unique = newCards.filter(c => !existing.has(`${c.m}::${c.t}::${langOf(c)}`));
          addedCards = unique.map(c => ({ ...c, lang: langOf(c), ...createNewCardState() }));
          return { cards: [...state.cards, ...addedCards] };
        });
        if (addedCards.length) get().enqueueSyncEventAction('cards_added', { cards: addedCards });
      },

      // v34 — seed the English starter deck from the reversed dictionary. Lazy import
      // keeps dictionaryEn out of the eager bundle (N4); try/catch so a load failure
      // can never break the dashboard. Returns the count actually added (addCards dedupes).
      seedEnglishStarter: async () => {
        try {
          const { default: DICTIONARY_EN } = await import('../data/dictionaryEn');
          const cards = Object.entries(DICTIONARY_EN).map(([en, ms]) => ({
            m: en, e: ms, lang: 'en', t: 'English', p: 'n', ex: `${en} — ${ms}`, mn: '',
          }));
          const before = get().cards.length;
          get().addCards(cards);
          return get().cards.length - before;
        } catch {
          return 0;
        }
      },

      removeCard: (malay, deck) => {
        let removed = false;
        set(state => {
          removed = state.cards.some(c => c.m === malay && c.t === deck);
          return {
            cards: state.cards.filter(c => !(c.m === malay && c.t === deck))
          };
        });
        if (removed) get().enqueueSyncEventAction('card_removed', { malay, deck });
      },

      // Rating: 1=Again, 2=Hard, 3=Good, 4=Easy (FSRS Rating enum)
      // Scoped to a single deck copy by `m::t` (card identity everywhere else):
      // a word saved in two decks must reschedule ONLY the studied copy, never
      // clobber its sibling in another deck (P2-C1). Mirrors removeCard(malay, deck).
      reviewCardAction: (malay, deck, rating) => {
        get().ensureDailyChallenge();
        let cardToLog = null;
        set(state => {
          const today = new Date().toDateString();
          const isoDate = getTodayISO();
          const cards = state.cards.map(c => {
            if (c.m !== malay || c.t !== deck) return c;
            const fsrsFields = reviewCard(c, rating);
            return { ...c, ...fsrsFields };
          });
          const prev = state.studyHistory[isoDate] || { reviews: 0, minutes: 0 };

          if (rating === Rating.Again) {
            cardToLog = state.cards.find(c => c.m === malay && c.t === deck) || null;
          }

          return {
            cards,
            reviewedToday: state.lastStudyDate === today ? state.reviewedToday + 1 : 1,
            lastStudyDate: today,
            studyHistory: {
              ...state.studyHistory,
              [isoDate]: { ...prev, reviews: prev.reviews + 1 },
            },
          };
        });

        if (cardToLog) {
          get().addMistake({
            type: 'vocab',
            source: 'study',
            language: 'ms',
            category: 'vocab',
            severity: 'low',
            word: cardToLog.m,
            correct: cardToLog.e,
            given: '',
          });
        }

        get().enqueueSyncEventAction('card_reviewed', { malay, deck, rating });
        get().updateChallengeProgress('review', 1);
      },

      loadTopicPack: (topicName) => {
        const words = TOPIC_PACKS[topicName] || [];
        const newCards = words
          .filter(m => DICTIONARY[m])
          .map(m => ({
            m, e: DICTIONARY[m], t: topicName,
            p: 'n', ex: EXAMPLES[m] || `${m} (${DICTIONARY[m]}).`, mn: '',
          }));
        get().addCards(newCards);
      },

      setActiveDeck: (deck) => set({ activeDeck: deck }),

      getDecks: () => {
        const decks = new Set(get().cards.map(c => c.t));
        return ['All', ...Array.from(decks).sort()];
      },

      getFilteredCards: () => {
        const { cards, activeDeck } = get();
        if (activeDeck === 'All') return cards;
        return cards.filter(c => c.t === activeDeck);
      },

      getDueCount: () => getDueCards(get().cards).length,

      // Streak
      updateStreak: () => {
        let freezeConsumed = false;
        let freezeAwarded = false;
        let milestoneReached = null;
        set(state => {
          const today = new Date().toDateString();
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const streak = { ...state.streak };
          let streakFreezes = state.streakFreezes;
          let streakFreezeLog = state.streakFreezeLog;
          if (streak.last === today) return state;
          if (streak.last === yesterday) {
            streak.count++;
          } else if (streak.last && streak.last !== yesterday && streakFreezes > 0) {
            // Fairness mechanic: preserve streak by consuming a freeze.
            streakFreezes -= 1;
            freezeConsumed = true;
            streakFreezeLog = [...streakFreezeLog, {
              id: crypto.randomUUID(),
              type: 'consumed',
              reason: 'missed_day_protection',
              at: new Date().toISOString(),
              streakCount: streak.count,
            }].slice(-100);
          } else {
            streak.count = 1;
          }
          streak.last = today;
          if (checkStreakMilestone(streak.count)) {
            milestoneReached = streak.count;
            streakFreezes += 1;
            freezeAwarded = true;
            streakFreezeLog = [...streakFreezeLog, {
              id: crypto.randomUUID(),
              type: 'awarded',
              reason: `milestone_${streak.count}`,
              at: new Date().toISOString(),
              streakCount: streak.count,
            }].slice(-100);
          }
          return { streak, streakFreezes, streakFreezeLog };
        });

        if (milestoneReached) {
          setTimeout(() => fireConfetti(4000), 500);
        }

        get().enqueueSyncEventAction('streak_updated', { streak: get().streak.count });
        if (freezeConsumed) {
          trackEvent('streak_freeze_consumed', { streak: get().streak.count, freezesLeft: get().streakFreezes });
        }
        if (freezeAwarded && milestoneReached) {
          trackEvent('streak_freeze_awarded', { milestone: milestoneReached, freezes: get().streakFreezes });
        }
      },

      getStreak: () => {
        const { streak } = get();
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (streak.last !== today && streak.last !== yesterday) return 0;
        return streak.count;
      },

      // Grammar aggregate stats (kept for backward compat)
      grammarStats: { imbuhan: { correct: 0, total: 0 }, tense: { correct: 0, total: 0 }, error: { correct: 0, total: 0 }, transform: { correct: 0, total: 0 } },

      updateGrammarStats: (type, correct) => set(state => {
        const prev = state.grammarStats[type] || { correct: 0, total: 0 }
        return {
          grammarStats: {
            ...state.grammarStats,
            [type]: { correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 },
          }
        }
      }),

      resetGrammarStats: (type) => set(state => ({
        grammarStats: { ...state.grammarStats, [type]: { correct: 0, total: 0 } }
      })),

      // Grammar SRS actions (Phase 1B)
      reviewGrammarDrill: (drillId, correct) => {
        get().ensureDailyChallenge();
        set(state => {
          const existing = state.grammarCards[drillId];
          let cardState;
          if (!existing) {
            // First time seeing this drill — create new card and review it
            const newCard = createNewCardState();
            cardState = reviewCard(newCard, correct ? Rating.Good : Rating.Again);
          } else {
            cardState = reviewCard(existing, correct ? Rating.Good : Rating.Again);
          }

          return {
            grammarCards: { ...state.grammarCards, [drillId]: cardState },
          };
        });

        if (!correct) {
          get().addMistake({
            type: 'grammar',
            source: drillId.split('-')[0],
            language: 'ms',
            category: 'imbuhan',
            severity: 'low',
            word: drillId,
            correct: '',
            given: '',
          });
        }

        get().enqueueSyncEventAction('grammar_reviewed', { drillId, correct });
        get().updateChallengeProgress('grammar', 1);
      },

      getDueGrammarDrills: (type) => {
        const { grammarCards } = get();
        const now = new Date();
        return Object.entries(grammarCards)
          .filter(([id, card]) => {
            if (type && !id.startsWith(type)) return false;
            return new Date(card.due) <= now;
          })
          .map(([id]) => id);
      },

      // Mistake actions (Phase 1C, extended v11 with category/severity/surface/promotion)
      // Mistake record shape:
      //   { id, timestamp, type, source, language, category, severity,
      //     word, correct, given, surface, correction, note,
      //     promotedCardId, attempts, reviewed, lastReviewedAt }
      // Returns: { added, bumped, promotedCard } where promotedCard is the
      // FSRS card object (with m, e, t) when auto-promotion fires, or null.
      // The global <MistakePromotedToast /> in Layout subscribes to the
      // promoted-mistake count delta, so callers don't need to forward this
      // — the return value exists for explicit-trigger or testing scenarios.
      addMistake: (mistake) => {
        let added = null;
        let bumped = null;
        let promotedCard = null;
        set(state => {
          const now = Date.now();
          const language = mistake.language || (mistake.lang === 'eng' ? 'en' : mistake.lang) || 'ms';
          const category = MISTAKE_CATEGORIES.includes(mistake.category)
            ? mistake.category
            : (mistake.type === 'vocab' ? 'vocab'
              : mistake.type === 'grammar' ? 'imbuhan'
              : mistake.type === 'comprehension' ? 'comprehension'
              : 'other');
          const severity = MISTAKE_SEVERITIES.includes(mistake.severity) ? mistake.severity : 'med';
          const surface = mistake.surface || '';
          const word = mistake.word || '';
          // Dedupe key: type + canonical word + surface hash (within 24h).
          const dedupeKey = `${mistake.type}::${word}::${hashString(surface)}::${language}`;
          const cutoff = now - 86400000;
          const existingIdx = state.mistakes.findIndex(m =>
            m._k === dedupeKey && m.timestamp >= cutoff
          );
          if (existingIdx !== -1) {
            // Bump attempts + refresh timestamp instead of duplicating
            bumped = { ...state.mistakes[existingIdx] };
            bumped.attempts = (bumped.attempts || 1) + 1;
            bumped.timestamp = now;
            // Severity escalates if it keeps coming back
            if (bumped.attempts >= 3 && bumped.severity === 'low') bumped.severity = 'med';
            if (bumped.attempts >= 5 && bumped.severity === 'med') bumped.severity = 'high';
            const next = state.mistakes.slice();
            next[existingIdx] = bumped;
            return { mistakes: next };
          }
          added = {
            id: crypto.randomUUID(),
            type: mistake.type,
            source: mistake.source || '',
            language,
            category,
            severity,
            word,
            correct: mistake.correct || '',
            given: mistake.given || '',
            surface,
            correction: mistake.correction || '',
            note: mistake.note || '',
            promotedCardId: null,
            attempts: 1,
            reviewed: false,
            lastReviewedAt: null,
            timestamp: now,
            _k: dedupeKey,
          };
          const nextMistakes = [...state.mistakes, added];
          // Pruning: once the active list grows past the threshold, move the
          // oldest *resolved* (reviewed) mistakes into the archive. Unresolved
          // mistakes stay in the active list so the journal/Smart Session can
          // still surface them.
          if (nextMistakes.length > MISTAKE_PRUNE_THRESHOLD) {
            const reviewedSorted = nextMistakes
              .filter(m => m.reviewed)
              .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
            if (reviewedSorted.length > 0) {
              const toArchive = reviewedSorted.slice(0, MISTAKE_PRUNE_BATCH);
              const archiveIds = new Set(toArchive.map(m => m.id));
              const remaining = nextMistakes.filter(m => !archiveIds.has(m.id));
              const mergedHistory = [...(state.mistakeHistory || []), ...toArchive];
              // Cap history so localStorage doesn't grow without bound.
              const trimmedHistory = mergedHistory.length > MISTAKE_HISTORY_CAP
                ? mergedHistory.slice(mergedHistory.length - MISTAKE_HISTORY_CAP)
                : mergedHistory;
              return { mistakes: remaining, mistakeHistory: trimmedHistory };
            }
          }
          return { mistakes: nextMistakes };
        });

        // Auto-promote eligible vocab/imbuhan mistakes to FSRS cards. The
        // language→category eligibility (ms: vocab|imbuhan, en: vocab) lives in
        // canAutoPromoteMistake so the gloss-direction contract is in one place.
        if (added
          && added.word
          && added.correct
          && added.severity !== 'low'
          && canAutoPromoteMistake(added.language, added.category)
        ) {
          const cardKey = get().promoteMistakeToCard(added.id);
          if (cardKey) {
            // Resolve to the full card object so callers/toast have m + e + t
            // without re-querying the store. Safe to inspect here because
            // promoteMistakeToCard's set() has flushed synchronously.
            promotedCard = get().cards.find(c => c.m === cardKey) || null;
          }
        }

        if (added) {
          trackEvent('mistake_logged', {
            type: added.type, category: added.category, severity: added.severity, source: added.source,
          });
        }
        if (bumped) {
          trackEvent('mistake_repeated', {
            type: bumped.type, category: bumped.category, attempts: bumped.attempts,
          });
        }
        return { added, bumped, promotedCard };
      },

      logMistakeBatch: (entries) => {
        if (!Array.isArray(entries)) return;
        entries.forEach(e => get().addMistake(e));
      },

      promoteMistakeToCard: (mistakeId) => {
        const state = get();
        const mistake = state.mistakes.find(m => m.id === mistakeId);
        if (!mistake) return null;
        if (mistake.promotedCardId) return mistake.promotedCardId;
        // Need both a Malay headword and an English gloss.
        const m = (mistake.word || '').trim();
        const e = (mistake.correct || '').trim();
        if (!m || !e) return null;
        // If a card already exists for this word in any deck, link to it.
        const existing = state.cards.find(c => c.m === m);
        if (existing) {
          set(s => ({
            mistakes: s.mistakes.map(mm => mm.id === mistakeId ? { ...mm, promotedCardId: existing.m } : mm),
          }));
          return existing.m;
        }
        const fsrsState = createNewCardState();
        // Seed at slightly elevated difficulty so it isn't trivial.
        fsrsState.difficulty = Math.min(10, (fsrsState.difficulty || 5) + 1);
        const newCard = {
          m, e,
          lang: mistake.language === 'en' ? 'en' : 'ms', // v34 — forward-compat (Phase-1 promotion is Malay-gated)
          t: 'Mistakes',
          p: 'n',
          ex: mistake.surface || mistake.note || `${m} (${e}).`,
          mn: '',
          fromMistakeId: mistake.id,
          ...fsrsState,
        };
        set(s => ({
          cards: [...s.cards, newCard],
          mistakes: s.mistakes.map(mm => mm.id === mistakeId ? { ...mm, promotedCardId: m } : mm),
        }));
        get().enqueueSyncEventAction('card_added', { card: newCard });
        trackEvent('mistake_promoted_to_card', { category: mistake.category, source: mistake.source });
        return m;
      },

      markMistakeReviewed: (id) => get().commitPrefMutation(state => ({
        mistakes: state.mistakes.map(m =>
          m.id === id ? { ...m, reviewed: true, lastReviewedAt: Date.now() } : m
        )
      })),

      markMistakeFixed: (id) => {
        get().markMistakeReviewed(id);
      },

      clearOldMistakes: () => set(state => {
        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        return {
          mistakes: state.mistakes.filter(m => !m.reviewed || m.timestamp > thirtyDaysAgo)
        };
      }),

      // Returns top N unfixed mistakes sorted by severity weight × recency,
      // deduped by word so the queue surfaces variety.
      getFixUpQueue: (limit = 12) => {
        const { mistakes } = get();
        const now = Date.now();
        const sevWeight = { high: 3, med: 2, low: 1 };
        const seen = new Set();
        const ranked = mistakes
          .filter(m => !m.reviewed)
          .map(m => {
            const ageHrs = Math.max(1, (now - m.timestamp) / 3600000);
            // Recency boost: newer mistakes rank higher, but old high-severity ones still surface.
            const score = (sevWeight[m.severity] || 2) * (1 + Math.log10(m.attempts || 1)) / Math.sqrt(ageHrs);
            return { mistake: m, score };
          })
          .sort((a, b) => b.score - a.score)
          .filter(({ mistake }) => {
            const key = `${mistake.type}::${mistake.word || mistake.surface.slice(0, 24)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, limit)
          .map(({ mistake }) => mistake);
        return ranked;
      },

      getMistakeStats: () => {
        const { mistakes } = get();
        const active = mistakes.filter(m => !m.reviewed);
        const byCategory = {};
        const bySource = {};
        active.forEach(m => {
          byCategory[m.category] = (byCategory[m.category] || 0) + 1;
          bySource[m.type] = (bySource[m.type] || 0) + 1;
        });
        return {
          total: active.length,
          totalAllTime: mistakes.length,
          promoted: mistakes.filter(m => m.promotedCardId).length,
          fixed: mistakes.filter(m => m.reviewed).length,
          byCategory,
          bySource,
        };
      },

      // Exam date (Phase 1E) — blob-only pref → commitPrefMutation (stamp +
      // push) so a signed-in user doesn't lose the date on reload. See P1-1.
      setExamDate: (date) => get().commitPrefMutation({ examDate: date }),

      getStudyPlan: () => {
        const { cards, grammarCards, examDate } = get();
        if (!examDate) return null;

        const daysLeft = Math.ceil((new Date(examDate) - new Date()) / 86400000);
        if (daysLeft < 0) return null;

        const weakCards = cards.filter(c =>
          (c.state ?? 0) <= 1 || (c.lapses || 0) >= 3
        );
        const matureCards = cards.filter(c =>
          c.state === 2 && (c.stability || 0) >= 21
        );

        const dueGrammar = Object.entries(grammarCards)
          .filter(([, c]) => new Date(c.due) <= new Date());

        const dailyVocabTarget = Math.max(5, Math.ceil(weakCards.length / Math.max(daysLeft, 1)));
        const dailyGrammarTarget = Math.max(3, Math.ceil(dueGrammar.length / Math.max(daysLeft, 1)));

        // Identify weakest topic
        const topicWeakness = {};
        weakCards.forEach(c => {
          topicWeakness[c.t] = (topicWeakness[c.t] || 0) + 1;
        });
        const sortedTopics = Object.entries(topicWeakness).sort((a, b) => b[1] - a[1]);
        const focusTopic = sortedTopics[0]?.[0];

        const readinessPct = cards.length > 0
          ? Math.round((matureCards.length / cards.length) * 100)
          : 0;

        let phase, recommendation;
        if (daysLeft > 30) {
          phase = 'build';
          recommendation = `Build your vocabulary. Focus on ${focusTopic || 'new topics'} and learn new words daily.`;
        } else if (daysLeft > 14) {
          phase = 'strengthen';
          recommendation = `Strengthen weak areas. ${weakCards.length} cards need attention${focusTopic ? ` — especially ${focusTopic}` : ''}.`;
        } else if (daysLeft > 3) {
          phase = 'review';
          recommendation = `Review mode. Focus on due cards and grammar drills. Practice roleplay daily.`;
        } else {
          phase = 'final';
          recommendation = `Final push! Light review only. Trust your preparation and rest well.`;
        }

        return {
          daysLeft,
          dailyVocabTarget,
          dailyGrammarTarget,
          focusTopic,
          weakCardCount: weakCards.length,
          readinessPct,
          phase,
          recommendation,
        };
      },

      // Track study minutes
      addStudyMinutes: (minutes) => {
        set(state => {
          const isoDate = getTodayISO();
          const prev = state.studyHistory[isoDate] || { reviews: 0, minutes: 0 };
          return {
            studyHistory: {
              ...state.studyHistory,
              [isoDate]: { ...prev, minutes: prev.minutes + minutes },
            },
          };
        });
        get().enqueueSyncEventAction('study_minutes_logged', { minutes });
      },

      // Per-paper balance meter (v31). One call = one completed unit on a
      // surface with NO existing history array (Reading / Listening / Grammar
      // — Writing/Speaking/Exam/Vocab derive from their own slices in
      // lib/skillBalance.js). LOCAL-day keyed; keys older than 30 days are
      // pruned on write so the log can't grow unbounded. Blob-only state →
      // commitPrefMutation (stamps lastMutationAt + schedules the cloud push).
      logSkillActivity: (skill) => {
        if (!LOGGED_SKILLS.includes(skill)) return;
        const today = getTodayISO();
        const cutoff = toLocalISO(new Date(Date.now() - SKILL_LOG_RETENTION_DAYS * 86400000));
        get().commitPrefMutation(state => {
          const next = {};
          for (const [day, rec] of Object.entries(state.skillActivity || {})) {
            if (day >= cutoff) next[day] = rec; // YYYY-MM-DD compares lexicographically
          }
          const prev = next[today] || {};
          next[today] = { ...prev, [skill]: (prev[skill] || 0) + 1 };
          return { skillActivity: next };
        });
      },

      // Theme + a11y / display prefs — all blob-only → commitPrefMutation
      // (stamp + push) so a signed-in user keeps them across a reload. See P1-1.
      toggleTheme: () => get().commitPrefMutation(state => ({
        theme: state.theme === 'dark' ? 'light' : 'dark'
      })),

      setDailyGoal: (goal) => get().commitPrefMutation({ dailyGoal: goal }),
      setHighlightMode: (mode) => get().commitPrefMutation({ highlightMode: mode }),
      setTheaterModeEnabled: (v) => get().commitPrefMutation({ theaterModeEnabled: !!v }),
      setShowDictionaryImages: (v) => get().commitPrefMutation({ showDictionaryImages: !!v }),
      setDyslexicFont: (v) => get().commitPrefMutation({ dyslexicFont: !!v }),
      setHighContrast: (v) => get().commitPrefMutation({ highContrast: !!v }),
      setUseAdaptiveScaffolding: (v) => get().commitPrefMutation(state => ({
        ui: { ...(state.ui || {}), useAdaptiveScaffolding: !!v },
      })),

      // v26 — mark an "App tour" tier seen (taken OR dismissed) so the first-run
      // offer never nags again. Unknown tier is a no-op.
      markGuideSeen: (tier) => {
        const key = tier === 'quick' ? 'seenQuick' : tier === 'full' ? 'seenFull' : null
        if (!key) return // unknown tier — no-op (no stamp, no push)
        const guide = get().guide || { seenQuick: false, seenFull: false }
        if (guide[key]) return // already seen — no-op
        get().commitPrefMutation({ guide: { ...guide, [key]: true } })
      },

      // v17 — UDL Personal Interests. `id` is one of INTERESTS[].id from
      // src/lib/interests.js — store keeps a flat list of ids, no
      // validation here so the catalog can grow without a migration.
      // Each mutation enqueues a `profile_updated` sync event so the cloud
      // `profiles` row stays in step (fire-and-forget when Supabase is off).
      toggleUserInterest: (id) => {
        set(state => {
          const curr = Array.isArray(state.userInterests) ? state.userInterests : [];
          return {
            userInterests: curr.includes(id)
              ? curr.filter(x => x !== id)
              : [...curr, id],
          };
        });
        get().enqueueSyncEventAction('profile_updated', { userInterests: get().userInterests });
      },
      clearUserInterests: () => {
        set({ userInterests: [] });
        get().enqueueSyncEventAction('profile_updated', { userInterests: [] });
      },

      // Import/Export — both sides iterate the shared BACKUP_KEYS list (P2-C6),
      // so a new persisted user field can't be silently dropped on migration.
      exportData: () => {
        const s = get();
        const out = { exportDate: new Date().toISOString() };
        for (const k of BACKUP_KEYS) out[k] = s[k];
        return out;
      },

      importData: (data) => set(() => {
        const src = data || {};
        const defaults = makeBackupDefaults(); // fresh defaults for OLD files missing keys
        const next = {};
        for (const k of BACKUP_KEYS) {
          next[k] = src[k] !== undefined ? src[k] : defaults[k];
        }
        return next;
      }),

      // Anki export
      getAnkiExport: () => {
        const { cards } = get();
        let txt = '#separator:tab\n#html:true\n';
        cards.forEach(c => {
          txt += `${c.m}\t${c.e}${c.ex ? `<br><small><em>${c.ex}</em></small>` : ''}\n`;
        });
        return txt;
      },
    }),
    {
      name: 'igcse-malay-store',
      version: STORE_VERSION,
      // Runs after rehydration (storage is synchronous, so before React mounts).
      // Heals a stale persisted 'syncing' status so an interrupted flush can't
      // permanently deadlock the sync queue. See lib/syncStatus.js.
      onRehydrateStorage: () => (state) => {
        state?.reconcileSyncOnHydrate?.();
      },
      migrate: (persistedState, version) => {
        let state = { ...persistedState };

        // Migrate from v0/v1 (SM-2) to v2 (FSRS)
        if (version < 2) {
          const migratedCards = (state.cards || []).map(card => {
            if (card.stability !== undefined) return card;
            const fsrsFields = migrateFromSM2(card);
            return { ...card, ...fsrsFields };
          });
          state = {
            ...state,
            cards: migratedCards,
            grammarCards: state.grammarCards || {},
            mistakes: state.mistakes || [],
            examDate: state.examDate || null,
          };
        }

        // Migrate to v4 (engagement layer)
        if (version < 4) {
          state = {
            ...state,
            streakFreezes: state.streakFreezes || 0,
            streakFreezeLog: state.streakFreezeLog || [],
            engagementXP: state.engagementXP || 0,
            dailyChallenge: state.dailyChallenge || null,
            challengeHistory: state.challengeHistory || {},
            installPrompt: state.installPrompt || {
              accepted: false,
              dismissedAt: null,
              variant: Math.random() < 0.5 ? 'dashboard_card' : 'post_session',
            },
            sync: state.sync || {
              networkStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
              syncStatus: 'synced',
              queue: [],
              lastSyncAt: null,
              lastError: null,
            },
          };
        }

        // Migrate to v5 (AI features)
        if (version < 5) {
          state = {
            ...state,
            ai: state.ai || {
              dailyCalls: 0,
              dailyCallsDate: null,
              roleplayHistory: [],
              cikguHistory: [],
            },
          };
        }

        // Migrate to v6 (learning-first redesign: confidence, roles, interleaving)
        if (version < 6) {
          state = {
            ...state,
            confidenceLog: state.confidenceLog || [],
            userRole: state.userRole || 'static',
            interleaveSettings: state.interleaveSettings || {
              vocabRatio: 0.5, grammarRatio: 0.3, compRatio: 0.2, sessionSize: 15,
            },
          };
        }

        // Migrate to v7 (Cluster B+E: metacognitive close-the-loop, identity, comeback detection)
        if (version < 7) {
          state = {
            ...state,
            mistakeReasons: state.mistakeReasons || {},
            sessionFeedback: state.sessionFeedback || [],
            reflections: state.reflections || [],
            identity: state.identity || {
              idealSelf: '',
              label: null,
              cue: null,
              identityChosenAt: null,
            },
            lastSessionAt: state.lastSessionAt || null,
          };
        }

        // Migrate to v8 (translation provider, writing tutor, PDF reader)
        if (version < 8) {
          state = {
            ...state,
            translation: state.translation || {
              preferredProvider: 'auto',
              showComparisonLink: true,
              cacheToCloud: false,
            },
            writingTutor: state.writingTutor || {
              provider: 'gemini',
              autoDetectFormat: true,
            },
            writingHistory: state.writingHistory || [],
            speakingHistory: state.speakingHistory || [],
            pdfRecents: state.pdfRecents || [],
          };
        }

        // Migrate to v9 (speaking grader history)
        if (version < 9) {
          state = {
            ...state,
            speakingHistory: state.speakingHistory || [],
          };
        }

        // Migrate to v10: replace placeholder example sentences ("foo (bar).")
        // with curated ones from EXAMPLES. Existing user-added cards (where
        // ex was authored or is non-placeholder) are left untouched.
        if (version < 10) {
          const placeholderRe = /^[^(]+\([^)]*\)\.\s*$/;
          state = {
            ...state,
            cards: (state.cards || []).map(c => {
              if (!c?.m) return c;
              const curated = EXAMPLES[c.m];
              if (!curated) return c;
              const looksLikePlaceholder = !c.ex || placeholderRe.test(c.ex);
              return looksLikePlaceholder ? { ...c, ex: curated } : c;
            }),
          };
        }

        // Migrate to v11: extend mistake records with category/severity/surface/etc.
        // Old records keep their type/word/source; new fields default sensibly.
        if (version < 11) {
          state = {
            ...state,
            mistakes: (state.mistakes || []).map(m => {
              if (!m) return m;
              const language = m.language || 'ms';
              const category = m.category || (m.type === 'vocab' ? 'vocab'
                : m.type === 'grammar' ? 'imbuhan'
                : m.type === 'comprehension' ? 'comprehension'
                : 'other');
              const severity = m.severity || 'med';
              const surface = m.surface || '';
              const dedupeKey = m._k || `${m.type}::${m.word || ''}::${hashString(surface)}::${language}`;
              return {
                ...m,
                language,
                category,
                severity,
                surface,
                correction: m.correction || '',
                note: m.note || '',
                promotedCardId: m.promotedCardId ?? null,
                attempts: m.attempts ?? 1,
                lastReviewedAt: m.lastReviewedAt ?? null,
                _k: dedupeKey,
              };
            }),
          };
        }

        // Migrate to v12: exam rehearsal attempts.
        if (version < 12) {
          state = {
            ...state,
            examAttempts: state.examAttempts || [],
          };
        }

        // Migrate to v13: Theater Mode preference (default on).
        if (version < 13) {
          state = {
            ...state,
            theaterModeEnabled: state.theaterModeEnabled ?? true,
          };
        }

        // Migrate to v14: mistakeHistory archive for active-list pruning.
        if (version < 14) {
          state = {
            ...state,
            mistakeHistory: state.mistakeHistory || [],
          };
        }

        // Migrate to v15: Visual Dictionary toggle (default on for everyone,
        // including returning users — they can flip it off in Settings).
        if (version < 15) {
          state = {
            ...state,
            showDictionaryImages: state.showDictionaryImages ?? true,
          };
        }

        // Migrate to v16: UDL Principle 1 — Theme Choice (dyslexic font + high
        // contrast). Both default OFF so returning users see no change until
        // they opt in from Settings.
        if (version < 16) {
          state = {
            ...state,
            dyslexicFont: state.dyslexicFont ?? false,
            highContrast: state.highContrast ?? false,
          };
        }

        // Migrate to v17: UDL Principle 1 — Personal Interests. Empty array
        // default = "no interests starred" = current Comprehension + Roleplay
        // ordering preserved bit-for-bit. Returning users see zero change
        // until they opt in by starring topics in Settings.
        if (version < 17) {
          state = {
            ...state,
            userInterests: Array.isArray(state.userInterests) ? state.userInterests : [],
          };
        }

        // Migrate to v18: Initialize cognitiveProfile for returning users to prevent agent crashes.
        if (version < 18) {
          state = {
            ...state,
            cognitiveProfile: {
              masteredConcepts: [],
              learningConcepts: [],
              recentMistakes: [],
              ...(state.cognitiveProfile || {}),
              studentId: state.cognitiveProfile?.studentId || 'local_user',
            },
          };
        }

        // Migrate to v19: auth slice for cloud sign-in.
        if (version < 19) {
          state = {
            ...state,
            auth: {
              user: null,
              showModal: false,
              lastCloudSyncAt: null,
            },
          };
        }

        // Migrate to v20: ui slice with adaptive scaffolding flag (default on).
        // Returning users get the feature unless they later flip it off in
        // Settings. Defensive spread tolerates a pre-existing `ui` object.
        if (version < 20) {
          state = {
            ...state,
            ui: {
              useAdaptiveScaffolding: true,
              ...(state.ui || {}),
            },
          };
          if (typeof state.ui.useAdaptiveScaffolding !== 'boolean') {
            state.ui.useAdaptiveScaffolding = true;
          }
        }

        // Migrate to v21: lastMutationAt for the cloud-sync tie-break. Default
        // to NOW so a returning user looks "freshly mutated" on their first
        // post-migration sign-in → the tie-break pushes local rather than
        // restoring cloud over their existing blob-only fields.
        if (version < 21) {
          state = {
            ...state,
            lastMutationAt: state.lastMutationAt || new Date().toISOString(),
          };
        }

        // Migrate to v22: the saved-word highlight setting. Default to 'saved'
        // (the behaviour shipped in the prior version) so existing users see no
        // change until they opt into 'all' or 'off'.
        if (version < 22) {
          state = {
            ...state,
            highlightMode: state.highlightMode || 'saved',
          };
        }

        // Migrate to v23: For You home — goal preset + recall-probe config.
        // Returning users get goalPreset:null (the "Toward your goal" shelf
        // stays hidden until they pick one or write a goal sentence) and the
        // Default recall-probe (enabled, 21/14). Defensive spreads tolerate a
        // pre-existing identity object / partial recallProbe.
        if (version < 23) {
          state = {
            ...state,
            identity: {
              idealSelf: '',
              label: null,
              cue: null,
              identityChosenAt: null,
              ...(state.identity || {}),
              goalPreset: state.identity?.goalPreset ?? null,
            },
            recallProbe: { ...RECALL_PROBE_DEFAULT, ...(state.recallProbe || {}) },
          };
        }

        // Migrate to v24: PDF Layout view remember-last pref. Default to Reflow
        // (false) so existing users keep the simple-text view until they switch.
        if (version < 24) {
          state = {
            ...state,
            pdfReader: { layoutView: false, ...(state.pdfReader || {}) },
          };
        }

        // Migrate to v25: PDF sentence-reveal render pref. Default to inline (the
        // evidence-backed split-attention choice) while preserving any existing pref.
        if (version < 25) {
          state = {
            ...state,
            pdfReader: { sentenceRender: 'inline', ...(state.pdfReader || {}) },
          };
        }

        // Migrate to v26: in-app guide ("App tour") progress slice.
        if (version < 26) {
          state = migrateGuideSlice(state);
        }

        // Migrate to v27: Exam Rehearsal subject toggle. Default to Malay (0546,
        // the primary syllabus) while preserving any existing choice.
        if (version < 27) {
          state = {
            ...state,
            examRehearsalLang: state.examRehearsalLang === 'en' ? 'en' : 'ms',
          };
        }

        // Migrate to v28: PDF beginner auto-help on dense pages. Default OFF so
        // the reveal-gate stays the default for everyone, preserving any pref.
        if (version < 28) {
          state = {
            ...state,
            pdfReader: { autoHelpDensePages: false, ...(state.pdfReader || {}) },
          };
        }

        // Migrate to v29: PDF OCR language pref. Default Malay (0546, primary
        // syllabus) while preserving any existing pdfReader choice.
        if (version < 29) {
          state = {
            ...state,
            pdfReader: { ocrLang: 'ms', ...(state.pdfReader || {}) },
          };
        }

        // Migrate to v30: Sharper-read upload consent. Default false — the
        // first vision read must always show the consent dialog (Fork 4A).
        if (version < 30) {
          state = {
            ...state,
            pdfReader: { visionConsent: false, ...(state.pdfReader || {}) },
          };
        }

        // Migrate to v31: per-paper balance meter — persisted skillActivity
        // log ({ 'YYYY-MM-DD': { reading, listening, grammar } }). Additive;
        // existing data untouched.
        if (version < 31) {
          state = {
            ...state,
            skillActivity: state.skillActivity || {},
          };
        }

        // Migrate to v32: XP retired (feature #6). Drop the orphan counter so
        // it doesn't linger in localStorage; nothing reads it anymore. (An old
        // cloud blob may briefly re-introduce the key on restore — harmless,
        // it has no readers and the next local migration sweep drops it.)
        if (version < 32) {
          const { engagementXP: _retired, ...rest } = state;
          state = rest;
        }

        // v33: audio transcription language pref. Default Malay (primary syllabus).
        if (version < 33) {
          state = { ...state, pdfReader: { asrLang: 'ms', ...(state.pdfReader || {}) } };
        }

        // v34: True English study mode. Every card shipped before v34 is Malay, so
        // backfill lang:'ms' (lossless); default studyLang:'ms' so existing users see
        // no change until they flip the switch. Logic in the exported, unit-tested helper.
        if (version < 34) {
          state = applyV34Migration(state);
        }

        state._version = STORE_VERSION;
        return state;
      },
    }
  )
);

export default useStore;
