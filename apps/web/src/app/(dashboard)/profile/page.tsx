'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Pencil,
  Save,
  X,
  Monitor,
  Smartphone,
  Globe,
  Shield,
  Clock,
  Trash2,
  Phone,
  Building2,
  Briefcase,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { User as UserType } from '@/types/auth';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SessionInfo {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActivityAt: string | null;
}

interface ProfileFormData {
  fullName: string;
  fullNameThai: string;
  department: string;
  position: string;
  phoneNumber: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const roleConfig: Record<string, { label: string; variant: 'default' | 'secondary' }> = {
  SUPER_ADMIN: { label: 'ผู้ดูแลระบบสูงสุด', variant: 'default' },
  ADMIN: { label: 'ผู้ดูแลระบบ', variant: 'default' },
  EDITOR: { label: 'บรรณาธิการ', variant: 'secondary' },
  VIEWER: { label: 'ผู้ดู', variant: 'secondary' },
};

function parseUserAgent(ua: string | null): { browser: string; os: string; icon: 'monitor' | 'smartphone' | 'globe' } {
  if (!ua) return { browser: 'ไม่ทราบ', os: 'ไม่ทราบ', icon: 'globe' };

  let browser = 'เบราว์เซอร์อื่น';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  let os = 'อื่นๆ';
  let icon: 'monitor' | 'smartphone' | 'globe' = 'globe';
  if (ua.includes('Windows')) { os = 'Windows'; icon = 'monitor'; }
  else if (ua.includes('Mac OS')) { os = 'macOS'; icon = 'monitor'; }
  else if (ua.includes('Linux') && !ua.includes('Android')) { os = 'Linux'; icon = 'monitor'; }
  else if (ua.includes('Android')) { os = 'Android'; icon = 'smartphone'; }
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; icon = 'smartphone'; }

  return { browser, os, icon };
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'ไม่ทราบ';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'เมื่อสักครู่';
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} วันที่แล้ว`;
  return new Date(dateStr).toLocaleDateString('th-TH');
}

const DeviceIcon = ({ type }: { type: 'monitor' | 'smartphone' | 'globe' }) => {
  if (type === 'monitor') return <Monitor className="h-4 w-4" />;
  if (type === 'smartphone') return <Smartphone className="h-4 w-4" />;
  return <Globe className="h-4 w-4" />;
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserType | null>(null);
  const [form, setForm] = useState<ProfileFormData>({
    fullName: '',
    fullNameThai: '',
    department: '',
    position: '',
    phoneNumber: '',
  });

  // Load profile
  useEffect(() => {
    apiClient.get<UserType>('/auth/me').then((data) => {
      setProfile(data);
      setForm({
        fullName: data.fullName || '',
        fullNameThai: data.fullNameThai || '',
        department: data.department || '',
        position: data.position || '',
        phoneNumber: data.phoneNumber || '',
      });
    }).catch(() => {
      toast.error('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    });
  }, []);

  // Load sessions
  const loadSessions = useCallback(() => {
    setSessionsLoading(true);
    apiClient.get<SessionInfo[]>('/auth/sessions').then((data) => {
      setSessions(data);
    }).catch(() => {
      toast.error('ไม่สามารถโหลดรายการเซสชันได้');
    }).finally(() => {
      setSessionsLoading(false);
    });
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleEdit = () => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        fullNameThai: profile.fullNameThai || '',
        department: profile.department || '',
        position: profile.position || '',
        phoneNumber: profile.phoneNumber || '',
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast.error('กรุณากรอกชื่อ-นามสกุล (อังกฤษ)');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiClient.patch<UserType>('/auth/profile', {
        fullName: form.fullName.trim(),
        fullNameThai: form.fullNameThai.trim() || undefined,
        department: form.department.trim() || undefined,
        position: form.position.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
      });
      setProfile(updated);
      setUser({
        ...user!,
        fullName: updated.fullName,
        fullNameThai: updated.fullNameThai,
        department: updated.department,
        position: updated.position,
        phoneNumber: updated.phoneNumber,
      });
      setIsEditing(false);
      toast.success('บันทึกข้อมูลโปรไฟล์สำเร็จ');
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถบันทึกข้อมูลได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    setRevokingId(sessionId);
    try {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('ยกเลิกเซสชันสำเร็จ');
    } catch {
      toast.error('ไม่สามารถยกเลิกเซสชันได้');
    } finally {
      setRevokingId(null);
    }
  };

  const displayName = profile?.fullNameThai || profile?.fullName || 'User';
  const initials = (profile?.fullName?.charAt(0) || 'U').toUpperCase();
  const role = profile?.role || user?.role || 'VIEWER';
  const rc = roleConfig[role] || roleConfig.VIEWER;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Title */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          โปรไฟล์ส่วนตัว
        </h1>
        <p className="text-sm text-muted-foreground mt-1">My Profile</p>
      </div>

      {/* ── Profile Header Card ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold font-heading select-none">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
              {profile?.fullNameThai && profile.fullName && (
                <p className="text-sm text-muted-foreground">{profile.fullName}</p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant={rc.variant}>
                  <Shield className="h-3 w-3 mr-1" />
                  {rc.label}
                </Badge>
                {profile?.email && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                {profile?.department && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {profile.department}
                  </span>
                )}
                {profile?.position && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {profile.position}
                  </span>
                )}
                {profile?.phoneNumber && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {profile.phoneNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Edit button */}
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={handleEdit} className="shrink-0">
                <Pencil className="h-4 w-4 mr-1" />
                แก้ไข
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Form ── */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">แก้ไขข้อมูลส่วนตัว</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อ-นามสกุล (อังกฤษ) *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label>ชื่อ-นามสกุล (ไทย)</Label>
                <Input
                  value={form.fullNameThai}
                  onChange={(e) => setForm({ ...form, fullNameThai: e.target.value })}
                  placeholder="ชื่อ-นามสกุลภาษาไทย"
                />
              </div>
              <div className="space-y-2">
                <Label>แผนก / หน่วยงาน</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Department"
                />
              </div>
              <div className="space-y-2">
                <Label>ตำแหน่ง</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="Position"
                />
              </div>
              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์</Label>
                <Input
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                ยกเลิก
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Active Sessions Card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              เซสชันที่ใช้งานอยู่
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {sessions.length} เซสชัน
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              ไม่พบเซสชันที่ใช้งานอยู่
            </p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session, idx) => {
                const parsed = parseUserAgent(session.userAgent);
                const isFirst = idx === 0;
                return (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 rounded-lg border border-glass-border-subtle p-3 transition-colors hover:bg-muted/5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/8 text-primary">
                      <DeviceIcon type={parsed.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {parsed.browser} / {parsed.os}
                        </span>
                        {isFirst && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            เซสชันนี้
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{session.ipAddress || 'IP ไม่ทราบ'}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {relativeTime(session.lastActivityAt || session.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!isFirst && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive-subtle"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">ยกเลิก</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
