export const createStreakSlice = (set, get) => ({
  // State
  streak: { count: 0, last: '' },

  // Actions
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
    return { streak };
  }),

  getStreak: () => {
    const { streak } = get();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (streak.last !== today && streak.last !== yesterday) return 0;
    return streak.count;
  },
});
