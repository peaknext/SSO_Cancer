'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Zod schema ─────────────────────────────────────────────────────────────────
const regimenSchema = z.object({
  regimenCode: z.string().min(1, 'กรุณากรอกรหัสสูตรยา'),
  regimenName: z.string().min(1, 'กรุณากรอกชื่อสูตรยา'),
  description: z.string().optional(),
  cycleDays: z.string().optional(),
  maxCycles: z.string().optional(),
  regimenType: z.string().optional(),
});

type RegimenFormValues = z.infer<typeof regimenSchema>;

// ─── Type options ────────────────────────────────────────────────────────────
const typeOptions = [
  { value: 'chemotherapy', label: 'Chemotherapy' },
  { value: 'targeted', label: 'Targeted Therapy' },
  { value: 'immunotherapy', label: 'Immunotherapy' },
  { value: 'hormonal', label: 'Hormonal Therapy' },
  { value: 'chemoradiation', label: 'Chemoradiation' },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function RegimenCreatePage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
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
      router.push(`/regimens/${result.id}`);
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถสร้างสูตรยาได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/regimens">
            <ArrowLeft className="h-4 w-4 mr-1" />
            สูตรยา
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          สร้างสูตรยาใหม่
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Create New Regimen</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลสูตรยา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                rows={3}
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
                  placeholder="เลือกประเภท..."
                  className="w-full"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              สามารถเพิ่มยาในสูตรได้ภายหลังจากหน้าแก้ไข
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/regimens">ยกเลิก</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังสร้าง...' : 'สร้างสูตรยา'}
          </Button>
        </div>
      </form>
    </div>
  );
}
