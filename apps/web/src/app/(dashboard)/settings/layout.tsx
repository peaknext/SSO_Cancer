'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Users, Settings, ScrollText, Brain, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const settingsTabs = [
  { label: 'ผู้ใช้งาน', labelEn: 'Users', href: '/settings/users', icon: Users },
  { label: 'ตั้งค่าระบบ', labelEn: 'App Settings', href: '/settings/app', icon: Settings },
  { label: 'AI', labelEn: 'AI Settings', href: '/settings/ai', icon: Brain },
  { label: 'บันทึกกิจกรรม', labelEn: 'Audit Logs', href: '/settings/audit-logs', icon: ScrollText },
  { label: 'สำรอง/กู้คืน', labelEn: 'Backup', href: '/settings/backup', icon: Database, superAdminOnly: true },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      router.replace('/');
    }
  }, [user, router]);

  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">ตั้งค่า</h1>
        <p className="text-sm text-muted-foreground mt-1">System Settings & Administration</p>
      </div>

      {/* Tabs */}
      <div className="glass-light rounded-xl p-1 border-glass-border-subtle">
        <nav className="flex gap-1 overflow-x-auto">
          {settingsTabs
            .filter((tab) => !('superAdminOnly' in tab && tab.superAdminOnly) || user.role === 'SUPER_ADMIN')
            .map((tab) => {
            const Icon = tab.icon;
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-white/50 dark:bg-white/10 text-primary shadow-sm backdrop-blur-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/25 dark:hover:bg-white/5',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
