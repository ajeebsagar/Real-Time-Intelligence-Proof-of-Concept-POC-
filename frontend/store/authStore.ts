// Auth Store — NOT persisted: login is required every time the app starts.

import { create } from 'zustand'
import { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  hasHydrated: boolean
  setUser: (user: User | null) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  // No persist middleware, so hydration is effectively instant — set true so
  // the auth-guard effects don't block forever waiting for hydration.
  hasHydrated: true,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
  setHasHydrated: (v) => set({ hasHydrated: v }),
}))

// Also clear any leftover token from previous sessions so a fresh app start
// always requires logging in again.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('rt-intel-auth')
  } catch {
    /* ignore */
  }
}
