import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DICTIONARY from '../data/dictionary';
import TOPIC_PACKS from '../data/topics';
import { reviewCard, getDueCards, createNewCardState, migrateFromSM2, Rating } from '../lib/fsrs';
import { fireConfetti, checkStreakMilestone } from '../lib/confetti';
import { createSyncEvent, enqueueSyncEvent, processSyncQueue } from '../lib/syncEngine';
import { trackEvent } from '../lib/telemetry';

const STORE_VERSION = 7; // v7 = Cluster B+E foundation (mistakeReasons, sessionFeedback, reflections, identity, lastSessionAt)

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
        const result = await processSyncQueue({
          queue: get().sync.queue,
          isOnline: get().sync.networkStatus === 'online',
          processEvent: null, // Phase 1 will provide concrete remote handlers.
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
        const reviewTarget = Math.max(5, Math.min(25, Math.ceil(((dueCards + weakCards * 0.4) / 2) * challengeMultiplier)));
        const grammarTarget = Math.max(2, Math.min(8, Math.ceil((Math.max(1, weakCards) / 10) * challengeMultiplier)));

        const challengeHistory = { ...state.challengeHistory };
        if (state.dailyChallenge?.date && state.dailyChallenge.completedAt) {
          challengeHistory[state.dailyChallenge.date] = {
            completedAt: state.dailyChallenge.completedAt,
            reviewTarget: state.dailyChallenge.reviewTarget,
            grammarTarget: state.dailyChallenge.grammarTarget,
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

      addRoleplayHistory: (entry) => set(state => ({
        ai: {
          ...state.ai,
          roleplayHistory: [
            { ...entry, date: new Date().toISOString() },
            ...state.ai.roleplayHistory,
          ].slice(0, 100), // keep last 100
        }
      })),

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
      setUserRole: (role) => set({ userRole: role }),

      // Interleave settings (v6)
      setInterleaveSettings: (settings) => set(state => ({
        interleaveSettings: { ...state.interleaveSettings, ...settings },
      })),

      addCard: (card) => set(state => {
        if (state.cards.some(c => c.m === card.m && c.t === card.t)) return state;
        const fsrsState = createNewCardState();
        return { cards: [...state.cards, { ...card, ...fsrsState }] };
      }),

      addCards: (newCards) => set(state => {
        const existing = new Set(state.cards.map(c => `${c.m}::${c.t}`));
        const unique = newCards.filter(c => !existing.has(`${c.m}::${c.t}`));
        const fsrsState = createNewCardState();
        return { cards: [...state.cards, ...unique.map(c => ({ ...c, ...fsrsState }))] };
      }),

      removeCard: (malay, deck) => set(state => ({
        cards: state.cards.filter(c => !(c.m === malay && c.t === deck))
      })),

      // Rating: 1=Again, 2=Hard, 3=Good, 4=Easy (FSRS Rating enum)
      reviewCardAction: (malay, rating) => {
        get().ensureDailyChallenge();
        set(state => {
          const today = new Date().toDateString();
          const isoDate = new Date().toISOString().split('T')[0];
          const cards = state.cards.map(c => {
            if (c.m !== malay) return c;
            const fsrsFields = reviewCard(c, rating);
            return { ...c, ...fsrsFields };
          });
          const prev = state.studyHistory[isoDate] || { reviews: 0, minutes: 0 };

          // Track mistakes for Again rating
          let mistakes = state.mistakes;
          if (rating === Rating.Again) {
            const card = state.cards.find(c => c.m === malay);
            if (card) {
              const now = Date.now();
              const isDuplicate = mistakes.some(m =>
                m.type === 'vocab' && m.word === card.m && (now - m.timestamp) < 86400000
              );
              if (!isDuplicate) {
                mistakes = [...mistakes, {
                  id: crypto.randomUUID(),
                  type: 'vocab',
                  source: 'study',
                  word: card.m,
                  correct: card.e,
                  given: '',
                  timestamp: now,
                  reviewed: false,
                }];
              }
            }
          }

          return {
            cards,
            mistakes,
            reviewedToday: state.lastStudyDate === today ? state.reviewedToday + 1 : 1,
            lastStudyDate: today,
            studyHistory: {
              ...state.studyHistory,
              [isoDate]: { ...prev, reviews: prev.reviews + 1 },
            },
          };
        });

        get().enqueueSyncEventAction('card_reviewed', { malay, rating });
        get().updateChallengeProgress('review', 1);
      },

      loadTopicPack: (topicName) => {
        const words = TOPIC_PACKS[topicName] || [];
        const newCards = words
          .filter(m => DICTIONARY[m])
          .map(m => ({
            m, e: DICTIONARY[m], t: topicName,
            p: 'n', ex: `${m} (${DICTIONARY[m]}).`, mn: '',
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
            setTimeout(() => fireConfetti(4000), 500);
          }
          return { streak, streakFreezes, streakFreezeLog };
        });

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

          // Track grammar mistakes
          let mistakes = state.mistakes;
          if (!correct) {
            const now = Date.now();
            const isDuplicate = mistakes.some(m =>
              m.type === 'grammar' && m.word === drillId && (now - m.timestamp) < 86400000
            );
            if (!isDuplicate) {
              mistakes = [...mistakes, {
                id: crypto.randomUUID(),
                type: 'grammar',
                source: drillId.split('-')[0],
                word: drillId,
                correct: '',
                given: '',
                timestamp: now,
                reviewed: false,
              }];
            }
          }

          return {
            grammarCards: { ...state.grammarCards, [drillId]: cardState },
            mistakes,
          };
        });

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

      // Mistake actions (Phase 1C)
      addMistake: (mistake) => set(state => {
        const now = Date.now();
        const isDuplicate = state.mistakes.some(m =>
          m.type === mistake.type && m.word === mistake.word && (now - m.timestamp) < 86400000
        );
        if (isDuplicate) return state;
        return {
          mistakes: [...state.mistakes, {
            id: crypto.randomUUID(),
            ...mistake,
            timestamp: now,
            reviewed: false,
          }]
        };
      }),

      markMistakeReviewed: (id) => set(state => ({
        mistakes: state.mistakes.map(m => m.id === id ? { ...m, reviewed: true } : m)
      })),

      clearOldMistakes: () => set(state => {
        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        return {
          mistakes: state.mistakes.filter(m => !m.reviewed || m.timestamp > thirtyDaysAgo)
        };
      }),

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

      // Import/Export
      exportData: () => {
        const {
          cards, streak, grammarCards, mistakes, examDate,
          streakFreezes, engagementXP, dailyChallenge, challengeHistory, installPrompt, ai,
          confidenceLog, interleaveSettings
        } = get();
        return {
          cards,
          streak,
          grammarCards,
          mistakes,
          examDate,
          streakFreezes,
          engagementXP,
          dailyChallenge,
          challengeHistory,
          installPrompt,
          ai,
          confidenceLog,
          interleaveSettings,
          exportDate: new Date().toISOString()
        };
      },

      importData: (data) => set(() => ({
        cards: data.cards || [],
        streak: data.streak || { count: 0, last: '' },
        grammarCards: data.grammarCards || {},
        mistakes: data.mistakes || [],
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

        state._version = STORE_VERSION;
        return state;
      },
    }
  )
);

export default useStore;
