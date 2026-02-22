import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { dmSans, baiJamjuree, jetbrainsMono } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSO Cancer Care — ระบบจัดการโปรโตคอลรักษามะเร็ง',
  description:
    'ระบบจัดการโปรโตคอลรักษามะเร็ง สำนักงานประกันสังคม — Thai Social Security Office Cancer Treatment Protocol Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${dmSans.variable} ${baiJamjuree.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
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
      </body>
    </html>
  );
}
