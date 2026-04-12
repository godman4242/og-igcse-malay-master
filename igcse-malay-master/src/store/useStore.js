import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createCardsSlice } from './slices/cardsSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createStreakSlice } from './slices/streakSlice';
import { createAuthSlice } from './slices/authSlice';

const useStore = create(
  persist(
    (set, get) => ({
      // Study session (shared between cards + streak)
      reviewedToday: 0,
      lastStudyDate: '',

      // Compose slices
      ...createCardsSlice(set, get),
      ...createSettingsSlice(set, get),
      ...createStreakSlice(set, get),
      ...createAuthSlice(set, get),
    }),
    {
      name: 'igcse-malay-store',
      // Don't persist auth state (session tokens shouldn't be in localStorage)
      partialize: (state) => {
        const { user, session, ...rest } = state;
        return rest;
      },
    }
  )
);

export default useStore;
