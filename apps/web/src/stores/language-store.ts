import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Locale = 'th' | 'en';

interface LanguageStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      locale: 'th',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'sso-cancer-lang',
    },
  ),
);
