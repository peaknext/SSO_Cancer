'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Monitor, Trash2, RotateCcw, UserX, UserCheck, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/shared/loading-skeleton';

interface UserDetail {
  id: number;
  email: string;
  fullName: string;
  fullNameThai: string | null;
  role: string;
  department: string | null;
  position: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
}

interface Session {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
}

const roleVariant: Record<string, 'default' | 'destructive' | 'warning' | 'accent' | 'secondary'> = {
  SUPER_ADMIN: 'destructive',
  ADMIN: 'warning',
  EDITOR: 'default',
  VIEWER: 'secondary',
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'ผู้ดูแลสูงสุด',
  ADMIN: 'ผู้ดูแล',
  EDITOR: 'บรรณาธิการ',
  VIEWER: 'ผู้ดู',
};

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const currentUser = useAuthStore((s) => s.user);
  const { data: user, isLoading, refetch } = useApi<UserDetail>(`/users/${id}`);
  const { data: sessions, refetch: refetchSessions } = useApi<Session[]>(`/users/${id}/sessions`);
  const [acting, setActing] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyTempPassword = useCallback(async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success('คัดลอกรหัสผ่านแล้ว');
    setTimeout(() => setCopied(false), 2000);
  }, [tempPassword]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบผู้ใช้ — User not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/settings/users">กลับ</Link>
        </Button>
      </div>
    );
  }

  const sessionList = sessions ?? [];
  const isSelf = currentUser?.id === user.id;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const handleAction = async (action: string, method: 'PATCH' | 'POST' = 'PATCH') => {
    setActing(true);
    try {
      if (action === 'reset-password') {
        const result = await apiClient.post<{ tempPassword: string }>(`/users/${id}/${action}`);
        setTempPassword(result.tempPassword);
        setCopied(false);
      } else if (method === 'POST') {
        await apiClient.post(`/users/${id}/${action}`);
        toast.success('ดำเนินการสำเร็จ');
      } else {
        await apiClient.patch(`/users/${id}/${action}`);
        toast.success('ดำเนินการสำเร็จ');
      }
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error(apiErr?.error?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setActing(false);
    }
  };

  const revokeSession = async (sessionId: number) => {
    try {
      await apiClient.delete(`/users/${id}/sessions/${sessionId}`);
      toast.success('ยกเลิก session สำเร็จ');
      refetchSessions();
    } catch {
      toast.error('ไม่สามารถยกเลิก session ได้');
    }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/settings/users">
          <ArrowLeft className="h-4 w-4 mr-1" />
          ผู้ใช้งาน
        </Link>
      </Button>

      {/* Profile */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">
                {user.fullNameThai || user.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={roleVariant[user.role] || 'secondary'}>
                  {roleLabels[user.role] || user.role}
                </Badge>
                <StatusBadge active={user.isActive} />
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isSelf && !isSuperAdmin && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={acting}
                onClick={() => handleAction('reset-password', 'POST')}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                รีเซ็ตรหัสผ่าน
              </Button>
              {user.isActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={acting}
                  onClick={() => handleAction('deactivate')}
                  className="text-destructive hover:text-destructive"
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  ปิดใช้งาน
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={acting}
                  onClick={() => handleAction('activate')}
                  className="text-success hover:text-success"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  เปิดใช้งาน
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">ชื่อ (EN)</dt>
              <dd className="font-medium">{user.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">แผนก</dt>
              <dd className="font-medium">{user.department || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ตำแหน่ง</dt>
              <dd className="font-medium">{user.position || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">โทรศัพท์</dt>
              <dd className="font-medium">{user.phoneNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">เข้าใช้ล่าสุด</dt>
              <dd className="font-medium">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString('th-TH', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : 'ยังไม่เคย'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">IP ล่าสุด</dt>
              <dd className="font-mono text-xs">{user.lastLoginIp || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ล็อกอินผิดพลาด</dt>
              <dd className="font-medium tabular-nums">{user.failedLoginAttempts}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">สร้างเมื่อ</dt>
              <dd className="font-medium">
                {new Date(user.createdAt).toLocaleDateString('th-TH', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </dd>
            </div>
            {user.lockedUntil && (
              <div>
                <dt className="text-destructive">ล็อกถึง</dt>
                <dd className="font-medium text-destructive">
                  {new Date(user.lockedUntil).toLocaleString('th-TH')}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Active sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Sessions ที่ใช้งาน ({sessionList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessionList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">ไม่มี session ที่ใช้งาน</p>
          ) : (
            <div className="divide-y">
              {sessionList.map((session) => (
                <div key={session.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.userAgent
                        ? session.userAgent.substring(0, 60) + (session.userAgent.length > 60 ? '...' : '')
                        : 'Unknown browser'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{session.ipAddress || '—'}</span>
                      <span>
                        หมดอายุ {new Date(session.expiresAt).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => revokeSession(session.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Temp password dialog */}
      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} maxWidth="sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-subtle">
              <RotateCcw className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">รีเซ็ตรหัสผ่านสำเร็จ</h3>
              <p className="text-xs text-muted-foreground">กรุณาส่งรหัสผ่านชั่วคราวให้ผู้ใช้</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/10 px-4 py-3">
            <code className="flex-1 font-mono text-lg font-semibold tracking-wider text-foreground select-all">
              {tempPassword}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={copyTempPassword}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            รหัสผ่านนี้จะแสดงเพียงครั้งเดียว — ผู้ใช้ควรเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบ
          </p>
          <Button
            className="w-full mt-4"
            onClick={() => setTempPassword(null)}
          >
            ปิด
          </Button>
        </div>
      </Modal>
    </div>
  );
}
