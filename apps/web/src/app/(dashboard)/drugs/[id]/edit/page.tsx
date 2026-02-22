'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Pencil, Pill } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriceBadge } from '@/components/shared/price-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Schemas ────────────────────────────────────────────────────────────────
const drugSchema = z.object({
  genericName: z.string().min(1, 'กรุณากรอกชื่อสามัญยา'),
  drugCategory: z.string().optional(),
});

const tradeNameSchema = z.object({
  drugCode: z.string().min(1, 'กรุณากรอกรหัสยา'),
  tradeName: z.string().optional(),
  dosageForm: z.string().min(1, 'กรุณากรอกรูปแบบยา'),
  strength: z.string().min(1, 'กรุณากรอกความแรง'),
  unit: z.string().optional(),
  unitPrice: z.string().optional(),
});

type DrugFormValues = z.infer<typeof drugSchema>;
type TradeNameFormValues = z.infer<typeof tradeNameSchema>;

// ─── Category options ───────────────────────────────────────────────────────
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

// ─── Types ──────────────────────────────────────────────────────────────────
interface DrugTradeName {
  id: number;
  tradeName: string | null;
  drugCode: string;
  dosageForm: string | null;
  strength: string | null;
  unit: string | null;
  unitPrice: number | null;
  isActive: boolean;
}

interface DrugDetail {
  id: number;
  drugCode: string;
  genericName: string;
  drugCategory: string;
  description: string | null;
  isActive: boolean;
  tradeNames: DrugTradeName[];
  regimenDrugs: unknown[];
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function DrugEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: drug, isLoading, refetch } = useApi<DrugDetail>(`/drugs/${id}`);

  // Trade name form state
  const [showTradeNameForm, setShowTradeNameForm] = useState(false);
  const [editingTradeNameId, setEditingTradeNameId] = useState<number | null>(null);
  const [tradeNameSubmitting, setTradeNameSubmitting] = useState(false);

  // Deactivation
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateTradeNameId, setDeactivateTradeNameId] = useState<number | null>(null);

  // Drug form
  const {
    register: registerDrug,
    handleSubmit: handleDrugSubmit,
    setValue: setDrugValue,
    watch: watchDrug,
    reset: resetDrug,
    formState: { errors: drugErrors, isSubmitting: drugSubmitting },
  } = useForm<DrugFormValues>({
    resolver: zodResolver(drugSchema),
  });

  // Trade name form
  const {
    register: registerTN,
    handleSubmit: handleTNSubmit,
    reset: resetTN,
    formState: { errors: tnErrors },
  } = useForm<TradeNameFormValues>({
    resolver: zodResolver(tradeNameSchema),
  });

  // Populate drug form
  useEffect(() => {
    if (!drug) return;
    resetDrug({
      genericName: drug.genericName,
      drugCategory: drug.drugCategory || '',
    });
  }, [drug, resetDrug]);

  // ─── Drug handlers ────────────────────────────────────────────────────
  const onDrugSubmit = async (values: DrugFormValues) => {
    try {
      await apiClient.patch(`/drugs/${id}`, {
        genericName: values.genericName,
        drugCategory: values.drugCategory || undefined,
      });
      toast.success('บันทึกข้อมูลยาสำเร็จ');
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถบันทึกได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  // ─── Trade name handlers ──────────────────────────────────────────────
  const openAddTradeNameForm = () => {
    setEditingTradeNameId(null);
    resetTN({
      drugCode: '',
      tradeName: '',
      dosageForm: '',
      strength: '',
      unit: '',
      unitPrice: '',
    });
    setShowTradeNameForm(true);
  };

  const openEditTradeNameForm = (tn: DrugTradeName) => {
    setEditingTradeNameId(tn.id);
    resetTN({
      drugCode: tn.drugCode || '',
      tradeName: tn.tradeName || '',
      dosageForm: tn.dosageForm || '',
      strength: tn.strength || '',
      unit: tn.unit || '',
      unitPrice: tn.unitPrice != null ? String(tn.unitPrice) : '',
    });
    setShowTradeNameForm(true);
  };

  const onTradeNameSubmit = async (values: TradeNameFormValues) => {
    setTradeNameSubmitting(true);
    try {
      if (editingTradeNameId) {
        // PATCH: only send updatable fields (no drugId/drugCode)
        await apiClient.patch(`/drug-trade-names/${editingTradeNameId}`, {
          tradeName: values.tradeName || undefined,
          dosageForm: values.dosageForm,
          strength: values.strength,
          unit: values.unit || undefined,
          unitPrice: values.unitPrice ? Number(values.unitPrice) : undefined,
        });
        toast.success('แก้ไขชื่อการค้าสำเร็จ');
      } else {
        // POST: include drugId and drugCode for creation
        await apiClient.post('/drug-trade-names', {
          drugId: Number(id),
          drugCode: values.drugCode,
          tradeName: values.tradeName || undefined,
          dosageForm: values.dosageForm,
          strength: values.strength,
          unit: values.unit || undefined,
          unitPrice: values.unitPrice ? Number(values.unitPrice) : undefined,
        });
        toast.success('เพิ่มชื่อการค้าสำเร็จ');
      }

      setShowTradeNameForm(false);
      setEditingTradeNameId(null);
      resetTN();
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถบันทึกชื่อการค้าได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setTradeNameSubmitting(false);
    }
  };

  const handleDeactivateTradeName = async () => {
    if (!deactivateTradeNameId) return;
    setDeactivating(true);
    try {
      await apiClient.patch(`/drug-trade-names/${deactivateTradeNameId}/deactivate`);
      toast.success('ปิดใช้งานชื่อการค้าสำเร็จ');
      setDeactivateTradeNameId(null);
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถปิดใช้งานได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setDeactivating(false);
    }
  };

  const handleDeactivateDrug = async () => {
    setDeactivating(true);
    try {
      await apiClient.patch(`/drugs/${id}`, { isActive: false });
      toast.success('ปิดใช้งานยาสำเร็จ');
      setDeactivateOpen(false);
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถปิดใช้งานได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setDeactivating(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!drug) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบยา — Drug not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/drugs">กลับไปรายการยา</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href={`/drugs/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {drug.genericName}
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <Pill className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold text-foreground">แก้ไขรายการยา</h1>
          <StatusBadge active={drug.isActive} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {drug.drugCode} — {drug.genericName}
        </p>
      </div>

      {/* Drug metadata form */}
      <form onSubmit={handleDrugSubmit(onDrugSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลยา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">รหัสยา</Label>
              <div className="flex items-center gap-2 h-10">
                <CodeBadge code={drug.drugCode} className="text-sm px-3 py-1" />
                <span className="text-xs text-muted-foreground">(ไม่สามารถแก้ไขได้)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อสามัญยา (Generic Name) *</Label>
                <Input
                  placeholder="เช่น Carboplatin"
                  {...registerDrug('genericName')}
                  className={cn(drugErrors.genericName && 'border-destructive')}
                />
                {drugErrors.genericName && (
                  <p className="text-xs text-destructive">{drugErrors.genericName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>หมวดหมู่ยา</Label>
                <Select
                  value={watchDrug('drugCategory') || ''}
                  onChange={(v) => setDrugValue('drugCategory', v)}
                  options={categoryOptions}
                  placeholder="เลือกหมวดหมู่..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {drug.isActive && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeactivateOpen(true)}
                >
                  ปิดใช้งานยา
                </Button>
              )}
              <Button type="submit" disabled={drugSubmitting} className="ml-auto">
                {drugSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลยา'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Trade Names */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            ชื่อการค้า ({drug.tradeNames.length})
          </CardTitle>
          <Button type="button" size="sm" onClick={openAddTradeNameForm}>
            <Plus className="h-4 w-4 mr-1" />
            เพิ่มชื่อการค้า
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add/Edit trade name form */}
          {showTradeNameForm && (
            <form
              onSubmit={handleTNSubmit(onTradeNameSubmit)}
              className="rounded-lg border bg-muted/5 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editingTradeNameId ? 'แก้ไขชื่อการค้า' : 'เพิ่มชื่อการค้าใหม่'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowTradeNameForm(false);
                    setEditingTradeNameId(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>รหัสยา SSO *</Label>
                  <Input
                    placeholder="เช่น C0199"
                    {...registerTN('drugCode')}
                    className={cn(tnErrors.drugCode && 'border-destructive')}
                  />
                  {tnErrors.drugCode && (
                    <p className="text-xs text-destructive">{tnErrors.drugCode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>ชื่อการค้า</Label>
                  <Input placeholder="Trade name" {...registerTN('tradeName')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>รูปแบบยา *</Label>
                  <Input
                    placeholder="เช่น Injection"
                    {...registerTN('dosageForm')}
                    className={cn(tnErrors.dosageForm && 'border-destructive')}
                  />
                  {tnErrors.dosageForm && (
                    <p className="text-xs text-destructive">{tnErrors.dosageForm.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>ความแรง *</Label>
                  <Input
                    placeholder="เช่น 150 mg"
                    {...registerTN('strength')}
                    className={cn(tnErrors.strength && 'border-destructive')}
                  />
                  {tnErrors.strength && (
                    <p className="text-xs text-destructive">{tnErrors.strength.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>หน่วย</Label>
                  <Input placeholder="เช่น vial" {...registerTN('unit')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ราคา/หน่วย (บาท)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...registerTN('unitPrice')}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTradeNameForm(false);
                    setEditingTradeNameId(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm" disabled={tradeNameSubmitting}>
                  {tradeNameSubmitting
                    ? 'กำลังบันทึก...'
                    : editingTradeNameId
                      ? 'บันทึกการแก้ไข'
                      : 'เพิ่มชื่อการค้า'}
                </Button>
              </div>
            </form>
          )}

          {/* Trade names table */}
          {drug.tradeNames.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/5">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ชื่อการค้า</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">รหัส SSO</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">รูปแบบ</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ความแรง</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">ราคา</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">สถานะ</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {drug.tradeNames.map((tn) => (
                    <tr key={tn.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{tn.tradeName || '—'}</td>
                      <td className="px-4 py-3">
                        {tn.drugCode ? (
                          <span className="font-mono text-xs">{tn.drugCode}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{tn.dosageForm || '—'}</td>
                      <td className="px-4 py-3">{tn.strength || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <PriceBadge price={tn.unitPrice} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge active={tn.isActive} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditTradeNameForm(tn)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {tn.isActive && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeactivateTradeNameId(tn.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              ยังไม่มีชื่อการค้า — กดปุ่ม &quot;เพิ่มชื่อการค้า&quot; เพื่อเพิ่ม
            </p>
          )}
        </CardContent>
      </Card>

      {/* Back link */}
      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href={`/drugs/${id}`}>กลับไปหน้ารายละเอียดยา</Link>
        </Button>
      </div>

      {/* Deactivate drug dialog */}
      <ConfirmDialog
        open={deactivateOpen}
        onConfirm={handleDeactivateDrug}
        onCancel={() => setDeactivateOpen(false)}
        title="ปิดใช้งานยา"
        description={`คุณแน่ใจหรือไม่ว่าต้องการปิดใช้งาน "${drug.genericName}"?`}
        confirmText="ปิดใช้งาน"
        variant="destructive"
        loading={deactivating}
      />

      {/* Deactivate trade name dialog */}
      <ConfirmDialog
        open={deactivateTradeNameId !== null}
        onConfirm={handleDeactivateTradeName}
        onCancel={() => setDeactivateTradeNameId(null)}
        title="ปิดใช้งานชื่อการค้า"
        description="คุณแน่ใจหรือไม่ว่าต้องการปิดใช้งานชื่อการค้านี้?"
        confirmText="ปิดใช้งาน"
        variant="destructive"
        loading={deactivating}
      />
    </div>
  );
}
