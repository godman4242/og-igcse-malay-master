import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DICTIONARY from '../data/dictionary';
import TOPIC_PACKS from '../data/topics';
import EXAMPLES from '../data/dictionaryExamples';
import { reviewCard, getDueCards, createNewCardState, migrateFromSM2, Rating } from '../lib/fsrs';
import { fireConfetti, checkStreakMilestone } from '../lib/confetti';
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
import { SUPABASE_CONFIG } from '../config/supabase';

const STORE_VERSION = 19; // v19 = auth slice (user, showModal, lastCloudSyncAt)

// Module-level debounce for cloud sync — safe to call inside actions
let _cloudSyncTimer = null;

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

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

const getTodayISO = () => new Date().toISOString().split('T')[0];

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
      userInterests: [],               // v17 — UDL Principle 1 — Personal Interests. Star-topic IDs from src/lib/interests.js. Matching content floats to the top of Comprehension + Roleplay lists.

      // Streak
      streak: { count: 0, last: '' },

      // Study session
      reviewedToday: 0,
      lastStudyDate: '',
      studyHistory: {},  // { 'YYYY-MM-DD': { reviews: N, minutes: N } }

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

      // Engagement layer (P1)
      streakFreezes: 0,
      streakFreezeLog: [],
      engagementXP: 0,
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
      },
      lastSessionAt: null,

      // Translation preferences (v8)
      translation: {
        preferredProvider: 'auto',     // 'auto' | 'deepl' | 'google' | 'gtx'
        showComparisonLink: true,      // surface "compare on DeepL/Google" links
        cacheToCloud: false,           // Supabase read-through/write-through cache opt-in
      },

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
      isHydratingCloud: false,

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

      enqueueSyncEventAction: (type, payload = {}) => set(state => {
        const event = createSyncEvent(type, payload);
        const queue = enqueueSyncEvent(state.sync.queue, event);
        trackEvent('sync_queue_enqueued', { eventType: type, queueLength: queue.length });
        return {
          sync: {
            ...state.sync,
            queue,
            syncStatus: 'pending',
            lastError: null,
          }
        };
      }),

      flushSyncQueue: async () => {
        const { sync } = get();
        if (sync.queue.length === 0) return true;

        set(state => ({
          sync: {
            ...state.sync,
            syncStatus: 'syncing',
            lastError: null,
          }
        }));

        trackEvent('sync_flush_started', { queueLength: sync.queue.length });

        const start = Date.now();
        try {
          const [{ processSyncQueue }, { processCloudSyncEvent }] = await Promise.all([
            import('../lib/syncEngine'),
            import('../lib/cloudSync'),
          ]);
          const result = await processSyncQueue({
            queue: get().sync.queue,
            isOnline: get().sync.networkStatus === 'online',
            cloudSyncEnabled: SUPABASE_CONFIG.enabled && get().userRole !== 'static',
            processEvent: (event) => processCloudSyncEvent(event, get()),
          });

          set(state => ({
            sync: {
              ...state.sync,
              queue: result.remainingQueue,
              syncStatus: result.status,
              lastError: result.lastError,
              lastSyncAt: result.status === 'synced' ? new Date().toISOString() : state.sync.lastSyncAt,
            }
          }));

          if (result.status === 'synced') {
            trackEvent('sync_flush_succeeded', {
              processed: result.processedCount,
              remaining: result.remainingQueue.length,
              durationMs: Date.now() - start,
            });
          } else {
            trackEvent('sync_flush_failed', {
              processed: result.processedCount,
              remaining: result.remainingQueue.length,
              error: result.lastError,
            });
          }

          return result.status === 'synced';
        } catch (err) {
          set(state => ({
            sync: {
              ...state.sync,
              syncStatus: 'error',
              lastError: err?.message || 'sync_failed',
            }
          }));
          trackEvent('sync_flush_failed', { error: err?.message || 'sync_failed' });
          return false;
        }
      },

      retrySync: async () => get().flushSyncQueue(),

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
            engagementXP: state.engagementXP + 50,
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

      // Cluster B getter — finds high-confidence wrong answers in last 14 days
      getHypercorrectionTargets: () => {
        const { confidenceLog } = get();
        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        return confidenceLog
          .filter(e => e.ts >= cutoff && e.level === 3 && !e.correct)
          .map(e => e.word);
      },

      // Cluster E actions (v7)
      setIdealSelf: (text) => set(state => ({
        identity: { ...state.identity, idealSelf: text || '' },
      })),

      setIdentityLabel: (label) => set(state => ({
        identity: {
          ...state.identity,
          label,
          identityChosenAt: state.identity.identityChosenAt || new Date().toISOString(),
        },
      })),

      setStudyCue: (cue) => set(state => ({
        identity: { ...state.identity, cue },
      })),

      markSessionStart: () => set({ lastSessionAt: new Date().toISOString() }),

      // Translation preferences (v8)
      setTranslationProvider: (provider) => set(state => ({
        translation: { ...state.translation, preferredProvider: provider },
      })),
      setTranslationComparisonLink: (show) => set(state => ({
        translation: { ...state.translation, showComparisonLink: !!show },
      })),
      setTranslationCacheToCloud: (enabled) => set(state => ({
        translation: { ...state.translation, cacheToCloud: !!enabled },
      })),

      // Writing tutor settings (v8)
      setWritingTutorProvider: (provider) => set(state => ({
        writingTutor: { ...state.writingTutor, provider },
      })),
      setWritingTutorAutoDetect: (enabled) => set(state => ({
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
        set({ isHydratingCloud: true });
        try {
          const {
            fetchCloudCards,
            fetchCloudWritingHistory,
            fetchCloudSpeakingHistory,
            syncCloudSnapshot,
          } = await import('../lib/cloudSync');
          const [cloudCards, cloudWriting, cloudSpeaking] = await Promise.all([
            fetchCloudCards(),
            fetchCloudWritingHistory(),
            fetchCloudSpeakingHistory(),
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
            mergedCards = [...state.cards, ...missingCards];
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
              isHydratingCloud: false,
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
          set({ isHydratingCloud: false });
          trackEvent('cloud_data_hydrate_failed', { error: err?.message || 'unknown' });
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

      // Composite "Exam Readiness %" — 0..100. Comp counts for 30%, writing 35%,
      // speaking 35%. Most-recent attempt anchored at 70% weight, prior 30%.
      getExamReadiness: () => {
        const { examAttempts } = get();
        if (!examAttempts?.length) return null;
        const compose = (a) => {
          if (!a) return 0;
          const w = (a.writingBand || 0) / 6 * 100;
          const s = (a.speakingBand || 0) / 6 * 100;
          const c = a.comprehensionPct || 0;
          return Math.round(c * 0.3 + w * 0.35 + s * 0.35);
        };
        const latest = compose(examAttempts[0]);
        const prior = examAttempts.slice(1, 4);
        const priorAvg = prior.length
          ? Math.round(prior.reduce((sum, a) => sum + compose(a), 0) / prior.length)
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

      setUserRole: (role) => set({ userRole: role }),

      setDailyGoalLevel: (level) => set(() => {
        const goal = level === 'casual' ? 10 : level === 'intensive' ? 40 : 20;
        trackEvent('daily_goal_updated', { level, goal });
        return { dailyGoalLevel: level, dailyGoal: goal };
      }),

      // Interleave settings (v6)
      setInterleaveSettings: (settings) => set(state => ({
        interleaveSettings: { ...state.interleaveSettings, ...settings },
      })),

      addCard: (card) => {
        let addedCard = null;
        set(state => {
          if (state.cards.some(c => c.m === card.m && c.t === card.t)) return state;
          const fsrsState = createNewCardState();
          addedCard = { ...card, ...fsrsState };
          return { cards: [...state.cards, addedCard] };
        });
        if (addedCard) get().enqueueSyncEventAction('card_added', { card: addedCard });
      },

      addCards: (newCards) => {
        let addedCards = [];
        set(state => {
          const existing = new Set(state.cards.map(c => `${c.m}::${c.t}`));
          const unique = newCards.filter(c => !existing.has(`${c.m}::${c.t}`));
          addedCards = unique.map(c => ({ ...c, ...createNewCardState() }));
          return { cards: [...state.cards, ...addedCards] };
        });
        if (addedCards.length) get().enqueueSyncEventAction('cards_added', { cards: addedCards });
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
      reviewCardAction: (malay, rating) => {
        get().ensureDailyChallenge();
        let cardToLog = null;
        set(state => {
          const today = new Date().toDateString();
          const isoDate = new Date().toISOString().split('T')[0];
          const cards = state.cards.map(c => {
            if (c.m !== malay) return c;
            const fsrsFields = reviewCard(c, rating);
            return { ...c, ...fsrsFields };
          });
          const prev = state.studyHistory[isoDate] || { reviews: 0, minutes: 0 };

          if (rating === Rating.Again) {
            cardToLog = state.cards.find(c => c.m === malay) || null;
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

        get().enqueueSyncEventAction('card_reviewed', { malay, rating });
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
      addMistake: (mistake) => {
        let added = null;
        let bumped = null;
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

        // Auto-promote eligible vocab/imbuhan mistakes to FSRS cards.
        if (added
          && AUTO_PROMOTE_CATEGORIES.has(added.category)
          && added.word
          && added.correct
          && added.severity !== 'low'
          && added.language === 'ms'
        ) {
          get().promoteMistakeToCard(added.id);
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

      markMistakeReviewed: (id) => set(state => ({
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

      // Exam date (Phase 1E)
      setExamDate: (date) => set({ examDate: date }),

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
          const isoDate = new Date().toISOString().split('T')[0];
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

      // Theme
      toggleTheme: () => set(state => ({
        theme: state.theme === 'dark' ? 'light' : 'dark'
      })),

      setDailyGoal: (goal) => set({ dailyGoal: goal }),
      setTheaterModeEnabled: (v) => set({ theaterModeEnabled: !!v }),
      setShowDictionaryImages: (v) => set({ showDictionaryImages: !!v }),
      setDyslexicFont: (v) => set({ dyslexicFont: !!v }),
      setHighContrast: (v) => set({ highContrast: !!v }),

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

      // Import/Export
      exportData: () => {
        const {
          cards, streak, grammarCards, mistakes, mistakeHistory, examDate,
          streakFreezes, streakFreezeLog, engagementXP, dailyChallenge, challengeHistory, installPrompt, ai,
          confidenceLog, interleaveSettings, studyHistory,
          mistakeReasons, sessionFeedback, reflections, identity, lastSessionAt,
          translation, writingTutor, writingHistory, pdfRecents, speakingHistory,
        } = get();
        return {
          cards,
          streak,
          grammarCards,
          mistakes,
          mistakeHistory,
          examDate,
          streakFreezes,
          streakFreezeLog,
          engagementXP,
          dailyChallenge,
          challengeHistory,
          installPrompt,
          ai,
          confidenceLog,
          interleaveSettings,
          studyHistory,
          mistakeReasons,
          sessionFeedback,
          reflections,
          identity,
          lastSessionAt,
          translation,
          writingTutor,
          writingHistory,
          pdfRecents,
          speakingHistory,
          exportDate: new Date().toISOString()
        };
      },

      importData: (data) => set(() => ({
        cards: data.cards || [],
        streak: data.streak || { count: 0, last: '' },
        grammarCards: data.grammarCards || {},
        mistakes: data.mistakes || [],
        mistakeHistory: data.mistakeHistory || [],
        examDate: data.examDate || null,
        streakFreezes: data.streakFreezes || 0,
        streakFreezeLog: data.streakFreezeLog || [],
        engagementXP: data.engagementXP || 0,
        dailyChallenge: data.dailyChallenge || null,
        challengeHistory: data.challengeHistory || {},
        installPrompt: data.installPrompt || {
          accepted: false,
          dismissedAt: null,
          variant: Math.random() < 0.5 ? 'dashboard_card' : 'post_session',
        },
        confidenceLog: data.confidenceLog || [],
        interleaveSettings: data.interleaveSettings || { vocabRatio: 0.5, grammarRatio: 0.3, compRatio: 0.2, sessionSize: 15 },
        studyHistory: data.studyHistory || {},
        mistakeReasons: data.mistakeReasons || {},
        sessionFeedback: data.sessionFeedback || [],
        reflections: data.reflections || [],
        identity: data.identity || { idealSelf: '', label: null, cue: null, identityChosenAt: null },
        lastSessionAt: data.lastSessionAt || null,
        translation: data.translation || { preferredProvider: 'auto', showComparisonLink: true, cacheToCloud: false },
        writingTutor: data.writingTutor || { provider: 'gemini', autoDetectFormat: true },
        writingHistory: data.writingHistory || [],
        pdfRecents: data.pdfRecents || [],
        speakingHistory: data.speakingHistory || [],
      })),

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

        state._version = STORE_VERSION;
        return state;
      },
    }
  )
);

export default useStore;
