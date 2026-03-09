'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { apiClient } from '@/lib/api-client';
import {
  BillingClaim,
  formatThaiDate,
  claimStatusVariant,
  claimStatusLabel,
  claimStatusOptions,
} from './types';

export function BillingClaimRow({
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
            <ThaiDatePicker
              value={claimSubmittedAt}
              onChange={setClaimSubmittedAt}
              placeholder="วันที่ส่ง"
              className="h-7 text-xs w-44"
            />
          </div>
          {status !== 'PENDING' && (
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] text-muted-foreground shrink-0">ผล:</Label>
              <ThaiDatePicker
                value={claimDecidedAt}
                onChange={setClaimDecidedAt}
                placeholder="วันที่ผล"
                className="h-7 text-xs w-44"
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
