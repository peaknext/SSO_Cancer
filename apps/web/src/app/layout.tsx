import type { Metadata } from 'next';
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
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
