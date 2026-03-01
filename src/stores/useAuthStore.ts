import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginResponse } from '../types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        const res = await api.post<LoginResponse>('/auth/login', { email, password });

        if (res.success && res.data) {
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          set({ user, token, isAuthenticated: true, isLoading: false });
          return true;
        }

        set({ isLoading: false, error: res.error || 'Login failed' });
        return false;
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('activeWorkspaceId');
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const res = await api.get<User>('/auth/me');
        if (res.success && res.data) {
          set({ user: res.data, isAuthenticated: true });
        } else {
          localStorage.removeItem('token');
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
