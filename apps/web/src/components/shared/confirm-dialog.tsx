'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'ยืนยันการดำเนินการ',
  description = 'คุณแน่ใจหรือไม่ว่าต้องการดำเนินการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth="sm">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {variant === 'destructive' && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 pb-6">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'กำลังดำเนินการ...' : confirmText}
        </Button>
      </div>
    </Modal>
  );
}
