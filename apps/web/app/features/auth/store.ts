import { create } from 'zustand';
import type { Profile } from './types';

interface AuthState {
  accessToken: string | null;
  user: Profile | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: Profile | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ accessToken: null, user: null }),
}));
