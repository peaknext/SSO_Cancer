'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield,
  FileArchive,
  ArrowUp,
  ArrowDown,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DbStatus {
  tables: Record<string, number>;
  totalRows: number;
  tableCount: number;
}

interface BackupMetadata {
  version: string;
  createdAt: string;
  createdBy: { id: number; email: string; fullName: string } | null;
  tableCount: number;
  totalRows: number;
  includesAuditLogs: boolean;
  tables: Record<string, { count: number }>;
  checksum: string;
}

interface PreviewComparison {
  table: string;
  backupRows: number;
  currentRows: number;
  diff: number;
}

interface PreviewResult {
  metadata: BackupMetadata;
  comparison: PreviewComparison[];
  warnings: string[];
}

type RestoreState = 'idle' | 'uploading' | 'previewing' | 'confirming' | 'restoring' | 'success' | 'error';

interface RestoreResult {
  success: boolean;
  message: string;
  duration: string;
  results: Record<string, { expected: number; inserted: number }>;
  verification: {
    allMatch: boolean;
    verified: string[];
    mismatches: { table: string; expected: number; actual: number }[];
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BackupPage() {
  // Backup state
  const [includeAuditBackup, setIncludeAuditBackup] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Restore state machine
  const [restoreState, setRestoreState] = useState<RestoreState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [includeAuditRestore, setIncludeAuditRestore] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch DB status
  const { data: dbStatus, isLoading: statusLoading, refetch: refetchStatus } = useApi<DbStatus>(
    '/backup-restore/status',
  );

  // ─── Backup Download ────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      params.set('includeAuditLogs', includeAuditBackup ? 'true' : 'false');

      const url = `/api/v1/backup-restore/backup?${params.toString()}`;
      const token = apiClient.getAccessToken();

      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!resp.ok) throw new Error('Backup failed');

      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const date = new Date().toISOString().split('T')[0];
      a.download = `sso-cancer-backup-${date}.json.gz`;
      a.click();
      URL.revokeObjectURL(a.href);

      toast.success('ดาวน์โหลด Backup สำเร็จ');
    } catch {
      toast.error('ไม่สามารถดาวน์โหลด Backup ได้');
    } finally {
      setIsDownloading(false);
    }
  }, [includeAuditBackup]);

  // ─── Restore: File Select → Preview ─────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setRestoreState('uploading');
    setPreview(null);
    setConfirmText('');
    setRestoreResult(null);
    setRestoreError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.upload<PreviewResult>('/backup-restore/restore/preview', formData);
      setPreview(data);
      setRestoreState('previewing');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'ไม่สามารถอ่านไฟล์ได้';
      toast.error(msg);
      setRestoreState('error');
      setRestoreError(msg);
    }
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  // ─── Restore: Confirm ──────────────────────────────────────────────────────

  const handleRestore = useCallback(async () => {
    if (!selectedFile || confirmText !== 'RESTORE') return;

    setRestoreState('restoring');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const params = new URLSearchParams();
      params.set('includeAuditLogs', includeAuditRestore ? 'true' : 'false');

      const data = await apiClient.upload<RestoreResult>(
        `/backup-restore/restore/confirm?${params.toString()}`,
        formData,
      );
      setRestoreResult(data);
      setRestoreState('success');
      toast.success('กู้คืนข้อมูลสำเร็จ');
      refetchStatus();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'การกู้คืนล้มเหลว';
      toast.error(msg);
      setRestoreState('error');
      setRestoreError(msg);
    }
  }, [selectedFile, confirmText, includeAuditRestore, refetchStatus]);

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const resetRestore = useCallback(() => {
    setRestoreState('idle');
    setSelectedFile(null);
    setPreview(null);
    setConfirmText('');
    setRestoreResult(null);
    setRestoreError(null);
    setIncludeAuditRestore(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Card 1: Backup ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-primary" />
            สำรองข้อมูล
            <span className="text-sm font-normal text-muted-foreground">Backup</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* DB Status */}
          {statusLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : dbStatus ? (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">จำนวนตาราง</span>
                <Badge variant="default">{dbStatus.tableCount} ตาราง</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">จำนวนแถวทั้งหมด</span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {dbStatus.totalRows.toLocaleString()} แถว
                </span>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  รายละเอียดแต่ละตาราง
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(dbStatus.tables).map(([table, count]) => (
                    <div key={table} className="flex justify-between">
                      <span className="text-muted-foreground font-mono">{table}</span>
                      <span className="font-mono tabular-nums">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : null}

          {/* Audit logs checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAuditBackup}
              onChange={(e) => setIncludeAuditBackup(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
            />
            <span className="text-sm text-foreground">รวม Audit Logs</span>
            <span className="text-xs text-muted-foreground">(อาจทำให้ไฟล์ใหญ่ขึ้น)</span>
          </label>

          {/* Download button */}
          <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                กำลังสร้าง Backup...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" />
                ดาวน์โหลด Backup (.json.gz)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Card 2: Restore ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="h-5 w-5 text-primary" />
            กู้คืนข้อมูล
            <span className="text-sm font-normal text-muted-foreground">Restore</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning banner */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/30 px-3.5 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">การกู้คืนจะแทนที่ข้อมูลทั้งหมด</p>
              <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-300/80">
                Restoring will replace all existing data. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* ── State: Idle — File Upload ─────────────────────────────────── */}
          {restoreState === 'idle' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</p>
                <p className="text-xs text-muted-foreground mt-1">
                  รองรับ .json.gz และ .json (สูงสุด 50 MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.gz,.gzip"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* ── State: Uploading ──────────────────────────────────────────── */}
          {restoreState === 'uploading' && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">กำลังวิเคราะห์ไฟล์...</span>
            </div>
          )}

          {/* ── State: Previewing ─────────────────────────────────────────── */}
          {restoreState === 'previewing' && preview && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-2 text-sm">
                <FileArchive className="h-4 w-4 text-primary" />
                <span className="font-medium truncate">{selectedFile?.name}</span>
                <Badge variant="default" className="ml-auto shrink-0">
                  v{preview.metadata.version}
                </Badge>
              </div>

              {/* Metadata */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">สร้างเมื่อ</span>
                  <span className="font-mono">{new Date(preview.metadata.createdAt).toLocaleString('th-TH')}</span>
                </div>
                {preview.metadata.createdBy && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">สร้างโดย</span>
                    <span>{preview.metadata.createdBy.fullName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">จำนวนตาราง / แถว</span>
                  <span className="font-mono">
                    {preview.metadata.tableCount} / {preview.metadata.totalRows.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Checksum</span>
                  <span className="font-mono truncate max-w-[180px]">
                    {preview.metadata.checksum ? (
                      <Shield className="inline h-3 w-3 text-emerald-500 mr-0.5" />
                    ) : null}
                    {preview.metadata.checksum?.slice(0, 20) || 'ไม่มี'}...
                  </span>
                </div>
              </div>

              {/* Warnings */}
              {preview.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {preview.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Comparison table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">ตาราง</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Backup</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">ปัจจุบัน</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">ผลต่าง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {preview.comparison.map((row) => (
                        <tr key={row.table} className="hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-mono">{row.table}</td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                            {row.backupRows.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                            {row.currentRows.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <DiffBadge diff={row.diff} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit logs checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAuditRestore}
                  onChange={(e) => setIncludeAuditRestore(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-foreground">กู้คืน Audit Logs ด้วย</span>
                <span className="text-xs text-muted-foreground">(ค่าเริ่มต้น: ไม่กู้คืน)</span>
              </label>

              {/* Confirm section */}
              <div className="space-y-2 border-t pt-3">
                <label className="text-xs text-muted-foreground">
                  พิมพ์ <span className="font-mono font-bold text-destructive">RESTORE</span> เพื่อยืนยัน
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='พิมพ์ "RESTORE" ที่นี่'
                  className="font-mono text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={resetRestore} className="flex-1">
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRestoreState('confirming');
                    handleRestore();
                  }}
                  disabled={confirmText !== 'RESTORE'}
                  className="flex-1"
                >
                  <Database className="h-4 w-4 mr-1.5" />
                  กู้คืนข้อมูล
                </Button>
              </div>
            </div>
          )}

          {/* ── State: Confirming / Restoring ─────────────────────────────── */}
          {(restoreState === 'confirming' || restoreState === 'restoring') && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">กำลังกู้คืนข้อมูล...</p>
              <p className="text-xs text-muted-foreground">กรุณาอย่าปิดหน้านี้</p>
            </div>
          )}

          {/* ── State: Success ────────────────────────────────────────────── */}
          {restoreState === 'success' && restoreResult && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300/40 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-500/30 px-3.5 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    กู้คืนข้อมูลสำเร็จ
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                    ใช้เวลา {restoreResult.duration} —{' '}
                    {restoreResult.verification.allMatch ? 'ข้อมูลตรงกันทั้งหมด' : 'มีข้อมูลไม่ตรง'}
                  </p>
                </div>
              </div>

              {/* Verification status */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ตารางที่กู้คืน</span>
                  <span className="font-mono">{Object.keys(restoreResult.results).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">แถวทั้งหมด</span>
                  <span className="font-mono">
                    {Object.values(restoreResult.results)
                      .reduce((s, r) => s + r.inserted, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">การตรวจสอบ</span>
                  <Badge variant={restoreResult.verification.allMatch ? 'success' : 'warning'}>
                    {restoreResult.verification.allMatch ? 'ผ่านทั้งหมด' : 'มีข้อมูลไม่ตรง'}
                  </Badge>
                </div>
              </div>

              {/* Mismatches (if any) */}
              {restoreResult.verification.mismatches.length > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1.5">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    ตารางที่ข้อมูลไม่ตรง:
                  </p>
                  {restoreResult.verification.mismatches.map((m) => (
                    <div key={m.table} className="flex justify-between text-xs font-mono">
                      <span className="text-amber-700 dark:text-amber-300">{m.table}</span>
                      <span>
                        คาด {m.expected} / ได้ {m.actual}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={resetRestore} variant="outline" className="w-full">
                เสร็จสิ้น
              </Button>
            </div>
          )}

          {/* ── State: Error ──────────────────────────────────────────────── */}
          {restoreState === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">เกิดข้อผิดพลาด</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{restoreError}</p>
                </div>
              </div>
              <Button onClick={resetRestore} variant="outline" className="w-full">
                ลองใหม่
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground font-mono tabular-nums">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
        <ArrowUp className="h-3 w-3" /> +{diff.toLocaleString()}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400 font-mono tabular-nums">
      <ArrowDown className="h-3 w-3" /> {diff.toLocaleString()}
    </span>
  );
}
