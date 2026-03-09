'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { ProtocolCombobox } from '@/components/shared/protocol-combobox';
import { HospitalCombobox } from '@/components/shared/hospital-combobox';
import { apiClient } from '@/lib/api-client';
import { PatientCase } from './types';

export function CreateCaseModal({
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
  const [vcrCode, setVcrCode] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [notes, setNotes] = useState('');
  const [referralDate, setReferralDate] = useState('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [saving, setSaving] = useState(false);
  const [closingCaseId, setClosingCaseId] = useState<number | null>(null);

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setStep(activeCases.length > 0 ? 'check' : 'form');
      setCaseNumber('');
      setVcrCode('');
      setProtocolId('');
      setNotes('');
      setReferralDate('');
      setAdmissionDate('');
      setHospitalId('');
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
        vcrCode: vcrCode.trim() || undefined,
        protocolId: protocolId ? Number(protocolId) : undefined,
        notes: notes || undefined,
        referralDate: referralDate || undefined,
        admissionDate: admissionDate || undefined,
        sourceHospitalId: hospitalId ? Number(hospitalId) : undefined,
      });
      toast.success('สร้างเคสสำเร็จ');
      setCaseNumber('');
      setVcrCode('');
      setProtocolId('');
      setNotes('');
      setReferralDate('');
      setAdmissionDate('');
      setHospitalId('');
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
              <Label className="text-sm">รหัส QR Code (VCR Code)</Label>
              <Input
                placeholder="เช่น VCR-001"
                value={vcrCode}
                onChange={(e) => setVcrCode(e.target.value)}
                maxLength={20}
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

            {/* Referral fields */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">ข้อมูลส่งต่อ (ถ้ามี)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">วันที่ลงทะเบียนส่งต่อ</Label>
                  <ThaiDatePicker
                    value={referralDate}
                    onChange={setReferralDate}
                    placeholder="เลือกวันที่"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">วันที่ลงทะเบียนรับเข้า</Label>
                  <ThaiDatePicker
                    value={admissionDate}
                    onChange={setAdmissionDate}
                    placeholder="เลือกวันที่"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">สถานพยาบาลต้นทาง</Label>
                <HospitalCombobox
                  value={hospitalId}
                  onChange={setHospitalId}
                  placeholder="ค้นหาสถานพยาบาล..."
                  className="w-full"
                />
              </div>
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
