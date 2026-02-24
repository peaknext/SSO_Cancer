'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const patientSchema = z.object({
  hn: z.string().min(1, 'กรุณากรอก HN').max(20, 'HN ต้องไม่เกิน 20 ตัวอักษร'),
  citizenId: z
    .string()
    .length(13, 'เลขบัตรประชาชนต้องมี 13 หลัก')
    .regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลักเท่านั้น'),
  fullName: z.string().min(1, 'กรุณากรอกชื่อ-สกุล').max(200, 'ชื่อ-สกุลต้องไม่เกิน 200 ตัวอักษร'),
});

type PatientFormValues = z.infer<typeof patientSchema>;

export default function PatientCreatePage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      hn: '',
      citizenId: '',
      fullName: '',
    },
  });

  const onSubmit = async (values: PatientFormValues) => {
    try {
      const result = await apiClient.post<{
        id: number;
        hn: string;
        linkedVisitCount: number;
      }>('/cancer-patients', values);

      const visitMsg =
        result.linkedVisitCount > 0
          ? ` — เชื่อมโยง ${result.linkedVisitCount} visit อัตโนมัติ`
          : '';

      toast.success(`ลงทะเบียนผู้ป่วยสำเร็จ${visitMsg}`);
      router.push(`/cancer-patients/${result.id}`);
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถลงทะเบียนผู้ป่วยได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/cancer-patients">
            <ArrowLeft className="h-4 w-4 mr-1" />
            ผู้ป่วยมะเร็ง
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          ลงทะเบียนผู้ป่วยใหม่
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Register New Patient</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลผู้ป่วย</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>HN (Hospital Number) *</Label>
              <Input
                placeholder="เช่น 6700001"
                {...register('hn')}
                className={cn(errors.hn && 'border-destructive')}
                autoFocus
              />
              {errors.hn && (
                <p className="text-xs text-destructive">{errors.hn.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>เลขบัตรประชาชน (Citizen ID) *</Label>
              <Input
                placeholder="1234567890123"
                maxLength={13}
                {...register('citizenId')}
                className={cn(errors.citizenId && 'border-destructive')}
              />
              {errors.citizenId && (
                <p className="text-xs text-destructive">{errors.citizenId.message}</p>
              )}
              <p className="text-xs text-muted-foreground">ตัวเลข 13 หลัก ไม่ต้องใส่ขีด</p>
            </div>

            <div className="space-y-2">
              <Label>ชื่อ-สกุล (ภาษาไทย) *</Label>
              <Input
                placeholder="เช่น นายสมชาย ใจดี"
                {...register('fullName')}
                className={cn(errors.fullName && 'border-destructive')}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName.message}</p>
              )}
              <p className="text-xs text-muted-foreground">คำนำหน้า ชื่อ สกุล รวมเป็นฟิลด์เดียว</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/cancer-patients">ยกเลิก</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
          </Button>
        </div>
      </form>
    </div>
  );
}
