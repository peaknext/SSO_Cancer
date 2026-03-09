'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronsUpDown,
  Calendar,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { PatientDetail, TopMatch, VisitExportBatch, formatThaiDate, maskCitizenId } from './components/types';
import { CaseCard } from './components/case-card';
import { VisitTimelineEntry } from './components/visit-timeline-entry';
import { CreateCaseModal } from './components/create-case-modal';
import { EditPatientModal } from './components/edit-patient-modal';
import { HisImportPanel } from './components/his-import-panel';

// ─── Assign Case Confirm Dialog ──────────────────────────────────────────────

interface AssignCaseConfirmDialogProps {
  open: boolean;
  data: {
    vn: string;
    caseId: number;
    caseNumber: string;
    caseProtocol: { id: number; protocolCode: string; nameThai: string } | null;
    visitConfirmedProtocol: { id: number; protocolCode: string; nameThai: string } | null;
  } | null;
  loading: boolean;
  onConfirm: (assignProtocol: boolean) => void;
  onCancel: () => void;
}

function AssignCaseConfirmDialog({
  open,
  data,
  loading,
  onConfirm,
  onCancel,
}: AssignCaseConfirmDialogProps) {
  const [assignProtocol, setAssignProtocol] = useState(true);

  useEffect(() => {
    if (data) setAssignProtocol(true);
  }, [data]);

  if (!data) return null;

  const hasConfirmedProtocol = data.visitConfirmedProtocol !== null;
  const protocolConflict =
    data.caseProtocol !== null &&
    data.visitConfirmedProtocol !== null &&
    data.caseProtocol.id !== data.visitConfirmedProtocol.id;

  return (
    <Modal open={open} onClose={onCancel} maxWidth="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground leading-tight">
              กำหนดเคสให้ Visit
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-mono text-foreground/80">{data.vn}</span>
              <span className="mx-1.5 text-muted-foreground/50">→</span>
              <span className="font-medium text-foreground/80">{data.caseNumber}</span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3">
          {hasConfirmedProtocol ? (
            <>
              {/* Confirmed protocol info */}
              <div className="rounded-lg border-l-2 border-l-primary bg-muted/40 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  โปรโตคอลที่ยืนยันแล้ว
                </p>
                <p className="text-sm">
                  <span className="font-mono font-semibold text-primary">
                    {data.visitConfirmedProtocol!.protocolCode}
                  </span>
                  <span className="mx-1.5 text-muted-foreground">—</span>
                  <span className="text-foreground">{data.visitConfirmedProtocol!.nameThai}</span>
                </p>
              </div>

              {/* Protocol assignment toggle */}
              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border/60 bg-background px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={assignProtocol}
                  onChange={(e) => setAssignProtocol(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                />
                <span className="text-sm leading-relaxed">
                  กำหนดโปรโตคอล{' '}
                  <span className="font-mono font-medium text-primary">
                    {data.visitConfirmedProtocol!.protocolCode}
                  </span>{' '}
                  ให้เคส{' '}
                  <span className="font-medium">{data.caseNumber}</span>{' '}
                  ด้วย
                </span>
              </label>

              {/* Protocol conflict warning */}
              {protocolConflict && assignProtocol && (
                <div className="rounded-lg border-l-2 border-l-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-medium">
                      เคสนี้มีโปรโตคอล{' '}
                      <span className="font-mono">{data.caseProtocol!.protocolCode}</span>{' '}
                      อยู่แล้ว
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 ml-5.5">
                    จะถูกแทนที่ด้วย{' '}
                    <span className="font-mono font-medium">
                      {data.visitConfirmedProtocol!.protocolCode}
                    </span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              Visit นี้ยังไม่มีโปรโตคอลที่ยืนยัน — จะกำหนดเฉพาะเคส
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            ยกเลิก
          </Button>
          <Button
            onClick={() => onConfirm(assignProtocol && hasConfirmedProtocol)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              'ยืนยัน'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

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

  // Protocol confirmation from timeline
  const [pendingConfirm, setPendingConfirm] = useState<{
    vn: string;
    protocolId: number;
    regimenId: number | null;
    protocolCode: string;
    protocolName: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Batch-fetch top matching protocol for unconfirmed visits
  const [topMatches, setTopMatches] = useState<Record<string, TopMatch>>({});
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Fetch SSOP export batch status for all visits
  const [visitExportMap, setVisitExportMap] = useState<Record<number, VisitExportBatch[]>>({});

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

  useEffect(() => {
    if (!patient?.visits?.length) return;
    const visitIds = patient.visits.map((v) => v.id);
    apiClient
      .get<Record<number, VisitExportBatch[]>>(
        `/ssop-export/visit-export-status?visitIds=${visitIds.join(',')}`,
      )
      .then((map) => setVisitExportMap(map))
      .catch(() => {});
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

  // Pending case assignment state (shown in AssignCaseConfirmDialog)
  const [pendingCaseAssign, setPendingCaseAssign] = useState<{
    vn: string;
    caseId: number;
    caseNumber: string;
    caseProtocol: { id: number; protocolCode: string; nameThai: string } | null;
    visitConfirmedProtocol: { id: number; protocolCode: string; nameThai: string } | null;
  } | null>(null);
  const [assignCaseLoading, setAssignCaseLoading] = useState(false);

  const handleRequestAssignCase = useCallback(
    (vn: string, caseId: string) => {
      if (!patient) return;
      if (caseId === '') {
        // Remove case — no protocol dialog needed
        apiClient
          .delete(`/cancer-patients/visits/${vn}/assign-case`)
          .then(() => { toast.success('ยกเลิกเคสจาก visit สำเร็จ'); refetch(); })
          .catch(() => toast.error('ไม่สามารถยกเลิกเคสได้'));
        return;
      }
      const selectedCase = patient.cases.find((c) => String(c.id) === caseId);
      const visit = patient.visits.find((v) => v.vn === vn);
      setPendingCaseAssign({
        vn,
        caseId: Number(caseId),
        caseNumber: selectedCase?.caseNumber ?? '',
        caseProtocol: selectedCase?.protocol
          ? {
              id: selectedCase.protocol.id,
              protocolCode: selectedCase.protocol.protocolCode,
              nameThai: selectedCase.protocol.nameThai,
            }
          : null,
        visitConfirmedProtocol: visit?.confirmedProtocol
          ? {
              id: visit.confirmedProtocol.id,
              protocolCode: visit.confirmedProtocol.protocolCode,
              nameThai: visit.confirmedProtocol.nameThai,
            }
          : null,
      });
    },
    [patient, refetch],
  );

  const handleConfirmAssignCase = async (assignProtocol: boolean) => {
    if (!pendingCaseAssign) return;
    setAssignCaseLoading(true);
    try {
      await apiClient.patch(`/cancer-patients/visits/${pendingCaseAssign.vn}/assign-case`, {
        caseId: pendingCaseAssign.caseId,
      });
      if (assignProtocol && pendingCaseAssign.visitConfirmedProtocol) {
        await apiClient.patch(`/cancer-patients/${id}/cases/${pendingCaseAssign.caseId}`, {
          protocolId: pendingCaseAssign.visitConfirmedProtocol.id,
        });
      }
      toast.success('กำหนดเคสสำเร็จ');
      setPendingCaseAssign(null);
      refetch();
    } catch {
      toast.error('ไม่สามารถกำหนดเคสได้');
    } finally {
      setAssignCaseLoading(false);
    }
  };

  const handleConfirmProtocol = async () => {
    if (!pendingConfirm) return;
    setConfirmLoading(true);
    try {
      await apiClient.patch(
        `/protocol-analysis/visits/${pendingConfirm.vn}/confirm`,
        {
          protocolId: pendingConfirm.protocolId,
          regimenId: pendingConfirm.regimenId ?? undefined,
        },
      );
      toast.success('ยืนยันโปรโตคอลสำเร็จ');
      setPendingConfirm(null);
      refetch();
    } catch {
      toast.error('ไม่สามารถยืนยันโปรโตคอลได้');
    } finally {
      setConfirmLoading(false);
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

      {/* ─── HIS Import/Sync Panel ──────────────────────────────────────────── */}
      <HisImportPanel
        patientHn={patient.hn}
        patientId={patient.id}
        existingVns={patient.visits.map((v) => v.vn)}
        onDataChanged={refetch}
      />

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
                    onRequestAssignCase={handleRequestAssignCase}
                    addClaimVn={addClaimVn}
                    onShowAddClaim={() => setAddClaimVn(visit.vn)}
                    onHideAddClaim={() => setAddClaimVn(null)}
                    onClaimAdded={refetch}
                    topMatch={topMatches[visit.vn] || null}
                    loadingMatch={loadingMatches}
                    onConfirmProtocol={(match) => setPendingConfirm({ vn: visit.vn, ...match })}
                    exportBatches={visitExportMap[visit.id] || []}
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

      <ConfirmDialog
        open={pendingConfirm !== null}
        onConfirm={handleConfirmProtocol}
        onCancel={() => setPendingConfirm(null)}
        title="ยืนยันโปรโตคอล"
        description={
          pendingConfirm
            ? `ยืนยัน ${pendingConfirm.protocolCode} — ${pendingConfirm.protocolName} สำหรับ VN ${pendingConfirm.vn}?`
            : ''
        }
        confirmText="ยืนยัน"
        loading={confirmLoading}
      />

      <AssignCaseConfirmDialog
        open={pendingCaseAssign !== null}
        data={pendingCaseAssign}
        loading={assignCaseLoading}
        onConfirm={handleConfirmAssignCase}
        onCancel={() => setPendingCaseAssign(null)}
      />
    </div>
  );
}
