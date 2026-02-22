'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const createUserSchema = z.object({
  email: z.string().min(1, 'กรุณากรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง'),
  fullName: z.string().min(1, 'กรุณากรอกชื่อ-สกุล'),
  fullNameThai: z.string().optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
  department: z.string().optional(),
  position: z.string().optional(),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserDialog({ open, onClose, onSuccess }: CreateUserDialogProps) {
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState('EDITOR');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'EDITOR' },
  });

  const onSubmit = async (values: CreateUserValues) => {
    try {
      const result = await apiClient.post<{ tempPassword: string }>('/users', {
        ...values,
        role: selectedRole,
      });
      const password = result?.tempPassword || 'Check server logs';
      setTempPassword(password);
      toast.success('สร้างผู้ใช้สำเร็จ');
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถสร้างผู้ใช้ได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  const handleClose = () => {
    reset();
    setTempPassword(null);
    setCopied(false);
    setSelectedRole('EDITOR');
    onClose();
  };

  const handleDone = () => {
    handleClose();
    onSuccess();
  };

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="md">
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="font-heading text-lg font-semibold">
          {tempPassword ? 'สร้างผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้ใหม่'}
        </h2>
        <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-colors">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {tempPassword ? (
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            รหัสผ่านชั่วคราวถูกสร้างแล้ว กรุณาส่งให้ผู้ใช้เพื่อเข้าสู่ระบบครั้งแรก
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/10 p-3">
            <code className="flex-1 font-mono text-sm select-all">{tempPassword}</code>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyPassword}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-warning">
            รหัสผ่านนี้จะแสดงเพียงครั้งเดียว กรุณาบันทึกไว้
          </p>
          <Button onClick={handleDone} className="w-full">เสร็จสิ้น</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>อีเมล *</Label>
            <Input
              type="email"
              placeholder="user@example.com"
              {...register('email')}
              className={cn(errors.email && 'border-destructive')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>ชื่อ-สกุล (EN) *</Label>
            <Input
              placeholder="Full Name"
              {...register('fullName')}
              className={cn(errors.fullName && 'border-destructive')}
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>ชื่อ-สกุล (TH)</Label>
            <Input placeholder="ชื่อ-สกุลไทย" {...register('fullNameThai')} />
          </div>

          <div className="space-y-2">
            <Label>สิทธิ์ *</Label>
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              options={[
                { value: 'ADMIN', label: 'ผู้ดูแลระบบ (Admin)' },
                { value: 'EDITOR', label: 'บรรณาธิการ (Editor)' },
                { value: 'VIEWER', label: 'ผู้ดู (Viewer)' },
              ]}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>แผนก</Label>
              <Input placeholder="Department" {...register('department')} />
            </div>
            <div className="space-y-2">
              <Label>ตำแหน่ง</Label>
              <Input placeholder="Position" {...register('position')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>ยกเลิก</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
