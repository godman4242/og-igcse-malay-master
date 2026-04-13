import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DICTIONARY from '../data/dictionary';
import TOPIC_PACKS from '../data/topics';
import { reviewCard, getDueCards, createNewCardState, migrateFromSM2, Rating } from '../lib/fsrs';
import { fireConfetti, checkStreakMilestone } from '../lib/confetti';

const STORE_VERSION = 2; // v2 = FSRS migration

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

      // Actions
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
      reviewCardAction: (malay, rating) => set(state => {
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
      }),

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
      updateStreak: () => set(state => {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const streak = { ...state.streak };
        if (streak.last === today) return state;
        if (streak.last === yesterday) {
          streak.count++;
        } else {
          streak.count = 1;
        }
        streak.last = today;
        if (checkStreakMilestone(streak.count)) {
          setTimeout(() => fireConfetti(4000), 500);
        }
        return { streak };
      }),

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
      reviewGrammarDrill: (drillId, correct) => set(state => {
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
      }),

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
      addStudyMinutes: (minutes) => set(state => {
        const isoDate = new Date().toISOString().split('T')[0];
        const prev = state.studyHistory[isoDate] || { reviews: 0, minutes: 0 };
        return {
          studyHistory: {
            ...state.studyHistory,
            [isoDate]: { ...prev, minutes: prev.minutes + minutes },
          },
        };
      }),

      // Theme
      toggleTheme: () => set(state => ({
        theme: state.theme === 'dark' ? 'light' : 'dark'
      })),

      setDailyGoal: (goal) => set({ dailyGoal: goal }),

      // Import/Export
      exportData: () => {
        const { cards, streak, grammarCards, mistakes, examDate } = get();
        return { cards, streak, grammarCards, mistakes, examDate, exportDate: new Date().toISOString() };
      },

      importData: (data) => set(() => ({
        cards: data.cards || [],
        streak: data.streak || { count: 0, last: '' },
        grammarCards: data.grammarCards || {},
        mistakes: data.mistakes || [],
        examDate: data.examDate || null,
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
        // Migrate from v0/v1 (SM-2) to v2 (FSRS)
        if (version < 2) {
          const migratedCards = (persistedState.cards || []).map(card => {
            // Only migrate cards that don't have FSRS fields
            if (card.stability !== undefined) return card;
            const fsrsFields = migrateFromSM2(card);
            return { ...card, ...fsrsFields };
          });
          return {
            ...persistedState,
            _version: STORE_VERSION,
            cards: migratedCards,
            grammarCards: persistedState.grammarCards || {},
            mistakes: persistedState.mistakes || [],
            examDate: persistedState.examDate || null,
          };
        }
        return persistedState;
      },
    }
  )
);

export default useStore;
