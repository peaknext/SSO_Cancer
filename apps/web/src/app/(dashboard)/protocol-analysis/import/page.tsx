'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

interface PreviewRow {
  hn: string;
  vn: string;
  visitDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hpi: string | null;
  doctorNotes: string | null;
  medicationsRaw: string | null;
  errors: string[];
}

interface PreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; message: string }[];
  preview: PreviewRow[];
  minVisitDate: string | null;
  maxVisitDate: string | null;
}

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface ImportResult {
  importId: number;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: { row: number; message: string }[];
}

type Step = 'upload' | 'preview' | 'result';

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', f);
      const data = await apiClient.upload<PreviewResult>(
        '/protocol-analysis/import/preview',
        formData,
      );
      setPreview(data);
      setStep('preview');
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.upload<ImportResult>(
        '/protocol-analysis/import/confirm',
        formData,
      );
      setResult(data);
      setStep('result');
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/protocol-analysis">
            <ArrowLeft className="h-4 w-4 mr-1" />
            วิเคราะห์โปรโตคอล
          </Link>
        </Button>
        <h1 className="font-heading text-xl font-bold">นำเข้าข้อมูลผู้ป่วย</h1>
        <p className="text-sm text-muted-foreground mt-1">
          อัปโหลดไฟล์ .xlsx เพื่อนำเข้าข้อมูลการเข้ารับบริการ
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-border" />}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                step === s
                  ? 'bg-primary/10 text-primary'
                  : step === 'result' || (step === 'preview' && i === 0)
                    ? 'bg-primary/8 text-foreground/60'
                    : 'text-foreground/40'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[10px]">
                {i + 1}
              </span>
              {s === 'upload' ? 'อัปโหลด' : s === 'preview' ? 'ตรวจสอบ' : 'ผลลัพธ์'}
            </div>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              {loading ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">กำลังอ่านไฟล์...</p>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">ลากไฟล์มาวางที่นี่</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      หรือคลิกเพื่อเลือกไฟล์ (.xlsx, สูงสุด 10MB)
                    </p>
                  </div>
                  <label className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span>เลือกไฟล์</span>
                    </Button>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="mt-6 rounded-lg border border-border/60 bg-background p-4">
              <h3 className="text-sm font-medium mb-2">คอลัมน์ที่ต้องมี:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-foreground/60">
                <div><Badge variant="outline" className="text-xs">hn</Badge> เลข HN</div>
                <div><Badge variant="outline" className="text-xs">vn</Badge> เลข VN</div>
                <div><Badge variant="outline" className="text-xs">vsdate</Badge> วันที่</div>
                <div><Badge variant="outline" className="text-xs">วินิจฉัยหลัก</Badge> ICD-10</div>
              </div>
              <p className="text-xs text-foreground/50 mt-2">
                คอลัมน์เสริม: วินิจฉัยรอง, HPI, หมายเหตุจากแพทย์, รายการยาที่ได้รับ
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{preview.totalRows}</p>
                <p className="text-xs text-muted-foreground">แถวทั้งหมด</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-green-600">{preview.validRows}</p>
                <p className="text-xs text-muted-foreground">ถูกต้อง</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-destructive">{preview.invalidRows}</p>
                <p className="text-xs text-muted-foreground">ข้อผิดพลาด</p>
              </CardContent>
            </Card>
          </div>

          {/* File info & date range */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-sm">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <span className="font-medium">{file?.name}</span>
              <span className="text-muted-foreground">
                ({(file?.size ? file.size / 1024 : 0).toFixed(1)} KB)
              </span>
            </div>
            {preview.minVisitDate && preview.maxVisitDate && (
              <div className="flex items-center gap-2 rounded-lg bg-white/40 dark:bg-white/5 backdrop-blur-sm border border-glass-border-subtle px-3 py-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span>
                  ข้อมูลทั้งหมด จากวันที่{' '}
                  <span className="font-medium text-foreground">
                    {formatThaiDate(preview.minVisitDate)}
                  </span>
                  {' '}ถึง{' '}
                  <span className="font-medium text-foreground">
                    {formatThaiDate(preview.maxVisitDate)}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Errors */}
          {preview.errors.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-destructive">
                  ข้อผิดพลาด ({preview.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-32 overflow-auto space-y-1">
                  {preview.errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="font-mono text-destructive">แถว {e.row}:</span> {e.message}
                    </p>
                  ))}
                  {preview.errors.length > 20 && (
                    <p className="text-xs text-muted-foreground">
                      ...และอีก {preview.errors.length - 20} รายการ
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                ตัวอย่างข้อมูล (แสดง {preview.preview.length} แถวแรก)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium">HN</th>
                      <th className="text-left py-2 px-2 font-medium">VN</th>
                      <th className="text-left py-2 px-2 font-medium">วันที่</th>
                      <th className="text-left py-2 px-2 font-medium">วินิจฉัยหลัก</th>
                      <th className="text-left py-2 px-2 font-medium">ยา</th>
                      <th className="text-left py-2 px-2 font-medium">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-primary/4">
                        <td className="py-2 px-2 font-mono">{row.hn}</td>
                        <td className="py-2 px-2 font-mono">{row.vn}</td>
                        <td className="py-2 px-2">{row.visitDate}</td>
                        <td className="py-2 px-2 font-mono">{row.primaryDiagnosis}</td>
                        <td className="py-2 px-2 max-w-[200px] truncate" title={row.medicationsRaw || ''}>
                          {row.medicationsRaw ? row.medicationsRaw.substring(0, 40) + '...' : '—'}
                        </td>
                        <td className="py-2 px-2">
                          {row.errors.length === 0 ? (
                            <Badge variant="default" className="text-[10px] bg-green-600">OK</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              {row.errors.length} error
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep('upload');
                setFile(null);
                setPreview(null);
                setError(null);
              }}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleConfirm} disabled={loading || preview.validRows === 0}>
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  กำลังนำเข้า...
                </>
              ) : (
                `ยืนยันนำเข้า (${preview.validRows} แถว)`
              )}
            </Button>
          </div>
        </>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">นำเข้าสำเร็จ</h2>
              <p className="text-sm text-muted-foreground mt-1">
                นำเข้า {result.importedRows} จาก {result.totalRows} แถว
                {result.skippedRows > 0 && ` (ข้าม ${result.skippedRows} แถว)`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <div>
                <p className="text-xl font-bold tabular-nums">{result.totalRows}</p>
                <p className="text-xs text-muted-foreground">ทั้งหมด</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-green-600">{result.importedRows}</p>
                <p className="text-xs text-muted-foreground">นำเข้า</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums text-orange-500">{result.skippedRows}</p>
                <p className="text-xs text-muted-foreground">ข้าม</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="text-left rounded-lg border border-border/60 bg-background p-3 max-h-32 overflow-auto">
                {result.errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-xs text-foreground/60">
                    <span className="font-mono text-orange-500">แถว {e.row}:</span> {e.message}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => router.push('/protocol-analysis')}>
                ไปหน้าวิเคราะห์
              </Button>
              <Button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                  setError(null);
                }}
              >
                นำเข้าเพิ่ม
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
