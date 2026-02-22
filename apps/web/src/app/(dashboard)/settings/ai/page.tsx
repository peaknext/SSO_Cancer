'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { cn } from '@/lib/utils';

interface AppSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  description: string | null;
  settingGroup: string;
}

interface GroupedSettings {
  [group: string]: AppSetting[];
}

const PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'claude', label: 'Anthropic Claude', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'openai', label: 'OpenAI', color: 'text-green-600 dark:text-green-400' },
];

export default function AiSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: allSettings, isLoading, refetch } = useApi<GroupedSettings>('/app-settings');
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Local state for editing
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState<string | null>(null);
  const [keyValid, setKeyValid] = useState<Record<string, boolean | null>>({});

  // Extract AI settings from grouped response
  const aiSettings = allSettings?.ai || [];

  // Initialize local values from fetched settings
  useEffect(() => {
    if (aiSettings.length > 0) {
      const map: Record<string, string> = {};
      for (const s of aiSettings) {
        map[s.settingKey] = s.settingValue;
      }
      setValues(map);
      setDirty(new Set());
    }
  }, [aiSettings.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const getValue = useCallback((key: string) => values[key] ?? '', [values]);

  const setValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setDirty((prev) => new Set(prev).add(key));
  };

  const saveKey = async (key: string) => {
    setSaving(key);
    try {
      await apiClient.patch(`/app-settings/${key}`, { settingValue: values[key] });
      toast.success(`บันทึก ${key} สำเร็จ`);
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error(apiErr?.error?.message || 'ไม่สามารถบันทึกได้');
    } finally {
      setSaving(null);
    }
  };

  const toggleShowKey = (key: string) => {
    setShowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const validateKey = async (providerName: string) => {
    const apiKeyField = `ai_${providerName}_api_key`;
    const apiKey = values[apiKeyField];
    if (!apiKey) {
      toast.error('กรุณาใส่ API Key ก่อน');
      return;
    }
    setValidating(providerName);
    setKeyValid((prev) => ({ ...prev, [providerName]: null }));
    try {
      const result = await apiClient.post<{ valid: boolean }>('/ai/settings/validate-key', {
        provider: providerName,
        apiKey,
      });
      setKeyValid((prev) => ({ ...prev, [providerName]: result.valid }));
      if (result.valid) {
        toast.success(`${providerName} API Key ถูกต้อง`);
      } else {
        toast.error(`${providerName} API Key ไม่ถูกต้อง`);
      }
    } catch {
      setKeyValid((prev) => ({ ...prev, [providerName]: false }));
      toast.error('ไม่สามารถตรวจสอบได้');
    } finally {
      setValidating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const aiEnabled = getValue('ai_enabled') === 'true';
  const activeProvider = getValue('ai_provider') || 'gemini';

  return (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          เฉพาะ Super Admin เท่านั้นที่สามารถแก้ไขตั้งค่า AI ได้
        </div>
      )}

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            ตั้งค่าทั่วไป
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">เปิดใช้งาน AI Suggestion</p>
              <p className="text-xs text-muted-foreground">
                เมื่อเปิด ผู้ใช้จะสามารถขอคำแนะนำจาก AI ได้ในหน้าวิเคราะห์โปรโตคอล
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => isSuperAdmin && setValue('ai_enabled', aiEnabled ? 'false' : 'true')}
                disabled={!isSuperAdmin}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer',
                  aiEnabled ? 'bg-primary' : 'bg-foreground/20',
                  !isSuperAdmin && 'opacity-50 cursor-not-allowed',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
                    aiEnabled ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
              {dirty.has('ai_enabled') && (
                <Button size="sm" onClick={() => saveKey('ai_enabled')} disabled={saving === 'ai_enabled'}>
                  <Save className="h-3 w-3 mr-1" />
                  บันทึก
                </Button>
              )}
            </div>
          </div>

          {/* Provider Selection */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">AI Provider</p>
              <p className="text-xs text-muted-foreground">เลือกผู้ให้บริการ AI ที่ต้องการใช้งาน</p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={getValue('ai_provider')}
                onChange={(val) => isSuperAdmin && setValue('ai_provider', val)}
                options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
                className="w-44"
              />
              {dirty.has('ai_provider') && (
                <Button size="sm" onClick={() => saveKey('ai_provider')} disabled={saving === 'ai_provider'}>
                  <Save className="h-3 w-3 mr-1" />
                  บันทึก
                </Button>
              )}
            </div>
          </div>

          {/* Max Tokens */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Max Tokens</p>
              <p className="text-xs text-muted-foreground">จำนวน token สูงสุดในคำตอบ</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={getValue('ai_max_tokens')}
                onChange={(e) => isSuperAdmin && setValue('ai_max_tokens', e.target.value)}
                className="w-28 h-8 text-sm text-right"
                disabled={!isSuperAdmin}
              />
              {dirty.has('ai_max_tokens') && (
                <Button size="sm" onClick={() => saveKey('ai_max_tokens')} disabled={saving === 'ai_max_tokens'}>
                  <Save className="h-3 w-3 mr-1" />
                  บันทึก
                </Button>
              )}
            </div>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Temperature</p>
              <p className="text-xs text-muted-foreground">
                ค่าต่ำ = คำตอบสม่ำเสมอ, ค่าสูง = คำตอบหลากหลาย (0.0-1.0)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={getValue('ai_temperature')}
                onChange={(e) => isSuperAdmin && setValue('ai_temperature', e.target.value)}
                className="w-20 h-8 text-sm text-right"
                disabled={!isSuperAdmin}
              />
              {dirty.has('ai_temperature') && (
                <Button size="sm" onClick={() => saveKey('ai_temperature')} disabled={saving === 'ai_temperature'}>
                  <Save className="h-3 w-3 mr-1" />
                  บันทึก
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards */}
      {PROVIDERS.map((provider) => {
        const apiKeyField = `ai_${provider.value}_api_key`;
        const modelField = `ai_${provider.value}_model`;
        const isActive = activeProvider === provider.value;
        const apiKeyValue = getValue(apiKeyField);
        const showingKey = showKeys.has(provider.value);
        const validation = keyValid[provider.value];

        return (
          <Card
            key={provider.value}
            className={cn(
              'transition-all',
              isActive && 'ring-2 ring-primary/40 border-primary/30',
            )}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className={cn('h-4 w-4', provider.color)} />
                {provider.label}
                {isActive && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">API Key</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showingKey ? 'text' : 'password'}
                      value={isSuperAdmin ? apiKeyValue : apiKeyValue ? '••••••••••••••••' : ''}
                      onChange={(e) => isSuperAdmin && setValue(apiKeyField, e.target.value)}
                      placeholder={isSuperAdmin ? 'ใส่ API Key...' : ''}
                      className="h-8 text-sm font-mono pr-8"
                      disabled={!isSuperAdmin}
                    />
                    {isSuperAdmin && apiKeyValue && (
                      <button
                        onClick={() => toggleShowKey(provider.value)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showingKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Validation indicator */}
                  {validation === true && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                  {validation === false && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}

                  {/* Validate button */}
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => validateKey(provider.value)}
                      disabled={!apiKeyValue || validating === provider.value}
                      className="shrink-0"
                    >
                      {validating === provider.value ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'ตรวจสอบ'
                      )}
                    </Button>
                  )}

                  {dirty.has(apiKeyField) && (
                    <Button size="sm" onClick={() => saveKey(apiKeyField)} disabled={saving === apiKeyField}>
                      <Save className="h-3 w-3 mr-1" />
                      บันทึก
                    </Button>
                  )}
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Model</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={getValue(modelField)}
                    onChange={(e) => isSuperAdmin && setValue(modelField, e.target.value)}
                    className="h-8 text-sm font-mono max-w-xs"
                    disabled={!isSuperAdmin}
                  />
                  {dirty.has(modelField) && (
                    <Button size="sm" onClick={() => saveKey(modelField)} disabled={saving === modelField}>
                      <Save className="h-3 w-3 mr-1" />
                      บันทึก
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Info */}
      <div className="rounded-lg border border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>API Key จะถูกเก็บในฐานข้อมูล — เฉพาะ Super Admin เท่านั้นที่สามารถดูและแก้ไขได้</p>
        <p>AI Suggestion จะไม่ส่งข้อมูลส่วนบุคคล (HN, VN) ไปยัง AI Provider</p>
      </div>
    </div>
  );
}
