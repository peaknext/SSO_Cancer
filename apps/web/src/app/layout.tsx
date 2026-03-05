import type { Metadata } from 'next';
import { dmSans, baiJamjuree, jetbrainsMono } from '@/lib/fonts';
import { Providers } from '@/components/providers';
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
