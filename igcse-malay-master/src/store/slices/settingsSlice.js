export const createSettingsSlice = (set) => ({
  // State
  theme: 'dark',
  dailyGoal: 20,

  // Actions
  toggleTheme: () => set(state => ({
    theme: state.theme === 'dark' ? 'light' : 'dark'
  })),

  setDailyGoal: (goal) => set({ dailyGoal: goal }),
});
