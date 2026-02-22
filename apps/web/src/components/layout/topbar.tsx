'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  User,
  KeyRound,
  ChevronRight,
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore } from '@/stores/language-store';
import { Button } from '@/components/ui/button';
import { ChangePasswordDialog } from '@/components/settings/change-password-dialog';

const breadcrumbMap: Record<string, string> = {
  '/': 'แดชบอร์ด',
  '/protocols': 'โปรโตคอล',
  '/drugs': 'ยา',
  '/cancer-sites': 'ตำแหน่งมะเร็ง',
  '/protocol-analysis': 'วิเคราะห์โปรโตคอล',
  '/revenue': 'เรียกเก็บ',
  '/settings': 'ตั้งค่า',
  '/settings/users': 'ผู้ใช้งาน',
  '/settings/app': 'ตั้งค่าระบบ',
  '/settings/ai': 'ตั้งค่า AI',
  '/settings/audit-logs': 'บันทึกกิจกรรม',
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { locale, setLocale } = useLanguageStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const breadcrumbs = () => {
    if (pathname === '/') return [{ label: 'แดชบอร์ด', href: '/' }];
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];
    let path = '';
    for (const seg of segments) {
      path += `/${seg}`;
      // Skip dynamic segments like UUIDs/numbers for now, show "รายละเอียด"
      const label = breadcrumbMap[path] || (seg.match(/^[0-9a-f-]+$/i) ? 'รายละเอียด' : seg);
      crumbs.push({ label, href: path });
    }
    return crumbs;
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
    ADMIN: 'ผู้ดูแลระบบ',
    EDITOR: 'บรรณาธิการ',
    VIEWER: 'ผู้ดู',
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-card/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="mr-3 rounded-md p-2 text-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs().map((crumb, i, arr) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <span
              className={cn(
                i === arr.length - 1
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Language toggle — hidden until i18n is implemented across all pages */}
        {/* <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocale(locale === 'th' ? 'en' : 'th')}
          className="h-9 gap-1.5 px-2.5 text-xs font-medium"
        >
          <Languages className="h-4 w-4" />
          {locale === 'th' ? 'TH' : 'EN'}
        </Button> */}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-tight">
                {user?.fullNameThai || user?.fullName || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.role ? roleLabels[user.role] || user.role : ''}
              </p>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium">{user?.fullNameThai || user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  router.push('/settings/users');
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-muted/10 transition-colors"
              >
                <User className="h-4 w-4" />
                โปรไฟล์
              </button>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  setChangePasswordOpen(true);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-sidebar-foreground hover:bg-muted/10 transition-colors"
              >
                <KeyRound className="h-4 w-4" />
                เปลี่ยนรหัสผ่าน
              </button>
              <div className="my-1 border-t" />
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive-subtle transition-colors"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
      <ChangePasswordDialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </header>
  );
}
