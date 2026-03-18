'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, FolderOpen, Info, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { ProtocolCombobox } from '@/components/shared/protocol-combobox';
import { HospitalCombobox } from '@/components/shared/hospital-combobox';
import { apiClient } from '@/lib/api-client';

// ─── Types ──────────────────────────────────────────────────────

interface MatchResult {
  protocolId: number;
  protocolCode: string;
  protocolName: string;
  matchedRegimen: { regimenId: number; regimenCode: string; regimenName: string } | null;
}

interface PatientCase {
  id: number;
  caseNumber: string;
  status: string;
  protocolId: number | null;
  protocol: {
    id: number;
    protocolCode: string;
    nameThai: string | null;
    nameEnglish: string;
  } | null;
}

interface PatientDetail {
  id: number;
  cases: PatientCase[];
}

interface ConfirmProtocolDialogProps {
  open: boolean;
  onConfirm: (caseId: number | null) => void;
  onCancel: () => void;
  loading: boolean;
  match: MatchResult | null;
  selectedVn: string | null;
  patientId: number | null;
  viewMode: 'opd' | 'ipd';
}

type CaseMode = 'select' | 'create';
const CREATE_NEW = '__CREATE_NEW__';

// ─── Component ──────────────────────────────────────────────────

export function ConfirmProtocolDialog({
  open,
  onConfirm,
  onCancel,
  loading,
  match,
  selectedVn,
  patientId,
  viewMode,
}: ConfirmProtocolDialogProps) {
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [autoMatchedCaseId, setAutoMatchedCaseId] = useState<number | null>(null);
  const [caseMode, setCaseMode] = useState<CaseMode>('select');

  // Create case form fields (same as CreateCaseModal)
  const [caseNumber, setCaseNumber] = useState('');
  const [vcrCode, setVcrCode] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [notes, setNotes] = useState('');
  const [referralDate, setReferralDate] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);

  // Fetch patient cases when dialog opens
  useEffect(() => {
    if (!open || !patientId || !match) {
      setCases([]);
      setSelectedCaseId(null);
      setAutoMatchedCaseId(null);
      setCaseMode('select');
      resetCreateForm();
      return;
    }

    let cancelled = false;
    setLoadingCases(true);

    apiClient
      .get<PatientDetail>(`/cancer-patients/${patientId}`)
      .then((patient) => {
        if (cancelled) return;
        const activeCases = (patient.cases || []).filter((c) => c.status === 'ACTIVE');
        setCases(activeCases);

        // Auto-select case with matching protocolId
        const matchingCase = activeCases.find((c) => c.protocolId === match.protocolId);
        if (matchingCase) {
          setSelectedCaseId(matchingCase.id);
          setAutoMatchedCaseId(matchingCase.id);
        } else {
          setSelectedCaseId(null);
          setAutoMatchedCaseId(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCases([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, patientId, match]);

  // Pre-fill protocolId when switching to create mode
  useEffect(() => {
    if (caseMode === 'create' && match) {
      setProtocolId(String(match.protocolId));
    }
  }, [caseMode, match]);

  function resetCreateForm() {
    setCaseNumber('');
    setVcrCode('');
    setProtocolId('');
    setNotes('');
    setReferralDate('');
    setAdmissionDate('');
    setHospitalId('');
    setCreatingCase(false);
  }

  function handleSelectChange(value: string) {
    if (value === CREATE_NEW) {
      setCaseMode('create');
      setSelectedCaseId(null);
    } else {
      setCaseMode('select');
      setSelectedCaseId(value ? Number(value) : null);
    }
  }

  async function handleCreateAndConfirm() {
    if (!caseNumber.trim()) {
      toast.error('กรุณากรอกเลขที่เคส');
      return;
    }
    if (!patientId) return;

    setCreatingCase(true);
    try {
      const newCase = await apiClient.post<{ id: number }>(`/cancer-patients/${patientId}/cases`, {
        caseNumber: caseNumber.trim(),
        vcrCode: vcrCode.trim() || undefined,
        protocolId: protocolId ? Number(protocolId) : undefined,
        notes: notes || undefined,
        referralDate: referralDate || undefined,
        admissionDate: admissionDate || undefined,
        sourceHospitalId: hospitalId ? Number(hospitalId) : undefined,
      });
      toast.success('สร้างเคสสำเร็จ');
      onConfirm(newCase.id);
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error(apiErr?.error?.message || 'ไม่สามารถสร้างเคสได้');
    } finally {
      setCreatingCase(false);
    }
  }

  if (!match) return null;

  const vnLabel = viewMode === 'ipd' ? 'AN' : 'VN';
  const displayVn =
    viewMode === 'ipd' && selectedVn?.startsWith('IPD-') ? selectedVn.slice(4) : selectedVn;
  const isSubmitting = loading || creatingCase;

  return (
    <Modal open={open} onClose={onCancel} maxWidth="sm">
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">ยืนยันโปรโตคอล</h3>
        </div>

        {/* Protocol info */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 w-16">โปรโตคอล:</span>
            <span className="font-medium text-foreground">
              {match.protocolCode} — {match.protocolName}
            </span>
          </div>
          {match.matchedRegimen && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0 w-16">สูตรยา:</span>
              <span className="text-foreground">
                {match.matchedRegimen.regimenCode} ({match.matchedRegimen.regimenName})
              </span>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 w-16">{vnLabel}:</span>
            <span className="font-mono text-foreground">{displayVn}</span>
          </div>
        </div>

        {/* Case selection section */}
        {patientId && (
          <>
            <div className="border-t border-border" />

            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  ผูกกับเคส{' '}
                  <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span>
                </span>
              </div>

              {loadingCases ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  กำลังโหลดเคส...
                </div>
              ) : (
                <>
                  {/* Case select dropdown */}
                  {caseMode === 'select' && (
                    <>
                      <select
                        value={selectedCaseId ?? ''}
                        onChange={(e) => handleSelectChange(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">ไม่ผูกเคส</option>
                        {cases.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.caseNumber}
                            {c.protocol ? ` — ${c.protocol.nameThai || c.protocol.nameEnglish}` : ' — ยังไม่กำหนดโปรโตคอล'}
                          </option>
                        ))}
                        <option value={CREATE_NEW}>＋ สร้างเคสใหม่...</option>
                      </select>

                      {autoMatchedCaseId && selectedCaseId === autoMatchedCaseId && (
                        <div className="flex items-center gap-1.5 text-xs text-primary">
                          <Info className="h-3 w-3 shrink-0" />
                          เคสนี้ใช้โปรโตคอลเดียวกัน (เลือกอัตโนมัติ)
                        </div>
                      )}
                    </>
                  )}

                  {/* Create case form */}
                  {caseMode === 'create' && (
                    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          สร้างเคสใหม่
                        </span>
                        <button
                          onClick={() => { setCaseMode('select'); resetCreateForm(); }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ← กลับเลือกเคส
                        </button>
                      </div>

                      {/* Case Number (required) */}
                      <div className="space-y-1">
                        <Label className="text-xs">เลขที่เคส *</Label>
                        <Input
                          value={caseNumber}
                          onChange={(e) => setCaseNumber(e.target.value)}
                          placeholder="เช่น C2567-001"
                          className="h-8 text-sm"
                        />
                      </div>

                      {/* VCR Code */}
                      <div className="space-y-1">
                        <Label className="text-xs">เลข VCR</Label>
                        <Input
                          value={vcrCode}
                          onChange={(e) => setVcrCode(e.target.value)}
                          placeholder="เช่น VCR-001"
                          maxLength={20}
                          className="h-8 text-sm"
                        />
                      </div>

                      {/* Protocol (auto-filled) */}
                      <div className="space-y-1">
                        <Label className="text-xs">โปรโตคอล</Label>
                        <ProtocolCombobox
                          value={protocolId}
                          onChange={setProtocolId}
                          placeholder="เลือกโปรโตคอล..."
                          className="text-sm"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <Label className="text-xs">หมายเหตุ</Label>
                        <Input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="หมายเหตุเพิ่มเติม..."
                          className="h-8 text-sm"
                        />
                      </div>

                      {/* Referral section */}
                      <div className="border-t border-border/50 pt-2">
                        <p className="text-xs text-muted-foreground mb-2">ข้อมูลส่งต่อ (ถ้ามี)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">วันที่ส่งต่อ</Label>
                            <ThaiDatePicker
                              value={referralDate}
                              onChange={setReferralDate}
                              placeholder="วันที่ส่งต่อ"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">วันที่รับเข้า</Label>
                            <ThaiDatePicker
                              value={admissionDate}
                              onChange={setAdmissionDate}
                              placeholder="วันที่รับเข้า"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Source Hospital */}
                      <div className="space-y-1">
                        <Label className="text-xs">สถานพยาบาลต้นทาง</Label>
                        <HospitalCombobox
                          value={hospitalId}
                          onChange={setHospitalId}
                          placeholder="ค้นหาสถานพยาบาล..."
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {!patientId && (
          <>
            <div className="border-t border-border" />
            <p className="text-xs text-muted-foreground">
              ยังไม่ได้ลงทะเบียนผู้ป่วย — สามารถผูกเคสได้ภายหลังที่หน้าข้อมูลผู้ป่วย
            </p>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          {caseMode === 'create' ? (
            <Button onClick={handleCreateAndConfirm} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              สร้างเคส & ยืนยัน
            </Button>
          ) : (
            <Button onClick={() => onConfirm(selectedCaseId)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ยืนยัน
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
