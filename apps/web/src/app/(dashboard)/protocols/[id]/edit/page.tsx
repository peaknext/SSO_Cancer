'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Search, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CreateRegimenDialog } from '@/components/protocols/create-regimen-dialog';
import { EditRegimenDrugsDialog } from '@/components/protocols/edit-regimen-drugs-dialog';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Zod schema ─────────────────────────────────────────────────────────────────
const updateProtocolSchema = z.object({
  nameEnglish: z.string().min(1, 'กรุณากรอกชื่อโปรโตคอล (EN)'),
  nameThai: z.string().optional(),
  protocolType: z.string().optional(),
  treatmentIntent: z.string().optional(),
  notes: z.string().optional(),
});

type UpdateFormValues = z.infer<typeof updateProtocolSchema>;

// ─── Options ─────────────────────────────────────────────────────────────────
const protocolTypeOptions = [
  { value: 'CHEMOTHERAPY', label: 'Chemotherapy' },
  { value: 'TARGETED_THERAPY', label: 'Targeted Therapy' },
  { value: 'IMMUNOTHERAPY', label: 'Immunotherapy' },
  { value: 'HORMONAL_THERAPY', label: 'Hormonal Therapy' },
  { value: 'CHEMORADIATION', label: 'Chemoradiation' },
  { value: 'COMBINATION', label: 'Combination' },
];

const intentOptions = [
  { value: 'CURATIVE', label: 'Curative — รักษาให้หาย' },
  { value: 'PALLIATIVE', label: 'Palliative — ประคับประคอง' },
  { value: 'ADJUVANT', label: 'Adjuvant — เสริมหลังผ่าตัด' },
  { value: 'NEOADJUVANT', label: 'Neoadjuvant — ก่อนผ่าตัด' },
  { value: 'CONCURRENT', label: 'Concurrent — ร่วมกับฉายแสง' },
];

// ─── Types ─────────────────────────────────────────────────────────────────
interface CancerStage {
  id: number;
  stageCode: string;
  nameThai: string;
  nameEnglish: string;
}

interface Regimen {
  id: number;
  regimenCode: string;
  regimenName: string;
}

interface ProtocolStage {
  id: number;
  stage: CancerStage;
}

interface ProtocolRegimen {
  id: number;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  notes: string | null;
  regimen: {
    id: number;
    regimenCode: string;
    regimenName: string;
    regimenDrugs: unknown[];
  };
}

interface ProtocolDetail {
  id: number;
  protocolCode: string;
  nameEnglish: string;
  nameThai: string | null;
  protocolType: string;
  treatmentIntent: string;
  notes: string | null;
  isActive: boolean;
  cancerSite: {
    id: number;
    siteCode: string;
    nameEnglish: string;
    nameThai: string;
  };
  protocolStages: ProtocolStage[];
  protocolRegimens: ProtocolRegimen[];
}

interface LinkedRegimen {
  regimenId: number;
  regimenCode: string;
  regimenName: string;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  notes: string;
  isExisting: boolean; // already linked in DB
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ProtocolEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: protocol, isLoading, refetch } = useApi<ProtocolDetail>(`/protocols/${id}`);

  // Stages
  const [availableStages, setAvailableStages] = useState<CancerStage[]>([]);
  const [selectedStageIds, setSelectedStageIds] = useState<number[]>([]);
  const [originalStageIds, setOriginalStageIds] = useState<number[]>([]);

  // Regimens
  const [availableRegimens, setAvailableRegimens] = useState<Regimen[]>([]);
  const [regimenSearch, setRegimenSearch] = useState('');
  const [linkedRegimens, setLinkedRegimens] = useState<LinkedRegimen[]>([]);
  const [originalRegimenIds, setOriginalRegimenIds] = useState<number[]>([]);
  const [originalRegimens, setOriginalRegimens] = useState<LinkedRegimen[]>([]);

  // Deactivation
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // Create regimen dialog
  const [createRegimenOpen, setCreateRegimenOpen] = useState(false);

  // Edit regimen drugs dialog
  const [editDrugsRegimenId, setEditDrugsRegimenId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateProtocolSchema),
  });

  // Populate form from loaded data
  useEffect(() => {
    if (!protocol) return;

    reset({
      nameEnglish: protocol.nameEnglish,
      nameThai: protocol.nameThai || '',
      protocolType: protocol.protocolType || '',
      treatmentIntent: protocol.treatmentIntent || '',
      notes: protocol.notes || '',
    });

    // Set stages
    const stageIds = protocol.protocolStages.map((ps) => ps.stage.id);
    setSelectedStageIds(stageIds);
    setOriginalStageIds(stageIds);

    // Set regimens
    const regimens = protocol.protocolRegimens.map((pr) => ({
      regimenId: pr.regimen.id,
      regimenCode: pr.regimen.regimenCode,
      regimenName: pr.regimen.regimenName,
      lineOfTherapy: pr.lineOfTherapy,
      isPreferred: pr.isPreferred,
      notes: pr.notes || '',
      isExisting: true,
    }));
    setLinkedRegimens(regimens);
    setOriginalRegimens(regimens);
    setOriginalRegimenIds(regimens.map((r) => r.regimenId));

    // Load available stages for this cancer site
    apiClient
      .get<CancerStage[]>(`/cancer-sites/${protocol.cancerSite.id}/stages`)
      .then((stages) => setAvailableStages(stages))
      .catch(() => {});

    // Load all regimens
    apiClient
      .get<{ data: Regimen[]; meta: { total: number } }>('/regimens?limit=100&sortBy=regimenCode&sortOrder=asc')
      .then((res) => setAvailableRegimens(res.data || []))
      .catch(() => {});
  }, [protocol, reset]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const toggleStage = (stageId: number) => {
    setSelectedStageIds((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId],
    );
  };

  const addRegimen = (regimen: Regimen) => {
    if (linkedRegimens.some((lr) => lr.regimenId === regimen.id)) return;
    setLinkedRegimens((prev) => [
      ...prev,
      {
        regimenId: regimen.id,
        regimenCode: regimen.regimenCode,
        regimenName: regimen.regimenName,
        lineOfTherapy: null,
        isPreferred: false,
        notes: '',
        isExisting: false,
      },
    ]);
    setRegimenSearch('');
  };

  const removeRegimen = (regimenId: number) => {
    setLinkedRegimens((prev) => prev.filter((lr) => lr.regimenId !== regimenId));
  };

  const updateRegimen = (regimenId: number, field: keyof LinkedRegimen, value: unknown) => {
    setLinkedRegimens((prev) =>
      prev.map((lr) => (lr.regimenId === regimenId ? { ...lr, [field]: value } : lr)),
    );
  };

  // ─── Submit ────────────────────────────────────────────────────────────
  const onSubmit = async (values: UpdateFormValues) => {
    if (!protocol) return;

    try {
      // 1. Update protocol metadata
      await apiClient.patch(`/protocols/${id}`, {
        nameEnglish: values.nameEnglish,
        nameThai: values.nameThai || undefined,
        protocolType: values.protocolType || undefined,
        treatmentIntent: values.treatmentIntent || undefined,
        notes: values.notes || undefined,
      });

      // 2. Sync stages: add new, remove old
      const stagesToAdd = selectedStageIds.filter((sid) => !originalStageIds.includes(sid));
      const stagesToRemove = originalStageIds.filter((sid) => !selectedStageIds.includes(sid));

      for (const stageId of stagesToAdd) {
        await apiClient.post(`/protocols/${id}/stages`, { stageId });
      }
      for (const stageId of stagesToRemove) {
        await apiClient.delete(`/protocols/${id}/stages/${stageId}`);
      }

      // 3. Sync regimens: add new, remove old
      const currentRegimenIds = linkedRegimens.map((lr) => lr.regimenId);
      const regimensToAdd = linkedRegimens.filter((lr) => !originalRegimenIds.includes(lr.regimenId));
      const regimensToRemove = originalRegimenIds.filter((rid) => !currentRegimenIds.includes(rid));

      for (const lr of regimensToAdd) {
        await apiClient.post(`/protocols/${id}/regimens`, {
          regimenId: lr.regimenId,
          lineOfTherapy: lr.lineOfTherapy ?? undefined,
          isPreferred: lr.isPreferred,
          notes: lr.notes || undefined,
        });
      }
      for (const regimenId of regimensToRemove) {
        await apiClient.delete(`/protocols/${id}/regimens/${regimenId}`);
      }

      // 4. Update existing regimens that changed (notes, line, preferred)
      for (const lr of linkedRegimens) {
        if (!originalRegimenIds.includes(lr.regimenId)) continue; // new — already handled
        const orig = originalRegimens.find((o) => o.regimenId === lr.regimenId);
        if (!orig) continue;
        if (
          lr.lineOfTherapy !== orig.lineOfTherapy ||
          lr.isPreferred !== orig.isPreferred ||
          lr.notes !== orig.notes
        ) {
          const updateBody: Record<string, unknown> = {};
          if (lr.lineOfTherapy !== orig.lineOfTherapy) updateBody.lineOfTherapy = lr.lineOfTherapy;
          if (lr.isPreferred !== orig.isPreferred) updateBody.isPreferred = lr.isPreferred;
          if (lr.notes !== orig.notes) updateBody.notes = lr.notes || null;
          await apiClient.patch(`/protocols/${id}/regimens/${lr.regimenId}`, updateBody);
        }
      }

      toast.success('บันทึกการเปลี่ยนแปลงสำเร็จ');
      router.push(`/protocols/${id}`);
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถบันทึกการเปลี่ยนแปลงได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await apiClient.patch(`/protocols/${id}/deactivate`);
      toast.success('ปิดใช้งานโปรโตคอลสำเร็จ');
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

  // ─── Filtered regimens ────────────────────────────────────────────────
  const filteredRegimens = availableRegimens.filter(
    (r) =>
      !regimenSearch ||
      r.regimenCode.toLowerCase().includes(regimenSearch.toLowerCase()) ||
      r.regimenName.toLowerCase().includes(regimenSearch.toLowerCase()),
  );

  // ─── Loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบโปรโตคอล — Protocol not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/protocols">กลับไปรายการโปรโตคอล</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href={`/protocols/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {protocol.protocolCode}
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-heading text-2xl font-bold text-foreground">แก้ไขโปรโตคอล</h1>
          <StatusBadge active={protocol.isActive} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {protocol.protocolCode} — {protocol.nameEnglish}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info (read-only: code + cancer site) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Read-only fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">รหัสโปรโตคอล</Label>
                <div className="flex items-center gap-2 h-10">
                  <CodeBadge code={protocol.protocolCode} className="text-sm px-3 py-1" />
                  <span className="text-xs text-muted-foreground">(ไม่สามารถแก้ไขได้)</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">ตำแหน่งมะเร็ง</Label>
                <div className="flex items-center gap-2 h-10">
                  <CodeBadge code={protocol.cancerSite.siteCode} />
                  <span className="text-sm">{protocol.cancerSite.nameThai}</span>
                </div>
              </div>
            </div>

            {/* Editable names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อโปรโตคอล (EN) *</Label>
                <Input
                  placeholder="Protocol name"
                  {...register('nameEnglish')}
                  className={cn(errors.nameEnglish && 'border-destructive')}
                />
                {errors.nameEnglish && (
                  <p className="text-xs text-destructive">{errors.nameEnglish.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ชื่อโปรโตคอล (TH)</Label>
                <Input placeholder="ชื่อภาษาไทย" {...register('nameThai')} />
              </div>
            </div>

            {/* Type + Intent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ประเภทโปรโตคอล</Label>
                <Select
                  value={watch('protocolType') || ''}
                  onChange={(v) => setValue('protocolType', v)}
                  options={protocolTypeOptions}
                  placeholder="เลือกประเภท..."
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>เจตนาการรักษา</Label>
                <Select
                  value={watch('treatmentIntent') || ''}
                  onChange={(v) => setValue('treatmentIntent', v)}
                  options={intentOptions}
                  placeholder="เลือกเจตนา..."
                  className="w-full"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>หมายเหตุโปรโตคอล</Label>
              <Textarea
                placeholder="บันทึกรายละเอียดเพิ่มเติมเกี่ยวกับโปรโตคอล..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              ระยะของโรคที่ใช้ได้ ({selectedStageIds.length} เลือก)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableStages.length === 0 ? (
              <p className="text-sm text-muted-foreground">กำลังโหลดระยะโรค...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableStages.map((stage) => {
                  const selected = selectedStageIds.includes(stage.id);
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        selected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50',
                      )}
                    >
                      <span className="font-mono text-xs">{stage.stageCode}</span>
                      <span>{stage.nameThai || stage.nameEnglish}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regimens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              สูตรยาที่เชื่อมโยง ({linkedRegimens.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search regimens + create new */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาสูตรยาเพื่อเพิ่ม..."
                  value={regimenSearch}
                  onChange={(e) => setRegimenSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 h-10"
                onClick={() => setCreateRegimenOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                สร้างสูตรยาใหม่
              </Button>
            </div>

            {regimenSearch && (
              <div className="relative z-20 max-h-48 overflow-y-auto rounded-lg border bg-card shadow-md">
                {filteredRegimens.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">ไม่พบสูตรยา</p>
                ) : (
                  filteredRegimens.slice(0, 15).map((regimen) => {
                    const alreadyLinked = linkedRegimens.some((lr) => lr.regimenId === regimen.id);
                    return (
                      <button
                        key={regimen.id}
                        type="button"
                        disabled={alreadyLinked}
                        onClick={() => addRegimen(regimen)}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors',
                          alreadyLinked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50',
                        )}
                      >
                        <Plus className="h-4 w-4 text-primary shrink-0" />
                        <CodeBadge code={regimen.regimenCode} />
                        <span>{regimen.regimenName}</span>
                        {alreadyLinked && (
                          <Badge variant="secondary" className="ml-auto text-[11px]">เพิ่มแล้ว</Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Linked regimens list */}
            {linkedRegimens.length > 0 && (
              <div className="space-y-3">
                {linkedRegimens.map((lr) => (
                  <div
                    key={lr.regimenId}
                    className={cn(
                      'rounded-lg border p-4 space-y-3',
                      lr.isPreferred && 'border-l-[3px] border-l-primary',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CodeBadge code={lr.regimenCode} />
                        <span className="text-sm font-medium">{lr.regimenName}</span>
                        {lr.isExisting && (
                          <Badge variant="secondary" className="text-[11px]">เดิม</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => setEditDrugsRegimenId(lr.regimenId)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          จัดการยา
                        </Button>
                        <button
                          type="button"
                          onClick={() => removeRegimen(lr.regimenId)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Line:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          placeholder="—"
                          value={lr.lineOfTherapy ?? ''}
                          onChange={(e) =>
                            updateRegimen(
                              lr.regimenId,
                              'lineOfTherapy',
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="w-20 h-8 text-sm"
                        />
                      </div>
                      <Checkbox
                        checked={lr.isPreferred}
                        onChange={(v) => updateRegimen(lr.regimenId, 'isPreferred', v)}
                        label="Preferred"
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-50">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">หมายเหตุ:</Label>
                        <Input
                          placeholder="บันทึกเพิ่มเติม..."
                          value={lr.notes}
                          onChange={(e) => updateRegimen(lr.regimenId, 'notes', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {protocol.isActive && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeactivateOpen(true)}
            >
              ปิดใช้งาน
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button type="button" variant="outline" asChild>
              <Link href={`/protocols/${id}`}>ยกเลิก</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </Button>
          </div>
        </div>
      </form>

      {/* Deactivation confirm */}
      <ConfirmDialog
        open={deactivateOpen}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateOpen(false)}
        title="ปิดใช้งานโปรโตคอล"
        description={`คุณแน่ใจหรือไม่ว่าต้องการปิดใช้งาน "${protocol.protocolCode} — ${protocol.nameEnglish}"?`}
        confirmText="ปิดใช้งาน"
        variant="destructive"
        loading={deactivating}
      />

      {/* Create regimen dialog */}
      <CreateRegimenDialog
        open={createRegimenOpen}
        onClose={() => setCreateRegimenOpen(false)}
        onSuccess={(newRegimen) => {
          addRegimen(newRegimen);
          setAvailableRegimens((prev) => [...prev, newRegimen]);
        }}
      />

      {/* Edit regimen drugs dialog */}
      {editDrugsRegimenId !== null && (() => {
        const lr = linkedRegimens.find((r) => r.regimenId === editDrugsRegimenId);
        if (!lr) return null;
        return (
          <EditRegimenDrugsDialog
            open
            onClose={() => setEditDrugsRegimenId(null)}
            regimenId={lr.regimenId}
            regimenCode={lr.regimenCode}
            regimenName={lr.regimenName}
          />
        );
      })()}
    </div>
  );
}
