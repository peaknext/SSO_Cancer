'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Search, Plus, Pencil, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { CodeBadge } from '@/components/shared/code-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Schema ──────────────────────────────────────────────────────────────────

const drugFormSchema = z.object({
  dosePerCycle: z.string().optional(),
  route: z.string().optional(),
  daySchedule: z.string().optional(),
  isOptional: z.boolean().optional(),
  notes: z.string().optional(),
});

type DrugFormValues = z.infer<typeof drugFormSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

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
  regimenDrugs: RegimenDrug[];
}

interface EditRegimenDrugsDialogProps {
  open: boolean;
  onClose: () => void;
  regimenId: number;
  regimenCode: string;
  regimenName: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EditRegimenDrugsDialog({
  open,
  onClose,
  regimenId,
  regimenCode,
  regimenName,
}: EditRegimenDrugsDialogProps) {
  const { data: regimen, isLoading, refetch } = useApi<RegimenDetail>(
    `/regimens/${regimenId}`,
    { enabled: open },
  );

  // Drug form state
  const [showDrugForm, setShowDrugForm] = useState(false);
  const [editingDrugId, setEditingDrugId] = useState<number | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<DrugOption | null>(null);
  const [drugSubmitting, setDrugSubmitting] = useState(false);

  // Drug search
  const [availableDrugs, setAvailableDrugs] = useState<DrugOption[]>([]);
  const [drugSearch, setDrugSearch] = useState('');

  // Remove drug
  const [removeDrugId, setRemoveDrugId] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  // Drug form
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
      .get<{ data: DrugOption[]; meta: { total: number } }>('/drugs?limit=100&sortBy=genericName&sortOrder=asc')
      .then((res) => setAvailableDrugs(res.data || []))
      .catch(() => {});
  }, [open]);

  // Reset state on close
  const handleClose = useCallback(() => {
    setShowDrugForm(false);
    setEditingDrugId(null);
    setSelectedDrug(null);
    setDrugSearch('');
    resetDrugForm();
    setRemoveDrugId(null);
    onClose();
  }, [onClose, resetDrugForm]);

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
        await apiClient.patch(`/regimens/${regimenId}/drugs/${editingDrugId}`, payload);
        toast.success('แก้ไขยาในสูตรสำเร็จ');
      } else {
        await apiClient.post(`/regimens/${regimenId}/drugs`, {
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
      await apiClient.delete(`/regimens/${regimenId}/drugs/${removeDrugId}`);
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

  const drugs = regimen?.regimenDrugs ?? [];

  return (
    <>
      <Modal open={open} onClose={handleClose} maxWidth="xl">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 rounded-t-2xl border-b border-glass-border-subtle bg-white/80 dark:bg-white/5 backdrop-blur-md px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FlaskConical className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-foreground">จัดการยาในสูตร</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <CodeBadge code={regimenCode} />
                  <span className="text-xs text-muted-foreground">{regimenName}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ) : (
            <>
              {/* Add drug button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {drugs.length > 0
                    ? `${drugs.length} รายการยาในสูตร`
                    : 'ยังไม่มียาในสูตร'}
                </p>
                {!showDrugForm && (
                  <Button type="button" size="sm" onClick={openAddDrugForm}>
                    <Plus className="h-4 w-4 mr-1" />
                    เพิ่มยา
                  </Button>
                )}
              </div>

              {/* ── Inline drug form ── */}
              {showDrugForm && (
                <form
                  onSubmit={handleDrugSubmit(onDrugFormSubmit)}
                  className="rounded-xl border border-primary/20 bg-primary/2 p-4 space-y-4 overflow-visible"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {editingDrugId ? 'แก้ไขยาในสูตร' : 'เพิ่มยาใหม่ในสูตร'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDrugForm(false);
                        setEditingDrugId(null);
                        setSelectedDrug(null);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Drug selector (add mode only) */}
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
                    <Textarea placeholder="หมายเหตุเพิ่มเติม..." {...registerDrug('notes')} rows={2} />
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

              {/* ── Drugs table ── */}
              {drugs.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border">
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
                      {drugs.map((rd) => (
                        <tr key={rd.id} className="border-b last:border-0 hover:bg-white/10 dark:hover:bg-white/5 transition-colors">
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
                              <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                                {rd.notes}
                              </span>
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
              ) : !showDrugForm ? (
                <div className="rounded-xl border border-dashed border-border/60 py-10 text-center">
                  <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    ยังไม่มียาในสูตร — กดปุ่ม &quot;เพิ่มยา&quot; เพื่อเพิ่ม
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="sticky bottom-0 rounded-b-2xl border-t border-glass-border-subtle bg-white/80 dark:bg-white/5 backdrop-blur-md px-6 py-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              ปิด
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove drug confirmation */}
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
    </>
  );
}
