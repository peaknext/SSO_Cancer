'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { apiClient } from '@/lib/api-client';
import { claimStatusOptions } from './types';

export function AddBillingClaimForm({
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
          <ThaiDatePicker
            value={submittedAt}
            onChange={setSubmittedAt}
            placeholder="เลือกวันที่"
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
