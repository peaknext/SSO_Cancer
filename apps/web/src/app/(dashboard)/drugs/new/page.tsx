'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Pill } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Zod schema ─────────────────────────────────────────────────────────────────
const drugSchema = z.object({
  genericName: z.string().min(1, 'กรุณากรอกชื่อสามัญยา'),
  drugCategory: z.string().optional(),
});

type DrugFormValues = z.infer<typeof drugSchema>;

// ─── Drug categories ────────────────────────────────────────────────────────
const categoryOptions = [
  { value: 'ALKYLATING_AGENT', label: 'Alkylating Agent' },
  { value: 'ANTIMETABOLITE', label: 'Antimetabolite' },
  { value: 'ANTIMICROTUBULE', label: 'Antimicrotubule' },
  { value: 'TOPOISOMERASE_INHIBITOR', label: 'Topoisomerase Inhibitor' },
  { value: 'CYTOTOXIC_ANTIBIOTIC', label: 'Cytotoxic Antibiotic' },
  { value: 'TARGETED_THERAPY', label: 'Targeted Therapy' },
  { value: 'IMMUNOTHERAPY', label: 'Immunotherapy' },
  { value: 'HORMONAL_THERAPY', label: 'Hormonal Therapy' },
  { value: 'SUPPORTIVE_CARE', label: 'Supportive Care' },
  { value: 'PLATINUM_COMPOUND', label: 'Platinum Compound' },
  { value: 'MONOCLONAL_ANTIBODY', label: 'Monoclonal Antibody' },
  { value: 'TYROSINE_KINASE_INHIBITOR', label: 'Tyrosine Kinase Inhibitor' },
  { value: 'OTHER', label: 'Other' },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function DrugCreatePage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DrugFormValues>({
    resolver: zodResolver(drugSchema),
    defaultValues: {
      genericName: '',
      drugCategory: '',
    },
  });

  const onSubmit = async (values: DrugFormValues) => {
    try {
      const result = await apiClient.post<{ id: number }>('/drugs', {
        genericName: values.genericName,
        drugCategory: values.drugCategory || undefined,
      });

      toast.success('สร้างรายการยาสำเร็จ');
      router.push(`/drugs/${result.id}`);
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถสร้างรายการยาได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/drugs">
            <ArrowLeft className="h-4 w-4 mr-1" />
            ยา
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Pill className="h-6 w-6 text-primary" />
          เพิ่มรายการยาใหม่
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Add New Drug</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลยา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อสามัญยา (Generic Name) *</Label>
              <Input
                placeholder="เช่น Carboplatin, Paclitaxel"
                {...register('genericName')}
                className={cn(errors.genericName && 'border-destructive')}
                autoFocus
              />
              {errors.genericName && (
                <p className="text-xs text-destructive">{errors.genericName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>หมวดหมู่ยา</Label>
              <Select
                value={watch('drugCategory') || ''}
                onChange={(v) => setValue('drugCategory', v)}
                options={categoryOptions}
                placeholder="เลือกหมวดหมู่..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                สามารถเพิ่มภายหลังได้
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/drugs">ยกเลิก</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังสร้าง...' : 'สร้างรายการยา'}
          </Button>
        </div>
      </form>
    </div>
  );
}
