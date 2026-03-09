'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { PatientDetail } from './types';

export function EditPatientModal({
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
