export const createAuthSlice = (set) => ({
  // State — populated in Phase 1 (Supabase Auth)
  user: null,
  session: null,
  isGuest: true,

  // Placeholder actions
  setUser: (user) => set({ user, isGuest: !user }),
  setSession: (session) => set({ session }),
  clearAuth: () => set({ user: null, session: null, isGuest: true }),
});
