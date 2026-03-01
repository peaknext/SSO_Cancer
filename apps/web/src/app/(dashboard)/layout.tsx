'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isHydrating } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Don't redirect while the initial token refresh is in progress
    if (isHydrating) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrating, router]);

  // Show nothing while hydrating or not authenticated (avoids flash)
  if (isHydrating || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Gradient mesh background — colorful substrate visible through glass surfaces */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Base gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 via-background to-cyan-50/50 dark:from-teal-950/30 dark:via-background dark:to-cyan-950/20" />

        {/* Floating gradient orbs */}
        <div
          className="absolute h-[600px] w-[600px] rounded-full opacity-[0.07] blur-[120px] dark:opacity-[0.10] will-change-transform"
          style={{
            top: '-8%',
            left: '-5%',
            background: 'var(--orb-1)',
            animation: 'orb-drift-1 25s ease-in-out infinite',
          }}
        />
        <div
          className="absolute h-[500px] w-[500px] rounded-full opacity-[0.05] blur-[100px] dark:opacity-[0.08] will-change-transform"
          style={{
            top: '35%',
            right: '-8%',
            background: 'var(--orb-2)',
            animation: 'orb-drift-2 30s ease-in-out infinite',
          }}
        />
        <div
          className="absolute h-[450px] w-[450px] rounded-full opacity-[0.06] blur-[90px] dark:opacity-[0.09] will-change-transform"
          style={{
            bottom: '-5%',
            left: '25%',
            background: 'var(--orb-3)',
            animation: 'orb-drift-3 28s ease-in-out infinite',
          }}
        />
        <div
          className="absolute h-[350px] w-[350px] rounded-full opacity-[0.04] blur-[80px] dark:opacity-[0.06] will-change-transform"
          style={{
            top: '60%',
            left: '60%',
            background: 'var(--orb-4)',
            animation: 'orb-drift-4 22s ease-in-out infinite',
          }}
        />

        {/* Subtle dot grid overlay for depth */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--foreground) 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          'transition-all duration-200',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[260px]',
        )}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
