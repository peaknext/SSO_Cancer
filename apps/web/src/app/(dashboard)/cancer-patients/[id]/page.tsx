'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Pencil,
  Plus,
  FolderOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  CreditCard,
  X,
  SearchCheck,
  ChevronsUpDown,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ProtocolCombobox } from '@/components/shared/protocol-combobox';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillingClaim {
  id: number;
  roundNumber: number;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  notes: string | null;
  isActive: boolean;
}

interface PatientCase {
  id: number;
  caseNumber: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  protocol: {
    id: number;
    protocolCode: string;
    nameThai: string;
    nameEnglish: string;
    cancerSite?: { id: number; siteCode: string; nameThai: string; nameEnglish: string };
  } | null;
  _count?: { visits: number };
}

interface Visit {
  id: number;
  vn: string;
  hn: string;
  visitDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hpi: string | null;
  doctorNotes: string | null;
  confirmedAt: string | null;
  case: {
    id: number;
    caseNumber: string;
    status: string;
    protocol: { id: number; protocolCode: string; nameThai: string } | null;
  } | null;
  confirmedProtocol: {
    id: number;
    protocolCode: string;
    nameThai: string;
    nameEnglish: string;
  } | null;
  confirmedRegimen: {
    id: number;
    regimenCode: string;
    regimenName: string;
  } | null;
  resolvedSite: { id: number; siteCode: string; nameThai: string } | null;
  billingClaims: BillingClaim[];
}

interface TopMatch {
  protocolCode: string;
  protocolName: string;
  score: number;
  regimenCode: string | null;
  regimenName: string | null;
}

interface PatientDetail {
  id: number;
  hn: string;
  citizenId: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  cases: PatientCase[];
  visits: Visit[];
  _count: { visits: number; cases: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function maskCitizenId(cid: string): string {
  if (!cid || cid.length !== 13) return cid;
  return `${cid[0]}-${cid.slice(1, 5)}-${cid.slice(5, 10)}-${cid.slice(10, 12)}-${cid[12]}`;
}

const caseStatusVariant: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

const caseStatusLabel: Record<string, string> = {
  ACTIVE: 'กำลังรักษา',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
};

const claimStatusVariant: Record<string, 'success' | 'destructive' | 'warning'> = {
  APPROVED: 'success',
  REJECTED: 'destructive',
  PENDING: 'warning',
};

const claimStatusLabel: Record<string, string> = {
  PENDING: 'รอผล',
  APPROVED: 'ผ่าน',
  REJECTED: 'ไม่ผ่าน',
};

const claimStatusOptions = [
  { value: 'PENDING', label: 'รอผล (Pending)' },
  { value: 'APPROVED', label: 'ผ่าน (Approved)' },
  { value: 'REJECTED', label: 'ไม่ผ่าน (Rejected)' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: patient, isLoading, refetch } = useApi<PatientDetail>(`/cancer-patients/${id}`);

  // Case creation modal
  const [showCreateCase, setShowCreateCase] = useState(false);

  // Confirm dialog for completing case
  const [completeCaseId, setCompleteCaseId] = useState<number | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);

  // Billing claim inline form
  const [addClaimVn, setAddClaimVn] = useState<string | null>(null);

  // Edit patient modal
  const [showEditPatient, setShowEditPatient] = useState(false);

  // Persisted preference: expand all visits by default?
  const [visitsExpanded, setVisitsExpanded] = usePersistedState('cp-detail-visitsExpanded', true);

  // Expanded visit entries
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const initializedPatientId = useRef<number | null>(null);

  // Initialize ONLY on first load or when navigating to a different patient
  useEffect(() => {
    if (patient?.visits?.length && patient.id !== initializedPatientId.current) {
      initializedPatientId.current = patient.id;
      setExpandedVisits(
        visitsExpanded
          ? new Set(patient.visits.map((v) => v.vn))
          : new Set(),
      );
    }
  }, [patient]);

  const toggleVisit = useCallback((vn: string) => {
    setExpandedVisits((prev) => {
      const next = new Set(prev);
      if (next.has(vn)) next.delete(vn);
      else next.add(vn);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (patient?.visits) {
      setExpandedVisits(new Set(patient.visits.map((v) => v.vn)));
      setVisitsExpanded(true);
    }
  }, [patient]);

  const collapseAll = useCallback(() => {
    setExpandedVisits(new Set());
    setVisitsExpanded(false);
  }, []);

  // Batch-fetch top matching protocol for unconfirmed visits
  const [topMatches, setTopMatches] = useState<Record<string, TopMatch>>({});
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    if (!patient?.visits?.length) return;
    const unconfirmedVns = patient.visits
      .filter((v) => !v.confirmedProtocol)
      .map((v) => v.vn);
    if (unconfirmedVns.length === 0) return;

    setLoadingMatches(true);
    const chunks: string[][] = [];
    for (let i = 0; i < unconfirmedVns.length; i += 20) {
      chunks.push(unconfirmedVns.slice(i, i + 20));
    }

    Promise.all(
      chunks.map((chunk) =>
        apiClient.post<Record<string, TopMatch | null>>(
          '/protocol-analysis/visits/batch-top-match',
          { vns: chunk },
        ),
      ),
    )
      .then((results) => {
        const merged: Record<string, TopMatch> = {};
        for (const batch of results) {
          for (const [vn, match] of Object.entries(batch)) {
            if (match) merged[vn] = match;
          }
        }
        setTopMatches(merged);
      })
      .catch(() => {
        // Silent — matching is best-effort
      })
      .finally(() => {
        setLoadingMatches(false);
      });
  }, [patient]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleCompleteCase = async () => {
    if (!completeCaseId) return;
    setCompleteLoading(true);
    try {
      await apiClient.patch(`/cancer-patients/${id}/cases/${completeCaseId}`, {
        status: 'COMPLETED',
      });
      toast.success('ปิดเคสสำเร็จ');
      setCompleteCaseId(null);
      refetch();
    } catch {
      toast.error('ไม่สามารถปิดเคสได้');
    } finally {
      setCompleteLoading(false);
    }
  };

  const handleAssignCase = async (vn: string, caseId: string) => {
    try {
      if (caseId === '') {
        await apiClient.delete(`/cancer-patients/visits/${vn}/assign-case`);
        toast.success('ยกเลิกเคสจาก visit สำเร็จ');
      } else {
        await apiClient.patch(`/cancer-patients/visits/${vn}/assign-case`, {
          caseId: Number(caseId),
        });
        toast.success('กำหนดเคสให้ visit สำเร็จ');
      }
      refetch();
    } catch {
      toast.error('ไม่สามารถกำหนดเคสได้');
    }
  };

  // ─── Loading / Not Found ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบผู้ป่วย — Patient not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/cancer-patients">กลับไปรายการผู้ป่วย</Link>
        </Button>
      </div>
    );
  }

  const activeCases = patient.cases.filter((c) => c.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/cancer-patients">
            <ArrowLeft className="h-4 w-4 mr-1" />
            ผู้ป่วยมะเร็ง
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <CodeBadge code={patient.hn} className="text-sm px-3 py-1" />
            <h1 className="font-heading text-xl font-bold text-foreground">
              {patient.fullName}
            </h1>
            <StatusBadge active={patient.isActive} />
          </div>
          <Button size="sm" onClick={() => setShowEditPatient(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            แก้ไข
          </Button>
        </div>
      </div>

      {/* ─── Patient Info Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">เลขบัตรประชาชน</p>
            <p className="font-mono text-sm tracking-wide">{maskCitizenId(patient.citizenId)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">จำนวน Visit</p>
            <p className="text-2xl font-bold tabular-nums">{patient._count.visits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">เคสทั้งหมด</p>
            <p className="text-2xl font-bold tabular-nums">{patient._count.cases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-1">วันลงทะเบียน</p>
            <p className="text-sm font-medium">{formatThaiDate(patient.createdAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Cases Section ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            เคสการรักษา ({patient.cases.length})
          </h2>
          <Button size="sm" onClick={() => setShowCreateCase(true)}>
            <Plus className="h-4 w-4 mr-1" />
            สร้างเคสใหม่
          </Button>
        </div>

        {patient.cases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              ยังไม่มีเคส — กดปุ่ม &quot;สร้างเคสใหม่&quot; เพื่อเริ่มต้น
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {patient.cases.map((c) => (
              <CaseCard
                key={c.id}
                patientCase={c}
                patientId={Number(id)}
                onComplete={() => setCompleteCaseId(c.id)}
                onUpdated={refetch}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Visit Timeline ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            ประวัติการรักษา ({patient.visits.length} visits)
          </h2>
          {patient.visits.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={expandedVisits.size === patient.visits.length ? collapseAll : expandAll}
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                {expandedVisits.size === patient.visits.length ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}
              </Button>
            </div>
          )}
        </div>

        {patient.visits.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              ยังไม่มี visit ที่เชื่อมโยงกับผู้ป่วยนี้
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

            <div className="space-y-1">
              {patient.visits.map((visit) => {
                const isExpanded = expandedVisits.has(visit.vn);
                return (
                  <VisitTimelineEntry
                    key={visit.vn}
                    visit={visit}
                    activeCases={activeCases}
                    isExpanded={isExpanded}
                    onToggle={() => toggleVisit(visit.vn)}
                    onAssignCase={handleAssignCase}
                    addClaimVn={addClaimVn}
                    onShowAddClaim={() => setAddClaimVn(visit.vn)}
                    onHideAddClaim={() => setAddClaimVn(null)}
                    onClaimAdded={refetch}
                    topMatch={topMatches[visit.vn] || null}
                    loadingMatch={loadingMatches}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      <CreateCaseModal
        open={showCreateCase}
        onClose={() => setShowCreateCase(false)}
        patientId={Number(id)}
        onCreated={refetch}
        activeCases={activeCases}
        onCloseCase={async (caseId: number) => {
          await apiClient.patch(`/cancer-patients/${id}/cases/${caseId}`, {
            status: 'COMPLETED',
          });
          toast.success('ปิดเคสสำเร็จ');
          refetch();
        }}
      />

      <EditPatientModal
        open={showEditPatient}
        onClose={() => setShowEditPatient(false)}
        patient={patient}
        onUpdated={refetch}
      />

      <ConfirmDialog
        open={completeCaseId !== null}
        onConfirm={handleCompleteCase}
        onCancel={() => setCompleteCaseId(null)}
        title="ปิดเคสการรักษา"
        description="เคสนี้จะถูกเปลี่ยนสถานะเป็น 'เสร็จสิ้น' คุณแน่ใจหรือไม่?"
        confirmText="ปิดเคส"
        loading={completeLoading}
      />
    </div>
  );
}

// ─── Case Card ───────────────────────────────────────────────────────────────

function CaseCard({
  patientCase: c,
  patientId,
  onComplete,
  onUpdated,
}: {
  patientCase: PatientCase;
  patientId: number;
  onComplete: () => void;
  onUpdated: () => void;
}) {
  const [editingProtocol, setEditingProtocol] = useState(false);
  const [selectedProtocolId, setSelectedProtocolId] = useState(
    c.protocol ? String(c.protocol.id) : '',
  );
  const [savingProtocol, setSavingProtocol] = useState(false);

  const handleSaveProtocol = async () => {
    setSavingProtocol(true);
    try {
      await apiClient.patch(`/cancer-patients/${patientId}/cases/${c.id}`, {
        protocolId: selectedProtocolId ? Number(selectedProtocolId) : null,
      });
      toast.success('อัปเดตโปรโตคอลสำเร็จ');
      setEditingProtocol(false);
      onUpdated();
    } catch {
      toast.error('ไม่สามารถอัปเดตโปรโตคอลได้');
    } finally {
      setSavingProtocol(false);
    }
  };

  const handleCancelEdit = () => {
    setSelectedProtocolId(c.protocol ? String(c.protocol.id) : '');
    setEditingProtocol(false);
  };

  return (
    <Card className={cn(c.status === 'ACTIVE' && 'border-primary/30')}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={caseStatusVariant[c.status] || 'secondary'}>
                {caseStatusLabel[c.status] || c.status}
              </Badge>
              <span className="font-mono font-semibold text-sm">{c.caseNumber}</span>
            </div>

            {/* Protocol display / edit */}
            <div className="mt-1.5 text-sm">
              {editingProtocol ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <ProtocolCombobox
                    value={selectedProtocolId}
                    onChange={setSelectedProtocolId}
                    placeholder="ค้นหาโปรโตคอล..."
                    className="w-full max-w-sm"
                    suggestedCancerSiteId={c.protocol?.cancerSite?.id}
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleSaveProtocol}
                      disabled={savingProtocol}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {savingProtocol ? 'บันทึก...' : 'บันทึก'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={handleCancelEdit}
                      disabled={savingProtocol}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  {c.protocol ? (
                    <span>
                      Protocol: <span className="text-foreground font-medium">{c.protocol.nameThai}</span>
                      {c.protocol.cancerSite && (
                        <span className="ml-1 text-xs">({c.protocol.cancerSite.nameThai})</span>
                      )}
                    </span>
                  ) : (
                    <span className="italic">ยังไม่ได้กำหนดโปรโตคอล</span>
                  )}
                  {c.status === 'ACTIVE' && (
                    <button
                      className="text-primary hover:text-primary/80 transition-colors"
                      onClick={() => setEditingProtocol(true)}
                      title={c.protocol ? 'เปลี่ยนโปรโตคอล' : 'กำหนดโปรโตคอล'}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
              <span>เปิด: {formatThaiDate(c.openedAt)}</span>
              {c.closedAt && <span>ปิด: {formatThaiDate(c.closedAt)}</span>}
              {c._count && <span>{c._count.visits} visits</span>}
            </div>
            {c.notes && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{c.notes}</p>
            )}
          </div>
          {c.status === 'ACTIVE' && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={onComplete}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                ปิดเคส
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Visit Timeline Entry ────────────────────────────────────────────────────

function VisitTimelineEntry({
  visit,
  activeCases,
  isExpanded,
  onToggle,
  onAssignCase,
  addClaimVn,
  onShowAddClaim,
  onHideAddClaim,
  onClaimAdded,
  topMatch,
  loadingMatch,
}: {
  visit: Visit;
  activeCases: PatientCase[];
  isExpanded: boolean;
  onToggle: () => void;
  onAssignCase: (vn: string, caseId: string) => void;
  addClaimVn: string | null;
  onShowAddClaim: () => void;
  onHideAddClaim: () => void;
  onClaimAdded: () => void;
  topMatch: TopMatch | null;
  loadingMatch: boolean;
}) {
  const activeBillingClaims = visit.billingClaims.filter((bc) => bc.isActive);
  const caseOptions = activeCases.map((c) => ({
    value: String(c.id),
    label: `${c.caseNumber}${c.protocol ? ` — ${c.protocol.nameThai}` : ''}`,
  }));

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className={cn(
        'absolute left-[15px] top-5 h-2.5 w-2.5 rounded-full border-2 border-background',
        visit.case ? 'bg-primary' : 'bg-muted-foreground/40',
      )} />

      <div className="py-2">
        {/* Clickable header */}
        <button
          onClick={onToggle}
          className="flex items-center gap-3 w-full text-left group"
        >
          <span className="text-xs text-muted-foreground w-[80px] shrink-0 tabular-nums">
            {formatThaiDate(visit.visitDate)}
          </span>
          <CodeBadge code={visit.vn} />
          {visit.case ? (
            <Badge variant="default" className="text-[10px]">
              {visit.case.caseNumber}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">ไม่มีเคส</Badge>
          )}
          {visit.confirmedProtocol ? (
            <span className="text-xs text-success hidden sm:inline">
              <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
              {visit.confirmedProtocol.nameThai}
            </span>
          ) : topMatch ? (
            <span className="text-xs text-warning hidden sm:inline">
              <SearchCheck className="h-3 w-3 inline mr-0.5" />
              {topMatch.protocolName} ({topMatch.score})
            </span>
          ) : null}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-3 ml-[80px] space-y-3">
            <Card>
              <CardContent className="py-4 px-5 space-y-3 text-sm">
                {/* Primary diagnosis */}
                {visit.primaryDiagnosis && (
                  <div>
                    <span className="text-xs text-muted-foreground">วินิจฉัยหลัก:</span>
                    <span className="ml-2 font-mono text-xs font-medium">{visit.primaryDiagnosis}</span>
                  </div>
                )}

                {/* Secondary diagnoses */}
                {visit.secondaryDiagnoses && (
                  <div>
                    <span className="text-xs text-muted-foreground">วินิจฉัยรอง:</span>
                    <span className="ml-2 font-mono text-xs">{visit.secondaryDiagnoses}</span>
                  </div>
                )}

                {/* Resolved cancer site */}
                {visit.resolvedSite && (
                  <div>
                    <span className="text-xs text-muted-foreground">ตำแหน่งมะเร็ง:</span>
                    <span className="ml-2">{visit.resolvedSite.nameThai}</span>
                  </div>
                )}

                {/* HPI */}
                {visit.hpi && (
                  <div>
                    <span className="text-xs text-muted-foreground">HPI:</span>
                    <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed line-clamp-3">
                      {visit.hpi}
                    </p>
                  </div>
                )}

                {/* Doctor notes */}
                {visit.doctorNotes && (
                  <div>
                    <span className="text-xs text-muted-foreground">หมายเหตุแพทย์:</span>
                    <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed line-clamp-3">
                      {visit.doctorNotes}
                    </p>
                  </div>
                )}

                {/* Protocol — confirmed or best match */}
                <div className="pt-2 border-t border-border/50">
                  {visit.confirmedProtocol ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                        <Badge variant="success" className="text-[10px] gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          ยืนยันแล้ว
                        </Badge>
                        <span className="font-mono text-xs font-semibold">{visit.confirmedProtocol.protocolCode}</span>
                        <span className="text-xs">{visit.confirmedProtocol.nameThai}</span>
                      </div>
                      {visit.confirmedRegimen && (
                        <div className="flex items-center gap-2 ml-15">
                          <span className="text-xs text-muted-foreground">สูตรยา:</span>
                          <span className="font-mono text-xs">{visit.confirmedRegimen.regimenCode}</span>
                          <span className="text-xs text-muted-foreground">{visit.confirmedRegimen.regimenName}</span>
                        </div>
                      )}
                      {visit.confirmedAt && (
                        <p className="text-[10px] text-muted-foreground ml-15">
                          ยืนยันเมื่อ {formatThaiDate(visit.confirmedAt)}
                        </p>
                      )}
                    </div>
                  ) : topMatch ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                        <Badge variant="warning" className="text-[10px] gap-0.5">
                          <SearchCheck className="h-2.5 w-2.5" />
                          แนะนำ
                        </Badge>
                        <span className="font-mono text-xs font-semibold">{topMatch.protocolCode}</span>
                        <span className="text-xs">{topMatch.protocolName}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">({topMatch.score} คะแนน)</span>
                      </div>
                      {topMatch.regimenCode && (
                        <div className="flex items-center gap-2 ml-15">
                          <span className="text-xs text-muted-foreground">สูตรยา:</span>
                          <span className="font-mono text-xs">{topMatch.regimenCode}</span>
                          {topMatch.regimenName && (
                            <span className="text-xs text-muted-foreground">{topMatch.regimenName}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : loadingMatch ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">กำลังวิเคราะห์...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                      <span className="text-xs text-muted-foreground italic">ยังไม่ได้ยืนยัน</span>
                    </div>
                  )}
                </div>

                {/* Case assignment */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">เคส:</span>
                    <Select
                      value={visit.case ? String(visit.case.id) : ''}
                      onChange={(v) => onAssignCase(visit.vn, v)}
                      options={caseOptions}
                      placeholder="ไม่มีเคส"
                      className="w-full max-w-xs"
                    />
                  </div>
                </div>

                {/* Billing Claims */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      การเรียกเก็บ ({activeBillingClaims.length})
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowAddClaim();
                      }}
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      เพิ่มรอบ
                    </Button>
                  </div>

                  {activeBillingClaims.length > 0 && (
                    <div className="space-y-1.5">
                      {activeBillingClaims.map((bc) => (
                        <BillingClaimRow
                          key={bc.id}
                          claim={bc}
                          vn={visit.vn}
                          onUpdated={onClaimAdded}
                        />
                      ))}
                    </div>
                  )}

                  {/* Inline add claim form */}
                  {addClaimVn === visit.vn && (
                    <AddBillingClaimForm
                      vn={visit.vn}
                      nextRound={(activeBillingClaims.length > 0
                        ? Math.max(...activeBillingClaims.map((bc) => bc.roundNumber)) + 1
                        : 1)}
                      onCancel={onHideAddClaim}
                      onCreated={() => {
                        onHideAddClaim();
                        onClaimAdded();
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Billing Claim Row ───────────────────────────────────────────────────────

function BillingClaimRow({
  claim,
  vn,
  onUpdated,
}: {
  claim: BillingClaim;
  vn: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(claim.status);
  const [rejectionReason, setRejectionReason] = useState(claim.rejectionReason || '');
  const [claimSubmittedAt, setClaimSubmittedAt] = useState(
    claim.submittedAt ? claim.submittedAt.slice(0, 10) : '',
  );
  const [claimDecidedAt, setClaimDecidedAt] = useState(
    claim.decidedAt ? claim.decidedAt.slice(0, 10) : '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/cancer-patients/visits/${vn}/billing-claims/${claim.id}`, {
        status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
        submittedAt: claimSubmittedAt || null,
        decidedAt: claimDecidedAt || null,
      });
      toast.success('อัปเดตผลเรียกเก็บสำเร็จ');
      setEditing(false);
      onUpdated();
    } catch {
      toast.error('ไม่สามารถอัปเดตได้');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/5 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium w-16 shrink-0">ครั้งที่ {claim.roundNumber}</span>
          <Select
            value={status}
            onChange={setStatus}
            options={claimStatusOptions}
            className="w-35"
          />
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground shrink-0">ส่ง:</Label>
            <Input
              type="date"
              value={claimSubmittedAt}
              onChange={(e) => setClaimSubmittedAt(e.target.value)}
              className="h-7 text-xs w-32.5"
            />
          </div>
          {status !== 'PENDING' && (
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-muted-foreground shrink-0">ผล:</Label>
              <Input
                type="date"
                value={claimDecidedAt}
                onChange={(e) => setClaimDecidedAt(e.target.value)}
                className="h-7 text-xs w-32.5"
              />
            </div>
          )}
        </div>
        {status === 'REJECTED' && (
          <Input
            placeholder="เหตุผลที่ไม่ผ่าน..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="text-xs h-8"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
            {saving ? 'บันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/5 rounded-md px-2 py-1.5 -mx-2 transition-colors"
      onClick={() => setEditing(true)}
    >
      <span className="text-muted-foreground w-14 shrink-0">ครั้งที่ {claim.roundNumber}:</span>
      <Badge variant={claimStatusVariant[claim.status] || 'secondary'} className="text-[10px]">
        {claimStatusLabel[claim.status] || claim.status}
      </Badge>
      {claim.submittedAt && (
        <span className="text-muted-foreground">ส่ง: {formatThaiDate(claim.submittedAt)}</span>
      )}
      {claim.decidedAt && (
        <span className="text-muted-foreground">ผล: {formatThaiDate(claim.decidedAt)}</span>
      )}
      {claim.status === 'REJECTED' && claim.rejectionReason && (
        <span className="text-destructive truncate max-w-50">{claim.rejectionReason}</span>
      )}
      {claim.notes && (
        <span className="text-muted-foreground truncate max-w-37.5">{claim.notes}</span>
      )}
    </div>
  );
}

// ─── Add Billing Claim Form ──────────────────────────────────────────────────

function AddBillingClaimForm({
  vn,
  nextRound,
  onCancel,
  onCreated,
}: {
  vn: string;
  nextRound: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [roundNumber, setRoundNumber] = useState(String(nextRound));
  const [status, setStatus] = useState('PENDING');
  const [submittedAt, setSubmittedAt] = useState(new Date().toISOString().slice(0, 10));
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const round = parseInt(roundNumber, 10);
    if (!round || round < 1) {
      toast.error('กรุณากรอกรอบที่ถูกต้อง');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/cancer-patients/visits/${vn}/billing-claims`, {
        roundNumber: round,
        status,
        submittedAt: submittedAt || undefined,
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        notes: notes || undefined,
      });
      toast.success(`เพิ่มรอบเรียกเก็บครั้งที่ ${round} สำเร็จ`);
      onCreated();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถเพิ่มรอบเรียกเก็บได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/2 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">เพิ่มรอบเรียกเก็บ</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">รอบที่</Label>
          <Input
            type="number"
            min={1}
            value={roundNumber}
            onChange={(e) => setRoundNumber(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">สถานะ</Label>
          <Select
            value={status}
            onChange={setStatus}
            options={claimStatusOptions}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">วันที่ส่ง</Label>
          <Input
            type="date"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {status === 'REJECTED' && (
        <div className="space-y-1">
          <Label className="text-xs">เหตุผลที่ไม่ผ่าน</Label>
          <Input
            placeholder="เช่น รหัสยาไม่ตรงกัน..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-xs">หมายเหตุ</Label>
        <Input
          placeholder="หมายเหตุเพิ่มเติม..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </div>
  );
}

// ─── Create Case Modal ───────────────────────────────────────────────────────

function CreateCaseModal({
  open,
  onClose,
  patientId,
  onCreated,
  activeCases,
  onCloseCase,
}: {
  open: boolean;
  onClose: () => void;
  patientId: number;
  onCreated: () => void;
  activeCases: PatientCase[];
  onCloseCase: (caseId: number) => Promise<void>;
}) {
  const [step, setStep] = useState<'check' | 'form'>('check');
  const [caseNumber, setCaseNumber] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [closingCaseId, setClosingCaseId] = useState<number | null>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setStep(activeCases.length > 0 ? 'check' : 'form');
      setCaseNumber('');
      setProtocolId('');
      setNotes('');
    }
  }, [open, activeCases.length]);

  const handleCloseActiveCase = async (caseId: number) => {
    setClosingCaseId(caseId);
    try {
      await onCloseCase(caseId);
      // After closing, if no more active cases remain, go straight to form
      if (activeCases.filter((c) => c.id !== caseId).length === 0) {
        setStep('form');
      }
    } catch {
      toast.error('ไม่สามารถปิดเคสได้');
    } finally {
      setClosingCaseId(null);
    }
  };

  const handleSubmit = async () => {
    if (!caseNumber.trim()) {
      toast.error('กรุณากรอกเลขที่เคส');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/cancer-patients/${patientId}/cases`, {
        caseNumber: caseNumber.trim(),
        protocolId: protocolId ? Number(protocolId) : undefined,
        notes: notes || undefined,
      });
      toast.success('สร้างเคสสำเร็จ');
      setCaseNumber('');
      setProtocolId('');
      setNotes('');
      onClose();
      onCreated();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถสร้างเคสได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="sm">
      {step === 'check' ? (
        /* ─── Active Cases Warning ─── */
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-warning-subtle flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold">มีเคสที่ยังเปิดอยู่</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                ผู้ป่วยมีเคสที่ยังไม่ได้ปิด {activeCases.length} เคส
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {activeCases.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{c.caseNumber}</span>
                    {c._count && (
                      <span className="text-xs text-muted-foreground">{c._count.visits} visits</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {c.protocol ? c.protocol.nameThai : 'ยังไม่ได้กำหนดโปรโตคอล'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  disabled={closingCaseId === c.id}
                  onClick={() => handleCloseActiveCase(c.id)}
                >
                  {closingCaseId === c.id ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  )}
                  ปิดเคส
                </Button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => setStep('form')} className="w-full">
              <Plus className="h-4 w-4 mr-1.5" />
              สร้างเคสใหม่เพิ่ม
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : (
        /* ─── Case Creation Form ─── */
        <>
          <div className="p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold">สร้างเคสใหม่</h3>

            <div className="space-y-2">
              <Label className="text-sm">เลขที่เคส *</Label>
              <Input
                placeholder="เช่น C2567-001"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">โปรโตคอล</Label>
              <ProtocolCombobox
                value={protocolId}
                onChange={setProtocolId}
                placeholder="ค้นหาโปรโตคอล (ถ้ามี)..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">สามารถกำหนดภายหลังได้</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">หมายเหตุ</Label>
              <Input
                placeholder="หมายเหตุเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 pb-6">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'กำลังสร้าง...' : 'สร้างเคส'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Edit Patient Modal ──────────────────────────────────────────────────────

function EditPatientModal({
  open,
  onClose,
  patient,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  patient: PatientDetail;
  onUpdated: () => void;
}) {
  const [hn, setHn] = useState(patient.hn);
  const [citizenId, setCitizenId] = useState(patient.citizenId);
  const [fullName, setFullName] = useState(patient.fullName);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!hn.trim() || !citizenId.trim() || !fullName.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(`/cancer-patients/${patient.id}`, {
        hn: hn.trim(),
        citizenId: citizenId.trim(),
        fullName: fullName.trim(),
      });
      toast.success('อัปเดตข้อมูลผู้ป่วยสำเร็จ');
      onClose();
      onUpdated();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถอัปเดตได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="sm">
      <div className="p-6 space-y-4">
        <h3 className="font-heading text-lg font-semibold">แก้ไขข้อมูลผู้ป่วย</h3>

        <div className="space-y-2">
          <Label className="text-sm">HN</Label>
          <Input value={hn} onChange={(e) => setHn(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">เลขบัตรประชาชน</Label>
          <Input
            value={citizenId}
            onChange={(e) => setCitizenId(e.target.value)}
            maxLength={13}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">ชื่อ-สกุล</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 pb-6">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          ยกเลิก
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </Button>
      </div>
    </Modal>
  );
}
