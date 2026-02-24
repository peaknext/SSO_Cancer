'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Pill,
  FlaskConical,
  Microscope,
  SearchCheck,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  label: string;
  labelThai: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  hidden?: boolean;
  children?: { label: string; labelThai: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    labelThai: 'แดชบอร์ด',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Cancer Patients',
    labelThai: 'ผู้ป่วยมะเร็ง',
    href: '/cancer-patients',
    icon: Users,
  },
  {
    label: 'Protocols',
    labelThai: 'โปรโตคอล',
    href: '/protocols',
    icon: FileText,
  },
  {
    label: 'Drugs',
    labelThai: 'ยา',
    href: '/drugs',
    icon: Pill,
  },
  {
    label: 'Regimens',
    labelThai: 'สูตรยา',
    href: '/regimens',
    icon: FlaskConical,
  },
  {
    label: 'Cancer Sites',
    labelThai: 'ตำแหน่งมะเร็ง',
    href: '/cancer-sites',
    icon: Microscope,
  },
  {
    label: 'Protocol Analysis',
    labelThai: 'วิเคราะห์โปรโตคอล',
    href: '/protocol-analysis',
    icon: SearchCheck,
  },
  {
    label: 'Billing',
    labelThai: 'เรียกเก็บ',
    href: '/revenue',
    icon: Receipt,
    hidden: true,
  },
  {
    label: 'Settings',
    labelThai: 'ตั้งค่า',
    href: '/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'ADMIN'],
    children: [
      { label: 'Users', labelThai: 'ผู้ใช้งาน', href: '/settings/users' },
      { label: 'App Settings', labelThai: 'ตั้งค่าระบบ', href: '/settings/app' },
      { label: 'AI Settings', labelThai: 'ตั้งค่า AI', href: '/settings/ai' },
      { label: 'Audit Logs', labelThai: 'บันทึกกิจกรรม', href: '/settings/audit-logs' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(
    pathname.startsWith('/settings') ? '/settings' : null,
  );

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const visibleItems = navItems.filter(
    (item) => !item.hidden && (!item.roles || (user?.role && item.roles.includes(user.role))),
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center border-b px-4',
        collapsed ? 'justify-center' : 'gap-3',
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
          </svg>
        </div>
        {!collapsed && (
          <span className="font-heading text-sm font-semibold whitespace-nowrap">
            SSO Cancer Care
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedGroup === item.href;

            return (
              <li key={item.href}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : item.href)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/10 hover:text-foreground',
                        collapsed && 'justify-center px-2',
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.labelThai}</span>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-transform',
                              isExpanded && 'rotate-90',
                            )}
                          />
                        </>
                      )}
                    </button>
                    {!collapsed && isExpanded && (
                      <ul className="ml-8 mt-1 space-y-1">
                        {item.children!.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onMobileClose}
                              className={cn(
                                'block rounded-md px-3 py-2 text-sm transition-colors',
                                isActive(child.href)
                                  ? 'text-primary font-medium'
                                  : 'text-muted hover:text-foreground',
                              )}
                            >
                              {child.labelThai}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/10 hover:text-foreground',
                      collapsed && 'justify-center px-2',
                    )}
                    title={collapsed ? item.labelThai : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>{item.labelThai}</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:flex border-t p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg py-2 text-muted hover:bg-sidebar-accent/10 hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r bg-sidebar transition-all duration-200',
          collapsed ? 'lg:w-16' : 'lg:w-[260px]',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar shadow-xl">
            <button
              onClick={onMobileClose}
              className="absolute right-3 top-4 rounded-md p-1 text-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
