import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, LoginResponse } from '@/types/auth';
import { apiClient } from '@/lib/api-client';

function setAuthFlagCookie(value: '1' | '') {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  if (value === '1') {
    document.cookie = `sso-cancer-auth-flag=1; path=/; max-age=604800; SameSite=Lax${secure}`;
  } else {
    document.cookie = `sso-cancer-auth-flag=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
}

// Mutex to prevent concurrent refresh calls (avoids token rotation race)
let refreshInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrating: true,
      isLoading: false,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true });
        try {
          const data = await apiClient.post<LoginResponse>(
            '/auth/login',
            credentials,
          );
          apiClient.setAccessToken(data.accessToken);
          setAuthFlagCookie('1');
          set({
            user: data.user,
            accessToken: data.accessToken,
            isAuthenticated: true,
            isHydrating: false,
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
        setAuthFlagCookie('');
        apiClient.setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isHydrating: false,
        });
      },

      refreshUser: async () => {
        // If a refresh is already in flight, wait for it instead of firing another
        if (refreshInFlight) {
          await refreshInFlight;
          return;
        }

        const doRefresh = async () => {
          const { accessToken } = get();
          if (!accessToken) {
            // Attempt silent refresh via httpOnly cookie
            try {
              const data = await apiClient.post<LoginResponse>('/auth/refresh');
              apiClient.setAccessToken(data.accessToken);
              setAuthFlagCookie('1');
              set({
                user: data.user,
                accessToken: data.accessToken,
                isAuthenticated: true,
                isHydrating: false,
              });
            } catch {
              setAuthFlagCookie('');
              set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isHydrating: false,
              });
            }
            return;
          }
          apiClient.setAccessToken(accessToken);
          try {
            const user = await apiClient.get<User>('/auth/me');
            set({ user, isAuthenticated: true, isHydrating: false });
          } catch {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isHydrating: false,
            });
          }
        };

        refreshInFlight = doRefresh().finally(() => {
          refreshInFlight = null;
        });
        await refreshInFlight;
      },

      setAuth: (user: User, accessToken: string) => {
        apiClient.setAccessToken(accessToken);
        set({ user, accessToken, isAuthenticated: true, isHydrating: false });
      },

      clearAuth: () => {
        apiClient.setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isHydrating: false,
        });
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
        } else if (state) {
          // Not authenticated — done hydrating immediately
          state.clearAuth();
        }
      },
    },
  ),
);
