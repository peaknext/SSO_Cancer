'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Star, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Zod schema ─────────────────────────────────────────────────────────────────
const protocolSchema = z.object({
  protocolCode: z.string().min(1, 'กรุณากรอกรหัสโปรโตคอล'),
  cancerSiteId: z.number({ required_error: 'กรุณาเลือกตำแหน่งมะเร็ง' }).min(1, 'กรุณาเลือกตำแหน่งมะเร็ง'),
  nameEnglish: z.string().min(1, 'กรุณากรอกชื่อโปรโตคอล (EN)'),
  nameThai: z.string().optional(),
  protocolType: z.string().optional(),
  treatmentIntent: z.string().optional(),
  notes: z.string().optional(),
});

type ProtocolFormValues = z.infer<typeof protocolSchema>;

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
interface CancerSite {
  id: number;
  siteCode: string;
  nameThai: string;
  nameEnglish: string;
}

interface CancerStage {
  id: number;
  stageCode: string;
  nameThai: string;
  nameEnglish: string;
  stageGroup: string | null;
}

interface Regimen {
  id: number;
  regimenCode: string;
  regimenName: string;
}

interface LinkedRegimen {
  regimenId: number;
  regimenCode: string;
  regimenName: string;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  notes: string;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function ProtocolCreatePage() {
  const router = useRouter();

  // Cancer sites list
  const [cancerSites, setCancerSites] = useState<CancerSite[]>([]);
  const [siteSearch, setSiteSearch] = useState('');

  // Stages for selected cancer site
  const [availableStages, setAvailableStages] = useState<CancerStage[]>([]);
  const [selectedStageIds, setSelectedStageIds] = useState<number[]>([]);

  // Regimens
  const [availableRegimens, setAvailableRegimens] = useState<Regimen[]>([]);
  const [regimenSearch, setRegimenSearch] = useState('');
  const [linkedRegimens, setLinkedRegimens] = useState<LinkedRegimen[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProtocolFormValues>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      protocolCode: '',
      nameEnglish: '',
      nameThai: '',
      protocolType: '',
      treatmentIntent: '',
      notes: '',
    },
  });

  const selectedCancerSiteId = watch('cancerSiteId');

  // Load cancer sites
  useEffect(() => {
    apiClient
      .get<{ data: CancerSite[]; meta: { total: number } }>('/cancer-sites?limit=100&sortBy=nameThai&sortOrder=asc')
      .then((res) => setCancerSites(res.data))
      .catch(() => toast.error('ไม่สามารถโหลดตำแหน่งมะเร็งได้'));
  }, []);

  // Load stages when cancer site changes
  useEffect(() => {
    if (!selectedCancerSiteId) {
      setAvailableStages([]);
      setSelectedStageIds([]);
      return;
    }
    apiClient
      .get<CancerStage[]>(`/cancer-sites/${selectedCancerSiteId}/stages`)
      .then((stages) => {
        setAvailableStages(stages);
        setSelectedStageIds([]);
      })
      .catch(() => setAvailableStages([]));
  }, [selectedCancerSiteId]);

  // Load regimens
  useEffect(() => {
    apiClient
      .get<{ data: Regimen[]; meta: { total: number } }>('/regimens?limit=100&sortBy=regimenCode&sortOrder=asc')
      .then((res) => setAvailableRegimens(res.data))
      .catch(() => toast.error('ไม่สามารถโหลดสูตรยาได้'));
  }, []);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const toggleStage = (stageId: number) => {
    setSelectedStageIds((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId],
    );
  };

  const addRegimen = (regimen: Regimen) => {
    if (linkedRegimens.some((lr) => lr.regimenId === regimen.id)) {
      toast.error('สูตรยานี้ถูกเพิ่มแล้ว');
      return;
    }
    setLinkedRegimens((prev) => [
      ...prev,
      {
        regimenId: regimen.id,
        regimenCode: regimen.regimenCode,
        regimenName: regimen.regimenName,
        lineOfTherapy: null,
        isPreferred: false,
        notes: '',
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
  const onSubmit = async (values: ProtocolFormValues) => {
    try {
      // 1. Create protocol with optional stageIds
      const payload = {
        ...values,
        protocolType: values.protocolType || undefined,
        treatmentIntent: values.treatmentIntent || undefined,
        nameThai: values.nameThai || undefined,
        notes: values.notes || undefined,
        stageIds: selectedStageIds.length > 0 ? selectedStageIds : undefined,
      };

      const result = await apiClient.post<{ id: number }>('/protocols', payload);
      const protocolId = result.id;

      // 2. Link regimens (sequential to avoid race conditions)
      for (const lr of linkedRegimens) {
        await apiClient.post(`/protocols/${protocolId}/regimens`, {
          regimenId: lr.regimenId,
          lineOfTherapy: lr.lineOfTherapy ?? undefined,
          isPreferred: lr.isPreferred,
          notes: lr.notes || undefined,
        });
      }

      toast.success('สร้างโปรโตคอลสำเร็จ');
      router.push(`/protocols/${protocolId}`);
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error('ไม่สามารถสร้างโปรโตคอลได้', {
        description: apiErr?.error?.message || 'Unknown error',
      });
    }
  };

  // ─── Filtered lists ────────────────────────────────────────────────────
  const filteredSites = cancerSites.filter(
    (s) =>
      !siteSearch ||
      s.nameThai.toLowerCase().includes(siteSearch.toLowerCase()) ||
      s.nameEnglish.toLowerCase().includes(siteSearch.toLowerCase()) ||
      s.siteCode.toLowerCase().includes(siteSearch.toLowerCase()),
  );

  const filteredRegimens = availableRegimens.filter(
    (r) =>
      !regimenSearch ||
      r.regimenCode.toLowerCase().includes(regimenSearch.toLowerCase()) ||
      r.regimenName.toLowerCase().includes(regimenSearch.toLowerCase()),
  );

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/protocols">
            <ArrowLeft className="h-4 w-4 mr-1" />
            โปรโตคอล
          </Link>
        </Button>
        <h1 className="font-heading text-2xl font-bold text-foreground">สร้างโปรโตคอลใหม่</h1>
        <p className="text-sm text-muted-foreground mt-1">Create New Protocol</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ข้อมูลพื้นฐาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Protocol code + Cancer site */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสโปรโตคอล *</Label>
                <Input
                  placeholder="เช่น C2401"
                  {...register('protocolCode')}
                  className={cn(errors.protocolCode && 'border-destructive')}
                />
                {errors.protocolCode && (
                  <p className="text-xs text-destructive">{errors.protocolCode.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>ตำแหน่งมะเร็ง *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาตำแหน่งมะเร็ง..."
                    value={siteSearch}
                    onChange={(e) => setSiteSearch(e.target.value)}
                    className={cn('pl-9', errors.cancerSiteId && 'border-destructive')}
                  />
                </div>
                {errors.cancerSiteId && (
                  <p className="text-xs text-destructive">{errors.cancerSiteId.message}</p>
                )}

                {/* Selected site */}
                {selectedCancerSiteId && (
                  <div className="flex items-center gap-2 rounded-lg border bg-primary/5 px-3 py-2">
                    <CodeBadge
                      code={cancerSites.find((s) => s.id === selectedCancerSiteId)?.siteCode || ''}
                    />
                    <span className="text-sm font-medium">
                      {cancerSites.find((s) => s.id === selectedCancerSiteId)?.nameThai}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('cancerSiteId', 0 as unknown as number);
                        setSiteSearch('');
                      }}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Site dropdown */}
                {siteSearch && !selectedCancerSiteId && (
                  <div className="relative z-20 max-h-48 overflow-y-auto rounded-lg border bg-card shadow-md">
                    {filteredSites.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">ไม่พบผลลัพธ์</p>
                    ) : (
                      filteredSites.slice(0, 20).map((site) => (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => {
                            setValue('cancerSiteId', site.id, { shouldValidate: true });
                            setSiteSearch('');
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                        >
                          <CodeBadge code={site.siteCode} />
                          <span>{site.nameThai}</span>
                          <span className="text-muted-foreground text-xs ml-auto">{site.nameEnglish}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ชื่อโปรโตคอล (EN) *</Label>
                <Input
                  placeholder="Protocol name in English"
                  {...register('nameEnglish')}
                  className={cn(errors.nameEnglish && 'border-destructive')}
                />
                {errors.nameEnglish && (
                  <p className="text-xs text-destructive">{errors.nameEnglish.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ชื่อโปรโตคอล (TH)</Label>
                <Input
                  placeholder="ชื่อโปรโตคอลภาษาไทย"
                  {...register('nameThai')}
                />
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
            {!selectedCancerSiteId ? (
              <p className="text-sm text-muted-foreground">กรุณาเลือกตำแหน่งมะเร็งก่อน</p>
            ) : availableStages.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีระยะโรคสำหรับตำแหน่งนี้</p>
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
            {/* Search regimens */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาสูตรยาเพื่อเพิ่ม..."
                value={regimenSearch}
                onChange={(e) => setRegimenSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search results */}
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
                          alreadyLinked
                            ? 'opacity-50 cursor-not-allowed bg-muted/30'
                            : 'hover:bg-muted/50',
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

            {/* Linked regimens */}
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
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRegimen(lr.regimenId)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
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

            {linkedRegimens.length === 0 && !regimenSearch && (
              <p className="text-sm text-muted-foreground text-center py-4">
                ยังไม่มีสูตรยา — ค้นหาเพื่อเพิ่มสูตรยา
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/protocols">ยกเลิก</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังสร้าง...' : 'สร้างโปรโตคอล'}
          </Button>
        </div>
      </form>
    </div>
  );
}
