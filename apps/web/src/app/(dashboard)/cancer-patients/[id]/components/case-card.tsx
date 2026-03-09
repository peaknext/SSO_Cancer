'use client';

import { useState } from 'react';
import {
  Pencil,
  CheckCircle2,
  Save,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { ProtocolCombobox } from '@/components/shared/protocol-combobox';
import { HospitalCombobox } from '@/components/shared/hospital-combobox';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  PatientCase,
  formatThaiDate,
  caseStatusVariant,
  caseStatusLabel,
} from './types';

export function CaseCard({
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
  const [editing, setEditing] = useState(false);
  const [selectedProtocolId, setSelectedProtocolId] = useState(
    c.protocol ? String(c.protocol.id) : '',
  );
  const [refReferralDate, setRefReferralDate] = useState(c.referralDate?.slice(0, 10) ?? '');
  const [refAdmissionDate, setRefAdmissionDate] = useState(c.admissionDate?.slice(0, 10) ?? '');
  const [selectedHospitalId, setSelectedHospitalId] = useState(
    c.sourceHospital ? String(c.sourceHospital.id) : '',
  );
  const [editVcrCode, setEditVcrCode] = useState(c.vcrCode ?? '');
  const [saving, setSaving] = useState(false);

  const hasReferralData = c.referralDate || c.admissionDate || c.sourceHospital;

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/cancer-patients/${patientId}/cases/${c.id}`, {
        protocolId: selectedProtocolId ? Number(selectedProtocolId) : null,
        vcrCode: editVcrCode.trim() || null,
        referralDate: refReferralDate || null,
        admissionDate: refAdmissionDate || null,
        sourceHospitalId: selectedHospitalId ? Number(selectedHospitalId) : null,
      });
      toast.success('อัปเดตรายละเอียดเคสสำเร็จ');
      setEditing(false);
      onUpdated();
    } catch {
      toast.error('ไม่สามารถอัปเดตข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedProtocolId(c.protocol ? String(c.protocol.id) : '');
    setRefReferralDate(c.referralDate?.slice(0, 10) ?? '');
    setRefAdmissionDate(c.admissionDate?.slice(0, 10) ?? '');
    setSelectedHospitalId(c.sourceHospital ? String(c.sourceHospital.id) : '');
    setEditVcrCode(c.vcrCode ?? '');
    setEditing(false);
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
              {c.vcrCode && (
                <span className="text-xs text-muted-foreground font-mono">VCR: {c.vcrCode}</span>
              )}
            </div>

            {/* Protocol display (read-only) */}
            <div className="mt-1.5 text-sm text-muted-foreground">
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
            </div>

            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-3">
              <span>เปิด: {formatThaiDate(c.openedAt)}</span>
              {c.closedAt && <span>ปิด: {formatThaiDate(c.closedAt)}</span>}
              {c._count && <span>{c._count.visits} visits</span>}
            </div>
            {c.notes && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{c.notes}</p>
            )}

            {/* Referral info (read-only) */}
            {hasReferralData && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <Building2 className="h-3 w-3 shrink-0" />
                {c.referralDate && (
                  <span>ส่งต่อ: {formatThaiDate(c.referralDate)}</span>
                )}
                {c.admissionDate && (
                  <span>รับเข้า: {formatThaiDate(c.admissionDate)}</span>
                )}
                {c.sourceHospital && (
                  <span>
                    รพ.ต้นทาง:{' '}
                    {c.sourceHospital.hcode5 && (
                      <span className="font-mono">{c.sourceHospital.hcode5}</span>
                    )}{' '}
                    <span className="text-foreground">{c.sourceHospital.nameThai}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          {c.status === 'ACTIVE' && !editing && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                แก้ไขรายละเอียด
              </Button>
              <Button size="sm" variant="outline" onClick={onComplete}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                ปิดเคส
              </Button>
            </div>
          )}
        </div>

        {/* Unified edit form */}
        {editing && (
          <div className="mt-3 rounded-md border border-primary/20 bg-primary/2 p-3 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">โปรโตคอล</Label>
              <ProtocolCombobox
                value={selectedProtocolId}
                onChange={setSelectedProtocolId}
                placeholder="ค้นหาโปรโตคอล..."
                className="w-full"
                suggestedCancerSiteId={c.protocol?.cancerSite?.id}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">รหัส QR Code (VCR Code)</Label>
              <Input
                value={editVcrCode}
                onChange={(e) => setEditVcrCode(e.target.value)}
                placeholder="เช่น VCR-001"
                maxLength={20}
                className="h-7 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">วันที่ลงทะเบียนส่งต่อ</Label>
                <ThaiDatePicker
                  value={refReferralDate}
                  onChange={setRefReferralDate}
                  placeholder="เลือกวันที่"
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">วันที่ลงทะเบียนรับเข้า</Label>
                <ThaiDatePicker
                  value={refAdmissionDate}
                  onChange={setRefAdmissionDate}
                  placeholder="เลือกวันที่"
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">สถานพยาบาลต้นทาง</Label>
              <HospitalCombobox
                value={selectedHospitalId}
                onChange={setSelectedHospitalId}
                placeholder="ค้นหาสถานพยาบาล..."
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-3 w-3 mr-1" />
                {saving ? 'บันทึก...' : 'บันทึก'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={handleCancel}
                disabled={saving}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
