'use client';

import { useEffect, useState } from 'react';
import { useLanguageStore } from '@/stores/language-store';

type Translations = Record<string, Record<string, string>>;

const cache: Record<string, Translations> = {};

export function useTranslation() {
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const [translations, setTranslations] = useState<Translations>(cache[locale] || {});

  useEffect(() => {
    if (cache[locale]) {
      setTranslations(cache[locale]);
      return;
    }
    fetch(`/locales/${locale}.json`)
      .then((res) => res.json())
      .then((data) => {
        cache[locale] = data;
        setTranslations(data);
      })
      .catch(() => {});
  }, [locale]);

  const t = (key: string): string => {
    const parts = key.split('.');
    if (parts.length === 2) {
      return translations[parts[0]]?.[parts[1]] || key;
    }
    return key;
  };

  return { t, locale, setLocale };
}
