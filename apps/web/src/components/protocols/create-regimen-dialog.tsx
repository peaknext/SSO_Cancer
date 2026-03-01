'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { CodeBadge } from '@/components/shared/code-badge';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Schemas ────────────────────────────────────────────────────────────────

const regimenSchema = z.object({
  regimenCode: z.string().min(1, 'กรุณากรอกรหัสสูตรยา'),
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

type RegimenFormValues = z.infer<typeof regimenSchema>;
type DrugFormValues = z.infer<typeof drugFormSchema>;

// ─── Constants ──────────────────────────────────────────────────────────────

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

interface LinkedDrug {
  drugId: number;
  drugCode: string;
  genericName: string;
  dosePerCycle?: string;
  route?: string;
  daySchedule?: string;
  isOptional?: boolean;
  notes?: string;
}

interface CreateRegimenDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (regimen: { id: number; regimenCode: string; regimenName: string }) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CreateRegimenDialog({ open, onClose, onSuccess }: CreateRegimenDialogProps) {
  // Drug management state
  const [linkedDrugs, setLinkedDrugs] = useState<LinkedDrug[]>([]);
  const [showDrugForm, setShowDrugForm] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<DrugOption | null>(null);
  const [availableDrugs, setAvailableDrugs] = useState<DrugOption[]>([]);
  const [drugSearch, setDrugSearch] = useState('');

  // Regimen form
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

  // Drug dosing form
  const {
    register: registerDrug,
    handleSubmit: handleDrugSubmit,
    reset: resetDrugForm,
    watch: watchDrug,
    setValue: setDrugValue,
  } = useForm<DrugFormValues>({
    resolver: zodResolver(drugFormSchema),
  });

  // Load available drugs when dialog opens
  useEffect(() => {
    if (!open) return;
    apiClient
      .get<{ data: DrugOption[]; meta: { total: number } }>(
        '/drugs?limit=100&sortBy=genericName&sortOrder=asc',
      )
      .then((res) => setAvailableDrugs(res.data || []))
      .catch(() => {});
  }, [open]);

  // Filter drugs for search
  const filteredDrugs = drugSearch.trim()
    ? availableDrugs.filter(
        (d) =>
          d.genericName?.toLowerCase().includes(drugSearch.toLowerCase()) ||
          d.drugCode?.toLowerCase().includes(drugSearch.toLowerCase()),
      )
    : [];

  const isDrugLinked = (drugId: number) => linkedDrugs.some((ld) => ld.drugId === drugId);

  // ─── Drug handlers ────────────────────────────────────────────────────────

  const openAddDrugForm = () => {
    setSelectedDrug(null);
    setDrugSearch('');
    resetDrugForm({ dosePerCycle: '', route: '', daySchedule: '', isOptional: false, notes: '' });
    setShowDrugForm(true);
  };

  const onDrugFormSubmit = (values: DrugFormValues) => {
    if (!selectedDrug) {
      toast.error('กรุณาเลือกยา');
      return;
    }

    setLinkedDrugs((prev) => [
      ...prev,
      {
        drugId: selectedDrug.id,
        drugCode: selectedDrug.drugCode,
        genericName: selectedDrug.genericName,
        dosePerCycle: values.dosePerCycle || undefined,
        route: values.route || undefined,
        daySchedule: values.daySchedule || undefined,
        isOptional: values.isOptional || false,
        notes: values.notes || undefined,
      },
    ]);

    setShowDrugForm(false);
    setSelectedDrug(null);
    resetDrugForm();
    toast.success(`เพิ่ม ${selectedDrug.genericName} ในรายการ`);
  };

  const removeDrug = (drugId: number) => {
    setLinkedDrugs((prev) => prev.filter((ld) => ld.drugId !== drugId));
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const onSubmit = async (values: RegimenFormValues) => {
    try {
      const payload = {
        regimenCode: values.regimenCode,
        regimenName: values.regimenName,
        description: values.description || undefined,
        cycleDays: values.cycleDays ? Number(values.cycleDays) : undefined,
        maxCycles: values.maxCycles ? Number(values.maxCycles) : undefined,
        regimenType: values.regimenType || undefined,
        drugs:
          linkedDrugs.length > 0
            ? linkedDrugs.map((ld) => ({
                drugId: ld.drugId,
                dosePerCycle: ld.dosePerCycle,
                route: ld.route,
                daySchedule: ld.daySchedule,
                isOptional: ld.isOptional,
                notes: ld.notes,
              }))
            : undefined,
      };

      const result = await apiClient.post<{ id: number }>('/regimens', payload);

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
    resetDrugForm();
    setLinkedDrugs([]);
    setShowDrugForm(false);
    setSelectedDrug(null);
    setDrugSearch('');
    onClose();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={handleClose} maxWidth="xl">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-glass-border-subtle sticky top-0 bg-white/80 dark:bg-white/5 backdrop-blur-md z-10 rounded-t-2xl">
        <h2 className="font-heading text-lg font-semibold">สร้างสูตรยาใหม่</h2>
        <button
          onClick={handleClose}
          className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-colors"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 space-y-6">
          {/* ─── Regimen Info ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              ข้อมูลสูตรยา
            </h3>

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
          </div>

          {/* ─── Separator ────────────────────────────────────────────── */}
          <div className="border-t" />

          {/* ─── Drugs Section ────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
                ยาในสูตร ({linkedDrugs.length})
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={openAddDrugForm}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                เพิ่มยา
              </Button>
            </div>

            {/* Inline add-drug form */}
            {showDrugForm && (
              <div className="rounded-lg border border-primary/20 bg-primary/2 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">เพิ่มยาในสูตร</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDrugForm(false);
                      setSelectedDrug(null);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Drug selector */}
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
                            const alreadyAdded = isDrugLinked(d.id);
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
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] ml-auto shrink-0"
                                  >
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

                {/* Dosing fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ขนาดยา (Dose Per Cycle)</Label>
                    <Input placeholder="เช่น 175 mg/m²" {...registerDrug('dosePerCycle')} />
                  </div>
                  <div className="space-y-2">
                    <Label>วิธีให้ (Route)</Label>
                    <Input placeholder="เช่น IV, PO" {...registerDrug('route')} />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่ให้ (Day Schedule)</Label>
                    <Input placeholder="เช่น D1, D1-14" {...registerDrug('daySchedule')} />
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
                      setSelectedDrug(null);
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDrugSubmit(onDrugFormSubmit)}
                  >
                    เพิ่มยา
                  </Button>
                </div>
              </div>
            )}

            {/* Linked drugs table */}
            {linkedDrugs.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border-subtle bg-white/10 dark:bg-white/5">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">ยา</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        ขนาดยา
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        วิธีให้
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        วันที่ให้
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                        Optional
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground w-12">
                        ลบ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedDrugs.map((ld) => (
                      <tr key={ld.drugId} className="border-b last:border-0">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <CodeBadge code={ld.drugCode} />
                            <span className="font-medium text-xs">{ld.genericName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-xs">
                          {ld.dosePerCycle || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {ld.route ? <Badge variant="secondary">{ld.route}</Badge> : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {ld.daySchedule ? (
                            <span className="font-mono text-xs">{ld.daySchedule}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {ld.isOptional ? (
                            <Badge variant="warning" className="text-[10px]">
                              Optional
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeDrug(ld.drugId)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !showDrugForm ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                ยังไม่มียาในสูตร — กดปุ่ม &quot;เพิ่มยา&quot; เพื่อเพิ่ม (ไม่บังคับ)
              </p>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 pt-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังสร้าง...' : 'สร้างสูตรยา'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
