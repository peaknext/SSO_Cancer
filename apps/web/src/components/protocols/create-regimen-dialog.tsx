'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const regimenSchema = z.object({
  regimenCode: z.string().min(1, 'กรุณากรอกรหัสสูตรยา'),
  regimenName: z.string().min(1, 'กรุณากรอกชื่อสูตรยา'),
  description: z.string().optional(),
  cycleDays: z.string().optional(),
  maxCycles: z.string().optional(),
  regimenType: z.string().optional(),
});

type RegimenFormValues = z.infer<typeof regimenSchema>;

const typeOptions = [
  { value: 'chemotherapy', label: 'Chemotherapy' },
  { value: 'targeted', label: 'Targeted Therapy' },
  { value: 'immunotherapy', label: 'Immunotherapy' },
  { value: 'hormonal', label: 'Hormonal Therapy' },
  { value: 'chemoradiation', label: 'Chemoradiation' },
];

interface CreateRegimenDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (regimen: { id: number; regimenCode: string; regimenName: string }) => void;
}

export function CreateRegimenDialog({ open, onClose, onSuccess }: CreateRegimenDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegimenFormValues>({
    resolver: zodResolver(regimenSchema),
    defaultValues: {
      regimenCode: '',
      regimenName: '',
      description: '',
      cycleDays: '',
      maxCycles: '',
      regimenType: '',
    },
  });

  const onSubmit = async (values: RegimenFormValues) => {
    try {
      const result = await apiClient.post<{ id: number }>('/regimens', {
        regimenCode: values.regimenCode,
        regimenName: values.regimenName,
        description: values.description || undefined,
        cycleDays: values.cycleDays ? Number(values.cycleDays) : undefined,
        maxCycles: values.maxCycles ? Number(values.maxCycles) : undefined,
        regimenType: values.regimenType || undefined,
      });

      toast.success('สร้างสูตรยาสำเร็จ');
      onSuccess({
        id: result.id,
        regimenCode: values.regimenCode,
        regimenName: values.regimenName,
      });
      handleClose();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถสร้างสูตรยาได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="lg">
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="font-heading text-lg font-semibold">สร้างสูตรยาใหม่</h2>
        <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-colors">
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>รหัสสูตรยา (Regimen Code) *</Label>
            <Input
              placeholder="เช่น FOLFOX4, AC-T"
              {...register('regimenCode')}
              className={cn(errors.regimenCode && 'border-destructive')}
              autoFocus
            />
            {errors.regimenCode && (
              <p className="text-xs text-destructive">{errors.regimenCode.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>ชื่อสูตรยา (Regimen Name) *</Label>
            <Input
              placeholder="เช่น FOLFOX4 (5-FU + Leucovorin + Oxaliplatin)"
              {...register('regimenName')}
              className={cn(errors.regimenName && 'border-destructive')}
            />
            {errors.regimenName && (
              <p className="text-xs text-destructive">{errors.regimenName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>คำอธิบาย (Description)</Label>
          <Textarea
            placeholder="รายละเอียดการให้ยา ขนาดยา ตารางเวลา..."
            {...register('description')}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>ระยะเวลารอบ (วัน)</Label>
            <Input
              type="number"
              min={1}
              placeholder="เช่น 21"
              {...register('cycleDays')}
            />
          </div>
          <div className="space-y-2">
            <Label>จำนวนรอบสูงสุด</Label>
            <Input
              type="number"
              min={1}
              placeholder="เช่น 6"
              {...register('maxCycles')}
            />
          </div>
          <div className="space-y-2">
            <Label>ประเภท</Label>
            <Select
              value={watch('regimenType') || ''}
              onChange={(v) => setValue('regimenType', v)}
              options={typeOptions}
              placeholder="เลือก..."
              className="w-full"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          สามารถเพิ่มยาในสูตรได้ภายหลังจากหน้าแก้ไขสูตรยา
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>ยกเลิก</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังสร้าง...' : 'สร้างสูตรยา'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
