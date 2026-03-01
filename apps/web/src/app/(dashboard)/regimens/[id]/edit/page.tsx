'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Pencil, FlaskConical, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Schemas ────────────────────────────────────────────────────────────────
const metadataSchema = z.object({
  regimenName: z.string().min(1, 'กรุณากรอกชื่อสูตรยา'),
  description: z.string().optional(),
  cycleDays: z.string().optional(),
  maxCycles: z.string().optional(),
  regimenType: z.string().optional(),
});

const drugFormSchema = z.object({
  dosePerCycle: z.string().optional(),
  route: z.string().optional(),
  daySchedule: z.string().optional(),
  isOptional: z.boolean().optional(),
  notes: z.string().optional(),
});

type MetadataFormValues = z.infer<typeof metadataSchema>;
type DrugFormValues = z.infer<typeof drugFormSchema>;

// ─── Type options ────────────────────────────────────────────────────────────
const typeOptions = [
  { value: 'chemotherapy', label: 'Chemotherapy' },
  { value: 'targeted', label: 'Targeted Therapy' },
  { value: 'immunotherapy', label: 'Immunotherapy' },
  { value: 'hormonal', label: 'Hormonal Therapy' },
  { value: 'chemoradiation', label: 'Chemoradiation' },
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface DrugOption {
  id: number;
  drugCode: string;
  genericName: string;
}

interface RegimenDrug {
  id: number;
  dosePerCycle: string | null;
  route: string | null;
  daySchedule: string | null;
  isOptional: boolean;
  notes: string | null;
  drug: DrugOption;
}

interface RegimenDetail {
  id: number;
  regimenCode: string;
  regimenName: string;
  description: string | null;
  cycleDays: number | null;
  maxCycles: number | null;
  regimenType: string | null;
  isActive: boolean;
  regimenDrugs: RegimenDrug[];
  protocolRegimens: unknown[];
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function RegimenEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: regimen, isLoading, refetch } = useApi<RegimenDetail>(`/regimens/${id}`);

  // Drug form state
  const [showDrugForm, setShowDrugForm] = useState(false);
  const [editingDrugId, setEditingDrugId] = useState<number | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<DrugOption | null>(null);
  const [drugSubmitting, setDrugSubmitting] = useState(false);

  // Drug search
  const [availableDrugs, setAvailableDrugs] = useState<DrugOption[]>([]);
  const [drugSearch, setDrugSearch] = useState('');

  // Deactivation
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [removeDrugId, setRemoveDrugId] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  // Metadata form
  const {
    register: registerMeta,
    handleSubmit: handleMetaSubmit,
    setValue: setMetaValue,
    watch: watchMeta,
    reset: resetMeta,
    formState: { errors: metaErrors, isSubmitting: metaSubmitting },
  } = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
  });

  // Drug form
  const {
    register: registerDrug,
    handleSubmit: handleDrugSubmit,
    reset: resetDrugForm,
    watch: watchDrug,
    setValue: setDrugValue,
    formState: { errors: drugErrors },
  } = useForm<DrugFormValues>({
    resolver: zodResolver(drugFormSchema),
  });

  // Populate metadata form
  useEffect(() => {
    if (!regimen) return;
    resetMeta({
      regimenName: regimen.regimenName,
      description: regimen.description || '',
      cycleDays: regimen.cycleDays != null ? String(regimen.cycleDays) : '',
      maxCycles: regimen.maxCycles != null ? String(regimen.maxCycles) : '',
      regimenType: regimen.regimenType || '',
    });
  }, [regimen, resetMeta]);

  // Load available drugs
  useEffect(() => {
    apiClient
      .get<{ data: DrugOption[]; meta: { total: number } }>('/drugs?limit=100&sortBy=genericName&sortOrder=asc')
      .then((res) => setAvailableDrugs(res.data || []))
      .catch(() => {});
  }, []);

  // Filter drugs for search
  const filteredDrugs = drugSearch.trim()
    ? availableDrugs.filter(
        (d) =>
          d.genericName?.toLowerCase().includes(drugSearch.toLowerCase()) ||
          d.drugCode?.toLowerCase().includes(drugSearch.toLowerCase()),
      )
    : [];

  // Check if drug is already in regimen
  const isDrugInRegimen = (drugId: number) =>
    regimen?.regimenDrugs.some((rd) => rd.drug.id === drugId) ?? false;

  // ─── Metadata handlers ──────────────────────────────────────────────────
  const onMetadataSubmit = async (values: MetadataFormValues) => {
    try {
      await apiClient.patch(`/regimens/${id}`, {
        regimenName: values.regimenName,
        description: values.description || undefined,
        cycleDays: values.cycleDays ? Number(values.cycleDays) : undefined,
        maxCycles: values.maxCycles ? Number(values.maxCycles) : undefined,
        regimenType: values.regimenType || undefined,
      });
      toast.success('บันทึกข้อมูลสูตรยาสำเร็จ');
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถบันทึกได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  // ─── Drug handlers ──────────────────────────────────────────────────────
  const openAddDrugForm = () => {
    setEditingDrugId(null);
    setSelectedDrug(null);
    setDrugSearch('');
    resetDrugForm({
      dosePerCycle: '',
      route: '',
      daySchedule: '',
      isOptional: false,
      notes: '',
    });
    setShowDrugForm(true);
  };

  const openEditDrugForm = (rd: RegimenDrug) => {
    setEditingDrugId(rd.drug.id);
    setSelectedDrug(rd.drug);
    setDrugSearch('');
    resetDrugForm({
      dosePerCycle: rd.dosePerCycle || '',
      route: rd.route || '',
      daySchedule: rd.daySchedule || '',
      isOptional: rd.isOptional,
      notes: rd.notes || '',
    });
    setShowDrugForm(true);
  };

  const onDrugFormSubmit = async (values: DrugFormValues) => {
    if (!editingDrugId && !selectedDrug) {
      toast.error('กรุณาเลือกยา');
      return;
    }

    setDrugSubmitting(true);
    try {
      const payload = {
        dosePerCycle: values.dosePerCycle || undefined,
        route: values.route || undefined,
        daySchedule: values.daySchedule || undefined,
        isOptional: values.isOptional || false,
        notes: values.notes || undefined,
      };

      if (editingDrugId) {
        await apiClient.patch(`/regimens/${id}/drugs/${editingDrugId}`, payload);
        toast.success('แก้ไขยาในสูตรสำเร็จ');
      } else {
        await apiClient.post(`/regimens/${id}/drugs`, {
          drugId: selectedDrug!.id,
          ...payload,
        });
        toast.success('เพิ่มยาในสูตรสำเร็จ');
      }

      setShowDrugForm(false);
      setEditingDrugId(null);
      setSelectedDrug(null);
      resetDrugForm();
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถบันทึกยาในสูตรได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setDrugSubmitting(false);
    }
  };

  const handleRemoveDrug = async () => {
    if (!removeDrugId) return;
    setRemoving(true);
    try {
      await apiClient.delete(`/regimens/${id}/drugs/${removeDrugId}`);
      toast.success('ลบยาออกจากสูตรสำเร็จ');
      setRemoveDrugId(null);
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถลบยาได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await apiClient.patch(`/regimens/${id}`, { isActive: false });
      toast.success('ปิดใช้งานสูตรยาสำเร็จ');
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

  if (!regimen) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบสูตรยา — Regimen not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/regimens">กลับไปรายการสูตรยา</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href={`/regimens/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {regimen.regimenName}
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold text-foreground">แก้ไขสูตรยา</h1>
          <StatusBadge active={regimen.isActive} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {regimen.regimenCode} — {regimen.regimenName}
        </p>
      </div>

      {/* Metadata form */}
      <form onSubmit={handleMetaSubmit(onMetadataSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลสูตรยา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">รหัสสูตรยา</Label>
              <div className="flex items-center gap-2 h-10">
                <CodeBadge code={regimen.regimenCode} className="text-sm px-3 py-1" />
                <span className="text-xs text-muted-foreground">(ไม่สามารถแก้ไขได้)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อสูตรยา (Regimen Name) *</Label>
                <Input
                  placeholder="เช่น FOLFOX4"
                  {...registerMeta('regimenName')}
                  className={cn(metaErrors.regimenName && 'border-destructive')}
                />
                {metaErrors.regimenName && (
                  <p className="text-xs text-destructive">{metaErrors.regimenName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ประเภท</Label>
                <Select
                  value={watchMeta('regimenType') || ''}
                  onChange={(v) => setMetaValue('regimenType', v)}
                  options={typeOptions}
                  placeholder="เลือกประเภท..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>คำอธิบาย (Description)</Label>
              <Textarea
                placeholder="รายละเอียดการให้ยา ขนาดยา ตารางเวลา..."
                {...registerMeta('description')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ระยะเวลารอบ (วัน)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="เช่น 21"
                  {...registerMeta('cycleDays')}
                />
              </div>
              <div className="space-y-2">
                <Label>จำนวนรอบสูงสุด</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="เช่น 6"
                  {...registerMeta('maxCycles')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {regimen.isActive && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeactivateOpen(true)}
                >
                  ปิดใช้งานสูตรยา
                </Button>
              )}
              <Button type="submit" disabled={metaSubmitting} className="ml-auto">
                {metaSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสูตรยา'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Drugs management */}
      <Card className="overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            ยาในสูตร ({regimen.regimenDrugs.length})
          </CardTitle>
          <Button type="button" size="sm" onClick={openAddDrugForm}>
            <Plus className="h-4 w-4 mr-1" />
            เพิ่มยา
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-visible">
          {/* Add/Edit drug form */}
          {showDrugForm && (
            <form
              onSubmit={handleDrugSubmit(onDrugFormSubmit)}
              className="rounded-lg border border-glass-border-subtle bg-white/10 dark:bg-white/5 p-4 space-y-4 overflow-visible"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editingDrugId ? 'แก้ไขยาในสูตร' : 'เพิ่มยาใหม่ในสูตร'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowDrugForm(false);
                    setEditingDrugId(null);
                    setSelectedDrug(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drug selector (only for add mode) */}
              {!editingDrugId && (
                <div className="space-y-2">
                  <Label>เลือกยา *</Label>
                  {selectedDrug ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                      <CodeBadge code={selectedDrug.drugCode} />
                      <span className="font-medium text-sm">{selectedDrug.genericName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDrug(null);
                          setDrugSearch('');
                        }}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={drugSearch}
                        onChange={(e) => setDrugSearch(e.target.value)}
                        placeholder="ค้นหายาโดยชื่อหรือรหัส..."
                        className="pl-9"
                      />
                      {drugSearch.trim() && filteredDrugs.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-md border border-glass-border-subtle shadow-xl ring-1 ring-black/5 dark:ring-white/5">
                          {filteredDrugs.slice(0, 15).map((d) => {
                            const alreadyAdded = isDrugInRegimen(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                disabled={alreadyAdded}
                                onClick={() => {
                                  setSelectedDrug(d);
                                  setDrugSearch('');
                                }}
                                className={cn(
                                  'w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors',
                                  alreadyAdded
                                    ? 'opacity-40 cursor-not-allowed bg-muted/5'
                                    : 'hover:bg-primary/5 cursor-pointer',
                                )}
                              >
                                <CodeBadge code={d.drugCode} />
                                <span className="truncate">{d.genericName}</span>
                                {alreadyAdded && (
                                  <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">
                                    เพิ่มแล้ว
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {drugSearch.trim() && filteredDrugs.length === 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-md border border-glass-border-subtle shadow-xl ring-1 ring-black/5 dark:ring-white/5 p-3 text-center text-sm text-muted-foreground">
                          ไม่พบยา
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Editing drug indicator */}
              {editingDrugId && selectedDrug && (
                <div className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                  <CodeBadge code={selectedDrug.drugCode} />
                  <span className="font-medium text-sm">{selectedDrug.genericName}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">กำลังแก้ไข</Badge>
                </div>
              )}

              {/* Dosing fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>ขนาดยา (Dose Per Cycle)</Label>
                  <Input
                    placeholder="เช่น 175 mg/m²"
                    {...registerDrug('dosePerCycle')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>วิธีให้ (Route)</Label>
                  <Input
                    placeholder="เช่น IV, PO"
                    {...registerDrug('route')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>วันที่ให้ (Day Schedule)</Label>
                  <Input
                    placeholder="เช่น D1, D1-14"
                    {...registerDrug('daySchedule')}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Checkbox
                  checked={watchDrug('isOptional') || false}
                  onChange={(checked) => setDrugValue('isOptional', checked)}
                  label="เป็นยาเสริม (Optional)"
                />
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุ (Notes)</Label>
                <Textarea
                  placeholder="หมายเหตุเพิ่มเติม..."
                  {...registerDrug('notes')}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDrugForm(false);
                    setEditingDrugId(null);
                    setSelectedDrug(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" size="sm" disabled={drugSubmitting}>
                  {drugSubmitting
                    ? 'กำลังบันทึก...'
                    : editingDrugId
                      ? 'บันทึกการแก้ไข'
                      : 'เพิ่มยา'}
                </Button>
              </div>
            </form>
          )}

          {/* Drugs table */}
          {regimen.regimenDrugs.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border-subtle bg-white/10 dark:bg-white/5">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ยา</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ขนาดยา</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">วิธีให้</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">วันที่ให้</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Optional</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">หมายเหตุ</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {regimen.regimenDrugs.map((rd) => (
                    <tr key={rd.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CodeBadge code={rd.drug.drugCode} />
                          <span className="font-medium">{rd.drug.genericName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{rd.dosePerCycle || '—'}</td>
                      <td className="px-4 py-3">
                        {rd.route ? <Badge variant="secondary">{rd.route}</Badge> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {rd.daySchedule ? (
                          <span className="font-mono text-xs">{rd.daySchedule}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {rd.isOptional ? (
                          <Badge variant="warning" className="text-[10px]">Optional</Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {rd.notes ? (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{rd.notes}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDrugForm(rd)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setRemoveDrugId(rd.drug.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              ยังไม่มียาในสูตร — กดปุ่ม &quot;เพิ่มยา&quot; เพื่อเพิ่ม
            </p>
          )}
        </CardContent>
      </Card>

      {/* Back link */}
      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <Link href={`/regimens/${id}`}>กลับไปหน้ารายละเอียดสูตรยา</Link>
        </Button>
      </div>

      {/* Deactivate regimen dialog */}
      <ConfirmDialog
        open={deactivateOpen}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateOpen(false)}
        title="ปิดใช้งานสูตรยา"
        description={`คุณแน่ใจหรือไม่ว่าต้องการปิดใช้งาน "${regimen.regimenName}"?`}
        confirmText="ปิดใช้งาน"
        variant="destructive"
        loading={deactivating}
      />

      {/* Remove drug dialog */}
      <ConfirmDialog
        open={removeDrugId !== null}
        onConfirm={handleRemoveDrug}
        onCancel={() => setRemoveDrugId(null)}
        title="ลบยาออกจากสูตร"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบยานี้ออกจากสูตรยา?"
        confirmText="ลบ"
        variant="destructive"
        loading={removing}
      />
    </div>
  );
}
