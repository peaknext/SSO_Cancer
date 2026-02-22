import type { ApiError } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Unwrap the API success envelope `{ success, data }` from TransformInterceptor.
 * Paginated responses `{ success, data, meta }` are kept as-is since the
 * frontend expects `{ data: [...], meta: {...} }` at the top level.
 */
function unwrapEnvelope<T>(json: unknown): T {
  if (
    json &&
    typeof json === 'object' &&
    'success' in json &&
    'data' in json &&
    !('meta' in json)
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    return this.accessToken;
  }

  async fetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE}/api/v1${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401 && this.accessToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (retryResponse.ok) {
          return unwrapEnvelope<T>(await retryResponse.json());
        }
      }
      this.accessToken = null;
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: response.statusText,
          statusCode: response.status,
        },
      }));
      throw error;
    }

    return unwrapEnvelope<T>(await response.json());
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const json = await response.json();
        // Unwrap envelope: { success, data: { accessToken, ... } }
        const data = json?.data ?? json;
        this.accessToken = data.accessToken;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async get<T>(path: string) {
    return this.fetch<T>(path);
  }

  async post<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown) {
    return this.fetch<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string) {
    return this.fetch<T>(path, { method: 'DELETE' });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const url = `${API_BASE}/api/v1${path}`;
    const headers: Record<string, string> = {};
    // Do NOT set Content-Type — browser will set multipart/form-data with boundary
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (response.status === 401 && this.accessToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });
        if (retryResponse.ok) {
          return unwrapEnvelope<T>(await retryResponse.json());
        }
      }
      this.accessToken = null;
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('SESSION_EXPIRED');
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: response.statusText,
          statusCode: response.status,
        },
      }));
      throw error;
    }

    return unwrapEnvelope<T>(await response.json());
  }
}

export const apiClient = new ApiClient();
