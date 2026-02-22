'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
    newPassword: z
      .string()
      .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        'ต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลขอย่างน้อยอย่างละ 1 ตัว',
      ),
    confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่านใหม่'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

function PasswordField({
  label,
  placeholder,
  error,
  registration,
}: {
  label: string;
  placeholder: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          {...registration}
          className={cn(
            'pr-10 h-11 rounded-lg bg-background transition-shadow',
            'focus-visible:ring-primary/30 focus-visible:border-primary/50',
            error && 'border-destructive focus-visible:ring-destructive/30',
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-colors"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success('เปลี่ยนรหัสผ่านสำเร็จ', {
        description: 'Password changed successfully',
      });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      const msg = apiErr?.error?.message || '';

      if (msg.includes('CURRENT_PASSWORD_INCORRECT')) {
        toast.error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      } else if (msg.includes('PASSWORD_RECENTLY_USED')) {
        toast.error('ไม่สามารถใช้รหัสผ่านที่เคยใช้ก่อนหน้าได้', {
          description: 'ระบบเก็บประวัติ 5 รหัสผ่านล่าสุด',
        });
      } else {
        toast.error('เปลี่ยนรหัสผ่านไม่สำเร็จ', {
          description: msg || 'Unknown error',
        });
      }
    }
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="md">
      {/* Header with accent strip */}
      <div className="relative overflow-hidden rounded-t-2xl">
        <div className="absolute inset-x-0 top-0 h-0.75 bg-linear-to-r from-primary/80 via-primary to-primary/80" />
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-foreground">
                เปลี่ยนรหัสผ่าน
              </h2>
              <p className="text-xs text-muted-foreground">Change your password</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-4">
        <PasswordField
          label="รหัสผ่านปัจจุบัน"
          placeholder="Current password"
          error={errors.currentPassword?.message}
          registration={register('currentPassword')}
        />

        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
          <div className="pt-4 space-y-4">
            <PasswordField
              label="รหัสผ่านใหม่"
              placeholder="New password"
              error={errors.newPassword?.message}
              registration={register('newPassword')}
            />

            <PasswordField
              label="ยืนยันรหัสผ่านใหม่"
              placeholder="Confirm new password"
              error={errors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข
        </p>

        <div className="flex justify-end gap-2.5 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="h-10 px-4 text-sm"
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 text-sm font-medium"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                กำลังบันทึก...
              </span>
            ) : (
              'บันทึกรหัสผ่าน'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
