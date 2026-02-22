import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, LoginResponse } from '@/types/auth';
import { apiClient } from '@/lib/api-client';

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });
        try {
          const data = await apiClient.post<LoginResponse>(
            '/auth/login',
            credentials,
          );
          apiClient.setAccessToken(data.accessToken);
          if (typeof document !== 'undefined') {
            document.cookie = 'sso-cancer-auth-flag=1; path=/; max-age=604800';
          }
          set({
            user: data.user,
            accessToken: data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch {
          // Ignore errors during logout
        }
        if (typeof document !== 'undefined') {
          document.cookie = 'sso-cancer-auth-flag=; path=/; max-age=0';
        }
        apiClient.setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      refreshUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        apiClient.setAccessToken(accessToken);
        try {
          const user = await apiClient.get<User>('/auth/me');
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      setAuth: (user: User, accessToken: string) => {
        apiClient.setAccessToken(accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },

      clearAuth: () => {
        apiClient.setAccessToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'sso-cancer-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          apiClient.setAccessToken(state.accessToken);
        }
      },
    },
  ),
);
