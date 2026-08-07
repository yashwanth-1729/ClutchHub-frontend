import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  ready: boolean;                 // true once the Supabase session has been checked
  setAuth: (user: User | null) => void;
  setUser: (user: Partial<User>) => void;
  setReady: (ready: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      ready: false,

      setAuth: (user) => set({ user, isAuthenticated: !!user }),

      setUser: (userData) =>
        set((state) => ({ user: state.user ? { ...state.user, ...userData } : null })),

      setReady: (ready) => set({ ready }),

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'clutchhub-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
);
