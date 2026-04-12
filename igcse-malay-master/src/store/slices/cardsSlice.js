import DICTIONARY from '../../data/dictionary';
import TOPIC_PACKS from '../../data/topics';
import { reviewCard, getDueCards } from '../../lib/sm2';

export const createCardsSlice = (set, get) => ({
  // State
  cards: [],
  activeDeck: 'All',

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
    const cards = state.cards.map(c =>
      c.m === malay ? reviewCard(c, quality) : c
    );
    return {
      cards,
      reviewedToday: state.lastStudyDate === today ? state.reviewedToday + 1 : 1,
      lastStudyDate: today,
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

  // Import/Export
  exportData: () => {
    const { cards, streak } = get();
    return { cards, streak, exportDate: new Date().toISOString() };
  },

  importData: (data) => set(() => ({
    cards: data.cards || [],
    streak: data.streak || { count: 0, last: '' },
  })),

  getAnkiExport: () => {
    const { cards } = get();
    let txt = '#separator:tab\n#html:true\n';
    cards.forEach(c => {
      txt += `${c.m}\t${c.e}${c.ex ? `<br><small><em>${c.ex}</em></small>` : ''}\n`;
    });
    return txt;
  },
});
