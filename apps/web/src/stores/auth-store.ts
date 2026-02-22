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
            document.cookie =
              'sso-cancer-auth-flag=1; path=/; max-age=604800; SameSite=Strict; Secure';
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
          document.cookie =
            'sso-cancer-auth-flag=; path=/; max-age=0; SameSite=Strict; Secure';
        }
        apiClient.setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      refreshUser: async () => {
        // Token is in memory — if page reloaded, we need to re-auth via refresh cookie
        const { accessToken } = get();
        if (!accessToken) {
          // Attempt silent refresh via httpOnly cookie
          try {
            const data = await apiClient.post<LoginResponse>('/auth/refresh');
            apiClient.setAccessToken(data.accessToken);
            set({
              user: data.user,
              accessToken: data.accessToken,
              isAuthenticated: true,
            });
          } catch {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
            });
          }
          return;
        }
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
      // Only persist user info for display, NOT the access token
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // On rehydrate, token is not in storage — trigger refresh
        if (state?.isAuthenticated) {
          state.refreshUser();
        }
      },
    },
  ),
);
