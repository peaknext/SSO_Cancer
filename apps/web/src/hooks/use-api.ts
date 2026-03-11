'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

interface UseApiOptions {
  enabled?: boolean;
}

export function useApi<T>(path: string, options: UseApiOptions = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef<T | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    if (dataRef.current !== null) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const result = await apiClient.get<T>(path);
      setData(result);
      dataRef.current = result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [path, enabled]);

  // Reset when path changes (navigating to different entity)
  useEffect(() => {
    dataRef.current = null;
    setData(null);
    setIsLoading(true);
    setIsRefetching(false);
  }, [path]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isRefetching, error, refetch: fetchData };
}

export function usePaginatedApi<T>(
  basePath: string,
  params: Record<string, string | number | undefined>,
  options?: UseApiOptions,
) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  const path = query ? `${basePath}?${query}` : basePath;
  return useApi<T>(path, options);
}
