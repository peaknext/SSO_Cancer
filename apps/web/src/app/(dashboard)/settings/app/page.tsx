'use client';

import { useState } from 'react';
import { Save, X, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/loading-skeleton';

interface AppSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description: string | null;
  settingGroup: string;
  isActive: boolean;
}

interface GroupedSettings {
  [group: string]: AppSetting[];
}

const groupLabels: Record<string, string> = {
  auth: 'การยืนยันตัวตน (Authentication)',
  display: 'การแสดงผล (Display)',
  hospital: 'สถานพยาบาล / HIS (Hospital & HIS Integration)',
  system: 'ระบบ (System)',
};

export default function AppSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: settings, isLoading, refetch } = useApi<GroupedSettings>('/app-settings');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const startEdit = (key: string, currentValue: string) => {
    setEditing(key);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiClient.patch(`/app-settings/${editing}`, { settingValue: editValue });
      toast.success('บันทึกสำเร็จ');
      cancelEdit();
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error(apiErr?.error?.message || 'ไม่สามารถบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const groups = settings ?? {};

  return (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning">
          เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขค่าตั้งระบบได้
        </div>
      )}

      {Object.entries(groups).map(([group, settings]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {groupLabels[group] || group}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(settings as AppSetting[]).map((setting) => (
                <div key={setting.settingKey} className="px-4 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-primary bg-primary-subtle rounded px-1.5 py-0.5">
                        {setting.settingKey}
                      </code>
                      {!setting.isActive && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    {setting.description && (
                      <p className="text-sm text-muted-foreground mt-1">{setting.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 w-48">
                    {editing === setting.settingKey ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success"
                          onClick={saveEdit}
                          disabled={saving}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={cancelEdit}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={isSuperAdmin ? () => startEdit(setting.settingKey, setting.settingValue) : undefined}
                        className={`text-sm font-mono px-2 py-1 rounded text-right w-full ${
                          isSuperAdmin
                            ? 'hover:bg-muted/10 cursor-pointer text-foreground'
                            : 'cursor-default text-muted-foreground'
                        }`}
                      >
                        {setting.settingValue}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
