'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Search,
  Download,
  AlertCircle,
  X,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { PatientSearchResults, HisPatient } from './patient-search-results';
import { HisAdvancedSearch } from './his-advanced-search';

// =====================================================
// Types
// =====================================================

interface PreviewResult {
  patient: HisPatient;
  existingPatientId: number | null;
  totalVisits: number;
  cancerRelatedVisits: number;
  alreadyImportedVns: string[];
  newVisitsToImport: number;
}

interface ImportResult {
  patientId: number;
  importId: number;
  totalVisitsFromHis: number;
  cancerRelatedVisits: number;
  importedVisits: number;
  skippedDuplicate: number;
  skippedNonCancer: number;
  linkedVisitCount: number;
}

// Manual registration schema
const patientSchema = z.object({
  hn: z.string().min(1, 'กรุณากรอก HN').max(20, 'HN ต้องไม่เกิน 20 ตัวอักษร'),
  citizenId: z
    .string()
    .length(13, 'เลขบัตรประชาชนต้องมี 13 หลัก')
    .regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลักเท่านั้น'),
  fullName: z.string().min(1, 'กรุณากรอกชื่อ-สกุล').max(200, 'ชื่อ-สกุลต้องไม่เกิน 200 ตัวอักษร'),
});

type PatientFormValues = z.infer<typeof patientSchema>;

type Step = 'search' | 'preview' | 'importing' | 'result' | 'manual';

// =====================================================
// Component
// =====================================================

export default function PatientCreatePage() {
  const router = useRouter();

  // Step machine
  const [step, setStep] = useState<Step>('search');
  const [searchTab, setSearchTab] = useState<'simple' | 'advanced'>('simple');

  // HIS search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HisPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Preview state
  const [selectedPatient, setSelectedPatient] = useState<HisPatient | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual registration form
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { hn: '', citizenId: '', fullName: '' },
  });

  // =====================================================
  // Handlers
  // =====================================================

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const results = await apiClient.get<HisPatient[]>(
        `/his-integration/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      setSearchResults(results);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถค้นหาจาก HIS ได้';
      setSearchError(msg);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPatient = async (patient: HisPatient) => {
    setSelectedPatient(patient);
    setPreviewing(true);
    setError(null);
    try {
      const result = await apiClient.get<PreviewResult>(
        `/his-integration/preview/${encodeURIComponent(patient.hn)}`,
      );
      setPreview(result);
      setStep('preview');
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถดึงข้อมูลจาก HIS ได้';
      setError(msg);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedPatient) return;
    setImporting(true);
    setStep('importing');
    setError(null);
    try {
      const result = await apiClient.post<ImportResult>(
        `/his-integration/import/${encodeURIComponent(selectedPatient.hn)}`,
        {},
      );
      setImportResult(result);
      setStep('result');
      toast.success(
        `นำเข้าข้อมูลสำเร็จ — ${result.importedVisits} visit${result.importedVisits > 1 ? 's' : ''}`,
      );
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูลได้';
      setError(msg);
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const handleManualSubmit = async (values: PatientFormValues) => {
    try {
      const result = await apiClient.post<{
        id: number;
        hn: string;
        linkedVisitCount: number;
      }>('/cancer-patients', values);

      const visitMsg =
        result.linkedVisitCount > 0
          ? ` — เชื่อมโยง ${result.linkedVisitCount} visit อัตโนมัติ`
          : '';

      toast.success(`ลงทะเบียนผู้ป่วยสำเร็จ${visitMsg}`);
      router.push(`/cancer-patients/${result.id}`);
    } catch (err: any) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถลงทะเบียนผู้ป่วยได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  const resetToSearch = () => {
    setStep('search');
    setSelectedPatient(null);
    setPreview(null);
    setImportResult(null);
    setError(null);
  };

  // =====================================================
  // Render helpers
  // =====================================================

  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/cancer-patients">
            <ArrowLeft className="h-4 w-4 mr-1" />
            ผู้ป่วยมะเร็ง
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          ลงทะเบียนผู้ป่วยใหม่
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ค้นหาผู้ป่วยจากระบบ HIS หรือลงทะเบียนด้วยตนเอง
        </p>
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

      {/* ==================== STEP: SEARCH ==================== */}
      {/* Use CSS hiding instead of conditional rendering to preserve search state */}
      <div className={cn('space-y-6', step !== 'search' && 'hidden')}>
        {/* Tab bar */}
        <div className="flex border-b">
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
              searchTab === 'simple'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setSearchTab('simple')}
          >
            ค้นหาผู้ป่วย
          </button>
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
              searchTab === 'advanced'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setSearchTab('advanced')}
          >
            ค้นหาขั้นสูงจาก HIS
          </button>
        </div>

        {/* Tab: Simple search */}
        <div className={cn(searchTab !== 'simple' && 'hidden')}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                ค้นหาจากระบบ HIS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="กรอก HN, เลขบัตรประชาชน 13 หลัก, หรือ ชื่อ-สกุล"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                  {searching ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">ค้นหา</span>
                </Button>
              </div>

              {/* Search error */}
              {searchError && (
                <div className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {searchError}
                </div>
              )}

              {/* Search results */}
              <PatientSearchResults
                results={searchResults}
                onSelect={handleSelectPatient}
                disabled={previewing}
              />

              {/* No results */}
              {hasSearched && !searching && searchResults.length === 0 && !searchError && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ไม่พบผู้ป่วยจากระบบ HIS
                </p>
              )}

              {/* Loading overlay for patient preview */}
              {previewing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  กำลังดึงข้อมูลจาก HIS...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tab: Advanced search — always mounted to preserve state */}
        <div className={cn(searchTab !== 'advanced' && 'hidden')}>
          <HisAdvancedSearch
            onSelectPatient={handleSelectPatient}
            previewing={previewing}
          />
        </div>

        {/* Manual registration link */}
        <div className="text-center">
          <button
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            onClick={() => setStep('manual')}
          >
            ลงทะเบียนด้วยตนเอง (ไม่ใช้ HIS)
          </button>
        </div>
      </div>

      {/* ==================== STEP: PREVIEW ==================== */}
      {step === 'preview' && preview && selectedPatient && (
        <>
          {/* Patient summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                ข้อมูลผู้ป่วย
                {preview.existingPatientId && (
                  <Badge variant="secondary" className="ml-2">มีอยู่ในระบบแล้ว</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">ชื่อ-สกุล</dt>
                  <dd className="font-medium">{selectedPatient.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">HN</dt>
                  <dd className="font-mono">{selectedPatient.hn}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">เลขบัตรประชาชน</dt>
                  <dd className="font-mono">{selectedPatient.citizenId}</dd>
                </div>
                {selectedPatient.gender && (
                  <div>
                    <dt className="text-muted-foreground">เพศ</dt>
                    <dd>{selectedPatient.gender === 'M' ? 'ชาย' : 'หญิง'}</dd>
                  </div>
                )}
                {selectedPatient.dateOfBirth && (
                  <div>
                    <dt className="text-muted-foreground">อายุ</dt>
                    <dd>{calculateAge(selectedPatient.dateOfBirth)} ปี ({selectedPatient.dateOfBirth})</dd>
                  </div>
                )}
                {selectedPatient.address && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">ที่อยู่</dt>
                    <dd>{selectedPatient.address}</dd>
                  </div>
                )}
                {selectedPatient.insuranceType && (
                  <div>
                    <dt className="text-muted-foreground">สิทธิ์</dt>
                    <dd>{selectedPatient.insuranceType}</dd>
                  </div>
                )}
                {selectedPatient.mainHospitalCode && (
                  <div>
                    <dt className="text-muted-foreground">รพ.ตามสิทธิ</dt>
                    <dd className="font-mono">{selectedPatient.mainHospitalCode}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Visit statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{preview.totalVisits}</p>
                <p className="text-xs text-muted-foreground">Visit ทั้งหมด</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-primary">{preview.cancerRelatedVisits}</p>
                <p className="text-xs text-muted-foreground">Cancer-related</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-muted-foreground">{preview.alreadyImportedVns.length}</p>
                <p className="text-xs text-muted-foreground">นำเข้าแล้ว</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className={cn(
                  'text-2xl font-bold tabular-nums',
                  preview.newVisitsToImport > 0 ? 'text-success' : 'text-muted-foreground',
                )}>
                  {preview.newVisitsToImport}
                </p>
                <p className="text-xs text-muted-foreground">ใหม่ (จะนำเข้า)</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetToSearch}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || preview.newVisitsToImport === 0}
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  กำลังนำเข้า...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1.5" />
                  นำเข้าข้อมูล ({preview.newVisitsToImport} visits)
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* ==================== STEP: IMPORTING ==================== */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">กำลังนำเข้าข้อมูลจาก HIS...</p>
            <p className="text-xs text-muted-foreground">กรุณารอสักครู่</p>
          </CardContent>
        </Card>
      )}

      {/* ==================== STEP: RESULT ==================== */}
      {step === 'result' && importResult && (
        <>
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <h2 className="text-lg font-semibold">นำเข้าข้อมูลสำเร็จ</h2>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-success">{importResult.importedVisits}</p>
                <p className="text-xs text-muted-foreground">นำเข้าสำเร็จ</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{importResult.skippedDuplicate}</p>
                <p className="text-xs text-muted-foreground">ข้ามซ้ำ</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{importResult.skippedNonCancer}</p>
                <p className="text-xs text-muted-foreground">ไม่ใช่มะเร็ง</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{importResult.linkedVisitCount}</p>
                <p className="text-xs text-muted-foreground">Visit ทั้งหมดในระบบ</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetToSearch}>
              นำเข้าผู้ป่วยรายอื่น
            </Button>
            <Button onClick={() => router.push(`/cancer-patients/${importResult.patientId}`)}>
              ดูข้อมูลผู้ป่วย
            </Button>
          </div>
        </>
      )}

      {/* ==================== STEP: MANUAL ==================== */}
      {step === 'manual' && (
        <>
          <div className="text-center">
            <button
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              onClick={resetToSearch}
            >
              กลับไปค้นหาจาก HIS
            </button>
          </div>

          <form onSubmit={handleSubmit(handleManualSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ลงทะเบียนด้วยตนเอง</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>HN (Hospital Number) *</Label>
                  <Input
                    placeholder="เช่น 6700001"
                    {...register('hn')}
                    className={cn(formErrors.hn && 'border-destructive')}
                    autoFocus
                  />
                  {formErrors.hn && (
                    <p className="text-xs text-destructive">{formErrors.hn.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>เลขบัตรประชาชน (Citizen ID) *</Label>
                  <Input
                    placeholder="1234567890123"
                    maxLength={13}
                    {...register('citizenId')}
                    className={cn(formErrors.citizenId && 'border-destructive')}
                  />
                  {formErrors.citizenId && (
                    <p className="text-xs text-destructive">{formErrors.citizenId.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">ตัวเลข 13 หลัก ไม่ต้องใส่ขีด</p>
                </div>

                <div className="space-y-2">
                  <Label>ชื่อ-สกุล (ภาษาไทย) *</Label>
                  <Input
                    placeholder="เช่น นายสมชาย ใจดี"
                    {...register('fullName')}
                    className={cn(formErrors.fullName && 'border-destructive')}
                  />
                  {formErrors.fullName && (
                    <p className="text-xs text-destructive">{formErrors.fullName.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">คำนำหน้า ชื่อ สกุล รวมเป็นฟิลด์เดียว</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/cancer-patients">ยกเลิก</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
