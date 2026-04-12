import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import DICTIONARY from '../data/dictionary';
import TOPIC_PACKS from '../data/topics';
import { reviewCard, getDueCards } from '../lib/sm2';
import { fireConfetti, checkStreakMilestone } from '../lib/confetti';

const useStore = create(
  persist(
    (set, get) => ({
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

      // Actions
      addCard: (card) => set(state => {
        if (state.cards.some(c => c.m === card.m && c.t === card.t)) return state;
        return { cards: [...state.cards, { ...card, box: 1, ease: 2.5, interval: 0, totalReviews: 0 }] };
      }),

      addCards: (newCards) => set(state => {
        const existing = new Set(state.cards.map(c => `${c.m}::${c.t}`));
        const unique = newCards.filter(c => !existing.has(`${c.m}::${c.t}`));
        return { cards: [...state.cards, ...unique.map(c => ({ ...c, box: 1, ease: 2.5, interval: 0, totalReviews: 0 }))] };
      }),

      removeCard: (malay, deck) => set(state => ({
        cards: state.cards.filter(c => !(c.m === malay && c.t === deck))
      })),

      reviewCardAction: (malay, quality) => set(state => {
        const today = new Date().toDateString();
        const isoDate = new Date().toISOString().split('T')[0];
        const cards = state.cards.map(c =>
          c.m === malay ? reviewCard(c, quality) : c
        );
        const prev = state.studyHistory[isoDate] || { reviews: 0, minutes: 0 };
        return {
          cards,
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
        // Fire confetti on milestone streaks (7, 14, 30, 50, 100, 365 days)
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

      // Grammar progress
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
        const { cards, streak } = get();
        return { cards, streak, exportDate: new Date().toISOString() };
      },

      importData: (data) => set(() => ({
        cards: data.cards || [],
        streak: data.streak || { count: 0, last: '' },
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
    }
  )
);

export default useStore;
