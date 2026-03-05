'use client';

import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { dmSans, baiJamjuree, jetbrainsMono } from '@/lib/fonts';

const fontVariableClasses = [dmSans.variable, baiJamjuree.variable, jetbrainsMono.variable];

export function Providers({ children }: { children: React.ReactNode }) {
  // Apply font CSS variable classes to <html> so they cascade to body and all descendants.
  // This runs client-side after hydration; SSR uses the fallback fonts defined in globals.css.
  useEffect(() => {
    document.documentElement.classList.add(...fontVariableClasses);
    return () => document.documentElement.classList.remove(...fontVariableClasses);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          className: 'font-body',
        }}
      />
    </ThemeProvider>
  );
}
