'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  FlaskConical,
  BedDouble,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { HisPatientCard } from '../components/his-patient-card';
import { HisVisitTimeline } from '../components/his-visit-timeline';
import { HisAdvancedSearch } from './his-advanced-search';
import { HisAdmissionSummary } from '../components/his-admission-summary';
import type { IpdPreviewResult } from '../components/his-admission-summary';
import type { HisPatient } from '../components/patient-search-results';
import type { VisitCompleteness } from '../components/his-completeness-badge';
import { usePersistedState } from '@/hooks/use-persisted-state';

// =====================================================
// Types (matching backend HisSearchPreviewResult)
// =====================================================

interface HisPatientSearchResult {
  hn: string;
  citizenId: string;
  titleName?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  insuranceType?: string;
  mainHospitalCode?: string;
}

interface HisPreviewVisit {
  visit: {
    vn: string;
    visitDate: string;
    serviceStartTime?: string;
    serviceEndTime?: string;
    physicianLicenseNo?: string;
    clinicCode?: string;
    primaryDiagnosis: string;
    secondaryDiagnoses?: string;
    hpi?: string;
    doctorNotes?: string;
    billNo?: string;
    visitType?: string;
    dischargeType?: string;
    nextAppointmentDate?: string;
    serviceClass?: string;
    serviceType?: string;
    prescriptionTime?: string;
    dayCover?: string;
    medications?: { hospitalCode: string; medicationName: string; quantity?: string; unit?: string }[];
    billingItems?: {
      hospitalCode: string;
      aipnCode?: string;
      tmtCode?: string;
      stdCode?: string;
      billingGroup: string;
      description: string;
      dfsText?: string;
      quantity: number;
      unitPrice: number;
      claimUnitPrice?: number;
      claimCategory?: string;
      packsize?: string;
      sigCode?: string;
      sigText?: string;
      supplyDuration?: string;
    }[];
  };
  isCancerRelated: boolean;
  isAlreadyImported: boolean;
  completeness: VisitCompleteness;
  hasProtocolDrugs: boolean;
}

interface HisSearchPreviewResult {
  patient: HisPatientSearchResult;
  existingPatientId: number | null;
  visits: HisPreviewVisit[];
  summary: {
    totalVisits: number;
    cancerRelatedVisits: number;
    alreadyImported: number;
    newImportable: number;
    completeVisits: number;
    incompleteVisits: number;
  };
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

type Step = 'search' | 'results' | 'manual';

// =====================================================
// Component
// =====================================================

export default function PatientCreatePage() {
  const router = useRouter();

  // Step machine
  const [step, setStep] = useState<Step>('search');

  // Search tab: simple vs advanced (persisted)
  const [searchTab, setSearchTab, tabHydrated] = usePersistedState<'simple' | 'advanced'>(
    'cancer-patients-new:searchTab',
    'simple',
  );

  // HIS search state (persisted)
  const [searchQuery, setSearchQuery, queryHydrated] = usePersistedState(
    'cancer-patients-new:searchQuery',
    '',
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Results state (new unified search+preview)
  const [searchResult, setSearchResult] = useState<HisSearchPreviewResult | null>(null);
  const [importingVn, setImportingVn] = useState<string | null>(null);
  const [importedVns, setImportedVns] = useState<Set<string>>(new Set());
  const [syncingVn, setSyncingVn] = useState<string | null>(null);

  // Bulk import state (advanced search)
  const [importingHn, setImportingHn] = useState<string | null>(null);
  // Track which HNs have been imported from advanced search (HN → patientId)
  const [advImportedPatients, setAdvImportedPatients] = useState<Map<string, number>>(new Map());

  // IPD state
  const [ipdPreview, setIpdPreview] = useState<IpdPreviewResult | null>(null);
  const [ipdLoading, setIpdLoading] = useState(false);
  const [ipdImporting, setIpdImporting] = useState(false);

  // General error
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

  /** When a patient is selected from advanced search, load preview */
  const handleAdvancedSelectPatient = useCallback(
    async (patient: HisPatient) => {
      const q = patient.hn;
      setSearchQuery(q);
      setSearching(true);
      setSearchError(null);
      setError(null);
      setIpdPreview(null);
      try {
        const result = await apiClient.get<HisSearchPreviewResult>(
          `/his-integration/search-preview?q=${encodeURIComponent(q)}&type=hn`,
        );
        setSearchResult(result);
        setImportedVns(new Set());
        setStep('results');
        // Fetch IPD preview in parallel (fire-and-forget)
        apiClient
          .get<IpdPreviewResult>(`/his-integration/ipd/preview/${encodeURIComponent(q)}`)
          .then(setIpdPreview)
          .catch(() => setIpdPreview(null));
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'ไม่สามารถดึงข้อมูลจาก HIS ได้';
        setSearchError(msg);
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  /** Bulk import all cancer visits for a patient from advanced search */
  const handleImportAll = useCallback(
    async (patient: HisPatient) => {
      setImportingHn(patient.hn);
      setError(null);
      try {
        const result = await apiClient.post<{
          patientId: number;
          importedVisits: number;
          linkedVisitCount: number;
        }>(`/his-integration/import/${encodeURIComponent(patient.hn)}`);

        if (result.importedVisits === 0) {
          toast.info(`${patient.fullName} — ไม่พบ visit ใหม่ที่ยังไม่เคยนำเข้า`);
        } else {
          toast.success(
            `นำเข้าผู้ป่วย ${patient.fullName} สำเร็จ — ${result.importedVisits} visits`,
            {
              action: {
                label: 'ดูข้อมูลผู้ป่วย',
                onClick: () => router.push(`/cancer-patients/${result.patientId}`),
              },
            },
          );
        }

        // Notify advanced search to update patient status
        setAdvImportedPatients((prev) => {
          const next = new Map(prev);
          next.set(patient.hn, result.patientId);
          return next;
        });
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูลได้';
        toast.error(`นำเข้าผู้ป่วยล้มเหลว`, { description: msg });
      } finally {
        setImportingHn(null);
      }
    },
    [router],
  );

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setError(null);
    setIpdPreview(null);
    try {
      const result = await apiClient.get<HisSearchPreviewResult>(
        `/his-integration/search-preview?q=${encodeURIComponent(q)}`,
      );
      setSearchResult(result);
      setImportedVns(new Set());
      setStep('results');
      // Fetch IPD preview in parallel (fire-and-forget)
      if (result.patient?.hn) {
        apiClient
          .get<IpdPreviewResult>(
            `/his-integration/ipd/preview/${encodeURIComponent(result.patient.hn)}`,
          )
          .then(setIpdPreview)
          .catch(() => setIpdPreview(null));
      }
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถค้นหาจาก HIS ได้';
      setSearchError(msg);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleImportVisit = useCallback(
    async (vn: string, forceIncomplete: boolean) => {
      if (!searchResult) return;
      setImportingVn(vn);
      setError(null);
      try {
        const result = await apiClient.post<{ patientId: number; importId: number }>(
          `/his-integration/import-visit?q=${encodeURIComponent(searchQuery.trim())}`,
          { vn, forceIncomplete },
        );
        setImportedVns((prev) => new Set(prev).add(vn));
        toast.success(`นำเข้า VN ${vn} สำเร็จ`, {
          action: {
            label: 'ดูข้อมูลผู้ป่วย',
            onClick: () => router.push(`/cancer-patients/${result.patientId}`),
          },
        });
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูลได้';
        toast.error(`นำเข้า VN ${vn} ล้มเหลว`, { description: msg });
      } finally {
        setImportingVn(null);
      }
    },
    [searchResult, searchQuery, router],
  );

  const handleSyncVisit = useCallback(
    async (vn: string) => {
      if (!searchResult) return;
      setSyncingVn(vn);
      setError(null);
      try {
        await apiClient.patch<{
          patientId: number;
          visitId: number;
          updatedFields: string[];
          medicationsCount: number;
          billingItemsCount: number;
        }>(
          `/his-integration/sync-visit?q=${encodeURIComponent(searchQuery.trim())}`,
          { vn },
        );
        toast.success(`ซิงค์ VN ${vn} สำเร็จ`, {
          description: 'ข้อมูลถูกอัปเดตจาก HIS เรียบร้อยแล้ว',
        });
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'ไม่สามารถซิงค์ข้อมูลได้';
        toast.error(`ซิงค์ VN ${vn} ล้มเหลว`, { description: msg });
      } finally {
        setSyncingVn(null);
      }
    },
    [searchResult, searchQuery],
  );

  /** Bulk import all new cancer visits from simple search results */
  const handleImportAllSimple = useCallback(
    async (options?: { from?: string; to?: string }) => {
      if (!searchResult) return;
      const hn = searchResult.patient.hn;
      setImportingHn(hn);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (options?.from) params.set('from', options.from);
        if (options?.to) params.set('to', options.to);
        const qs = params.toString();
        const url = `/his-integration/import/${encodeURIComponent(hn)}${qs ? `?${qs}` : ''}`;
        const result = await apiClient.post<{
          patientId: number;
          importedVisits: number;
          linkedVisitCount: number;
        }>(url);

        if (result.importedVisits === 0) {
          toast.info('ไม่พบ visit ใหม่ที่ยังไม่เคยนำเข้า');
        } else {
          toast.success(`นำเข้า ${result.importedVisits} visits สำเร็จ`, {
            action: {
              label: 'ดูข้อมูลผู้ป่วย',
              onClick: () => router.push(`/cancer-patients/${result.patientId}`),
            },
          });
        }

        // Mark cancer visits as imported in local state
        setImportedVns((prev) => {
          const next = new Set(prev);
          for (const pv of searchResult.visits) {
            if (pv.isCancerRelated && !pv.isAlreadyImported) {
              next.add(pv.visit.vn);
            }
          }
          return next;
        });

        // Update existingPatientId so the "already in system" banner shows
        setSearchResult((prev) =>
          prev ? { ...prev, existingPatientId: result.patientId } : prev,
        );
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูลได้';
        toast.error('นำเข้าล้มเหลว', { description: msg });
      } finally {
        setImportingHn(null);
      }
    },
    [searchResult, router],
  );

  /** Bulk import all IPD admissions */
  const handleImportAllIpd = useCallback(async () => {
    if (!searchResult?.patient?.hn) return;
    const hn = searchResult.patient.hn;
    setIpdImporting(true);
    try {
      const result = await apiClient.post<{
        patientId: number;
        importedVisits: number;
      }>(`/his-integration/ipd/import/${encodeURIComponent(hn)}`);
      if (result.importedVisits === 0) {
        toast.info('ไม่พบ admission ใหม่ที่ยังไม่เคยนำเข้า');
      } else {
        toast.success(`นำเข้า ${result.importedVisits} admission ผู้ป่วยในสำเร็จ`, {
          action: {
            label: 'ดูข้อมูลผู้ป่วย',
            onClick: () => router.push(`/cancer-patients/${result.patientId}`),
          },
        });
      }
      // Refresh IPD preview
      apiClient
        .get<IpdPreviewResult>(`/his-integration/ipd/preview/${encodeURIComponent(hn)}`)
        .then(setIpdPreview)
        .catch(() => {});
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูล IPD ได้';
      toast.error('นำเข้า IPD ล้มเหลว', { description: msg });
    } finally {
      setIpdImporting(false);
    }
  }, [searchResult, router]);

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

  const filtersHydrated = tabHydrated && queryHydrated;

  const resetToSearch = () => {
    setStep('search');
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
      <div className={cn('space-y-6', step !== 'search' && 'hidden', !filtersHydrated && 'opacity-0')}>
        {/* Tab bar */}
        <div className="flex border-b">
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2',
              searchTab === 'simple'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setSearchTab('simple')}
          >
            ค้นหาผู้ป่วย
          </button>
          <button
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 flex items-center gap-1.5',
              searchTab === 'advanced'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setSearchTab('advanced')}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            ค้นหาขั้นสูงจาก HIS
          </button>
        </div>

        {/* Simple search */}
        {searchTab === 'simple' && (
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
                  placeholder="กรอก HN หรือเลขบัตรประชาชน 13 หลัก"
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

              {/* Loading */}
              {searching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  กำลังค้นหาจาก HIS...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Advanced search */}
        {searchTab === 'advanced' && (
          <HisAdvancedSearch
            onSelectPatient={handleAdvancedSelectPatient}
            onImportAll={handleImportAll}
            importingHn={importingHn}
            previewing={searching}
            importedPatients={advImportedPatients}
          />
        )}

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

      {/* ==================== STEP: RESULTS ==================== */}
      <div className={cn('space-y-5', step !== 'results' && 'hidden')}>
        {searchResult && (
          <>
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 text-muted-foreground"
              onClick={resetToSearch}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              ค้นหาใหม่
            </Button>

            {/* Banner: patient already in system — link to detail page */}
            {searchResult.existingPatientId !== null && (
              <div className="flex items-center gap-3 rounded-lg bg-primary/8 border border-primary/20 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium">ผู้ป่วยนี้มีในระบบแล้ว</span>
                  <span className="text-muted-foreground ml-1">
                    — สามารถนำเข้า visit ใหม่ได้จากด้านล่าง
                  </span>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0 h-8 text-xs gap-1.5">
                  <Link href={`/cancer-patients/${searchResult.existingPatientId}`}>
                    ไปที่หน้ารายละเอียด
                  </Link>
                </Button>
              </div>
            )}

            {/* Patient card */}
            <HisPatientCard
              patient={searchResult.patient}
              existingPatientId={searchResult.existingPatientId}
            />

            {/* OPD Visit timeline with summary + per-visit import + batch buttons */}
            <HisVisitTimeline
              visits={searchResult.visits}
              summary={searchResult.summary}
              importedVns={importedVns}
              importingVn={importingVn}
              onImportVisit={handleImportVisit}
              syncingVn={syncingVn}
              onSyncVisit={handleSyncVisit}
              onImportAll={handleImportAllSimple}
              importingAll={importingHn !== null}
              onBatchSync={undefined}
            />

            {/* IPD Admission section */}
            <div className="border-t border-border/60 pt-5">
              {ipdLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  กำลังดึงข้อมูล IPD...
                </div>
              ) : ipdPreview ? (
                <HisAdmissionSummary
                  preview={ipdPreview}
                  onImportAll={handleImportAllIpd}
                  importing={ipdImporting}
                />
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  <BedDouble className="h-5 w-5 mx-auto mb-1 opacity-40" />
                  ไม่พบข้อมูล Admission ผู้ป่วยใน
                </div>
              )}
            </div>
          </>
        )}
      </div>

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
