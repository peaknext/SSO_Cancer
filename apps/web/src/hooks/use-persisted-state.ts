'use client';

import { useState, useEffect } from 'react';

/**
 * useState that persists to localStorage.
 * Reads the stored value on mount (client-side only) and writes on every change.
 * Returns [value, setValue, hydrated] — `hydrated` is false until
 * the persisted value has been read from localStorage.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, [key]);

  // Write to localStorage on change (only after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated];
}
