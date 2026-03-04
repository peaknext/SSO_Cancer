'use client';

import { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Pill,
  Receipt,
  AlertCircle,
  Stethoscope,
  RefreshCw,
  Zap,
  Syringe,
  Heart,
  FlaskConical,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeBadge } from '@/components/shared/code-badge';
import { cn } from '@/lib/utils';
import { HisCompletenessBadge, type VisitCompleteness } from './his-completeness-badge';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HisMedication {
  hospitalCode: string;
  medicationName: string;
  quantity?: string;
  unit?: string;
}

interface HisBillingItem {
  hospitalCode: string;
  billingGroup: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface HisVisit {
  vn: string;
  visitDate: string;
  serviceStartTime?: string;
  serviceEndTime?: string;
  physicianLicenseNo?: string;
  clinicCode?: string;
  primaryDiagnosis: string;
  secondaryDiagnoses?: string;
  hpi?: string;
  doctorNotes?: string;
  billNo?: string;
  visitType?: string;
  dischargeType?: string;
  nextAppointmentDate?: string;
  serviceClass?: string;
  serviceType?: string;
  prescriptionTime?: string;
  dayCover?: string;
  medications?: HisMedication[];
  billingItems?: HisBillingItem[];
}

interface HisPreviewVisit {
  visit: HisVisit;
  isCancerRelated: boolean;
  isAlreadyImported: boolean;
  completeness: VisitCompleteness;
  hasProtocolDrugs: boolean;
}

interface SummaryStats {
  totalVisits: number;
  cancerRelatedVisits: number;
  alreadyImported: number;
  newImportable: number;
  completeVisits: number;
  incompleteVisits: number;
}

interface Props {
  visits: HisPreviewVisit[];
  summary: SummaryStats;
  importedVns: Set<string>;
  importingVn: string | null;
  onImportVisit: (vn: string, forceIncomplete: boolean) => void;
  syncingVn?: string | null;
  onSyncVisit?: (vn: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatThaiDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const month = months[d.getMonth()];
    const buddhistYear = d.getFullYear() + 543;
    return `${day} ${month} ${buddhistYear}`;
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Summary Stats Cards ────────────────────────────────────────────────────

function VisitSummaryStats({ summary }: { summary: SummaryStats }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      <StatCard label="ทั้งหมด" value={summary.totalVisits} />
      <StatCard label="มะเร็ง" value={summary.cancerRelatedVisits} color="text-primary" />
      <StatCard label="นำเข้าแล้ว" value={summary.alreadyImported} color="text-muted-foreground" />
      <StatCard label="นำเข้าได้" value={summary.newImportable} color="text-success" />
      <StatCard label="ครบถ้วน" value={summary.completeVisits} color="text-success" />
      <StatCard label="ไม่สมบูรณ์" value={summary.incompleteVisits} color="text-warning" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-center">
      <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function HisVisitTimeline({
  visits,
  summary,
  importedVns,
  importingVn,
  onImportVisit,
  syncingVn,
  onSyncVisit,
}: Props) {
  const [expandedVns, setExpandedVns] = useState<Set<string>>(new Set());

  const toggleVn = useCallback((vn: string) => {
    setExpandedVns((prev) => {
      const next = new Set(prev);
      if (next.has(vn)) next.delete(vn);
      else next.add(vn);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedVns(new Set(visits.map((v) => v.visit.vn)));
  }, [visits]);

  const collapseAll = useCallback(() => {
    setExpandedVns(new Set());
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-primary" />
          ข้อมูล Visit ({visits.length} visits)
        </h2>
        {visits.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={expandedVns.size === visits.length ? collapseAll : expandAll}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {expandedVns.size === visits.length ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}
          </Button>
        )}
      </div>

      {/* Summary stats */}
      <VisitSummaryStats summary={summary} />

      {/* Timeline */}
      {visits.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            ไม่พบข้อมูล visit
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

          <div className="space-y-1">
            {visits.map((pv) => {
              const isLocallyImported = importedVns.has(pv.visit.vn);
              const effectiveImported = pv.isAlreadyImported || isLocallyImported;

              return (
                <VisitTimelineEntry
                  key={pv.visit.vn}
                  pv={pv}
                  isExpanded={expandedVns.has(pv.visit.vn)}
                  onToggle={() => toggleVn(pv.visit.vn)}
                  isImported={effectiveImported}
                  isImporting={importingVn === pv.visit.vn}
                  onImport={(force) => onImportVisit(pv.visit.vn, force)}
                  isSyncing={syncingVn === pv.visit.vn}
                  onSync={onSyncVisit ? () => onSyncVisit(pv.visit.vn) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Z-code Detection ───────────────────────────────────────────────────────

function detectDiagnosisCodes(visit: HisVisit) {
  const codes = [
    visit.primaryDiagnosis || '',
    visit.secondaryDiagnoses || '',
  ].join(',').replace(/\./g, '').toUpperCase();
  return {
    hasZ510: /Z510/.test(codes),
    hasZ511: /Z511/.test(codes),
    hasZ515: /Z515/.test(codes),
  };
}

// ─── Single Visit Entry ─────────────────────────────────────────────────────

function VisitTimelineEntry({
  pv,
  isExpanded,
  onToggle,
  isImported,
  isImporting,
  onImport,
  isSyncing,
  onSync,
}: {
  pv: HisPreviewVisit;
  isExpanded: boolean;
  onToggle: () => void;
  isImported: boolean;
  isImporting: boolean;
  onImport: (forceIncomplete: boolean) => void;
  isSyncing?: boolean;
  onSync?: () => void;
}) {
  const { visit, isCancerRelated, completeness, hasProtocolDrugs } = pv;
  const isNonCancer = !isCancerRelated;
  const meds = visit.medications ?? [];
  const items = visit.billingItems ?? [];
  const { hasZ510, hasZ511, hasZ515 } = detectDiagnosisCodes(visit);

  // Dot color
  const dotColor = isImported
    ? 'bg-primary'
    : isNonCancer
      ? 'bg-muted-foreground/30'
      : completeness.level === 'complete'
        ? 'bg-emerald-500'
        : 'bg-amber-500';

  return (
    <div className={cn('relative pl-10', isNonCancer && 'opacity-50')}>
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-[15px] top-5 h-2.5 w-2.5 rounded-full border-2 border-background',
          dotColor,
        )}
      />

      <div className="py-2">
        {/* Header */}
        <button
          onClick={onToggle}
          className="flex items-center gap-2 w-full text-left group"
        >
          <span className="text-xs text-muted-foreground w-[80px] shrink-0 tabular-nums">
            {formatThaiDate(visit.visitDate)}
          </span>
          <CodeBadge code={visit.vn} />

          {isCancerRelated && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary/80 text-white">
              มะเร็ง
            </Badge>
          )}

          {hasZ510 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/90 text-white border-violet-500/60 gap-0.5">
              <Zap className="h-2.5 w-2.5" />
              Z510
            </Badge>
          )}
          {hasZ511 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/90 text-white border-blue-500/60 gap-0.5">
              <Syringe className="h-2.5 w-2.5" />
              Z511
            </Badge>
          )}
          {hasZ515 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-rose-500/90 text-white border-rose-500/60 gap-0.5">
              <Heart className="h-2.5 w-2.5" />
              Palliative
            </Badge>
          )}
          {hasProtocolDrugs && (
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/90 text-white border-amber-500/60 gap-0.5">
              <FlaskConical className="h-2.5 w-2.5" />
              Protocol Detected
            </Badge>
          )}

          {isImported ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              นำเข้าแล้ว
            </Badge>
          ) : isCancerRelated ? (
            <HisCompletenessBadge completeness={completeness} showScore={false} />
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              ไม่เกี่ยวกับมะเร็ง
            </Badge>
          )}

          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            <Card>
              <CardContent className="py-4 px-5 space-y-4 text-sm">
                {/* Diagnosis */}
                <div className="space-y-1.5">
                  {visit.primaryDiagnosis && (
                    <div>
                      <span className="text-xs text-muted-foreground">วินิจฉัยหลัก:</span>
                      <span className="ml-2 font-mono text-xs font-medium">
                        {visit.primaryDiagnosis}
                      </span>
                    </div>
                  )}
                  {visit.secondaryDiagnoses && (
                    <div>
                      <span className="text-xs text-muted-foreground">วินิจฉัยรอง:</span>
                      <span className="ml-2 font-mono text-xs">
                        {visit.secondaryDiagnoses}
                      </span>
                    </div>
                  )}
                </div>

                {/* HPI & Doctor notes */}
                {visit.hpi && (
                  <div>
                    <span className="text-xs text-muted-foreground">HPI:</span>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {visit.hpi}
                    </p>
                  </div>
                )}
                {visit.doctorNotes && (
                  <div>
                    <span className="text-xs text-muted-foreground">หมายเหตุแพทย์:</span>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {visit.doctorNotes}
                    </p>
                  </div>
                )}

                {/* Service fields */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <FieldRow icon={Stethoscope} label="ว.แพทย์" value={visit.physicianLicenseNo} mono />
                  <FieldRow icon={Stethoscope} label="คลินิก" value={visit.clinicCode} mono />
                  <FieldRow label="Class" value={visit.serviceClass} mono />
                  <FieldRow label="TypeServ" value={visit.serviceType} mono />
                  <FieldRow label="TypeIn" value={visit.visitType} mono />
                  <FieldRow label="TypeOut" value={visit.dischargeType} mono />
                  <FieldRow label="BillNo" value={visit.billNo} mono />
                  <FieldRow label="DayCover" value={visit.dayCover} />
                  {visit.serviceStartTime && (
                    <FieldRow label="เวลาเริ่ม" value={formatTime(visit.serviceStartTime)} />
                  )}
                  {visit.serviceEndTime && (
                    <FieldRow label="เวลาสิ้นสุด" value={formatTime(visit.serviceEndTime)} />
                  )}
                  {visit.nextAppointmentDate && (
                    <FieldRow label="นัดถัดไป" value={formatThaiDate(visit.nextAppointmentDate)} />
                  )}
                </div>

                {/* Medications */}
                <div>
                  <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                    <Pill className="h-3.5 w-3.5 text-primary" />
                    รายการยา ({meds.length})
                  </h4>
                  {meds.length > 0 ? (
                    <div className="rounded-md border divide-y">
                      {meds.map((m, i) => (
                        <div key={i} className="px-3 py-1.5 text-xs flex items-center justify-between">
                          <span>{m.medicationName}</span>
                          <span className="text-muted-foreground font-mono">
                            {m.quantity} {m.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-warning py-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      ยังไม่มีข้อมูลรายการยา
                    </div>
                  )}
                </div>

                {/* Billing items */}
                <div>
                  <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                    รายการค่ารักษา ({items.length})
                  </h4>
                  {items.length > 0 ? (
                    <div className="rounded-md border divide-y">
                      {items.slice(0, 10).map((item, i) => (
                        <div key={i} className="px-3 py-1.5 text-xs flex items-center justify-between">
                          <span className="truncate flex-1 mr-2">
                            <span className="font-mono text-muted-foreground mr-1">
                              [{item.billingGroup}]
                            </span>
                            {item.description}
                          </span>
                          <span className="text-muted-foreground tabular-nums font-mono whitespace-nowrap">
                            {item.quantity} x {item.unitPrice.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {items.length > 10 && (
                        <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                          ... อีก {items.length - 10} รายการ
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-warning py-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      ยังไม่มีข้อมูลค่ารักษา
                    </div>
                  )}
                </div>

                {/* Missing fields */}
                {completeness.missingFields.length > 0 && !isImported && (
                  <div>
                    <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      ข้อมูลที่ขาด ({completeness.missingFields.length} ช่อง)
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {completeness.missingFields.map((f) => (
                        <span
                          key={f.field}
                          className={cn(
                            'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border',
                            f.priority === 'critical' && 'bg-destructive/10 text-destructive border-destructive/20',
                            f.priority === 'high' && 'bg-warning/10 text-warning border-warning/20',
                            f.priority === 'medium' && 'bg-muted-foreground text-white border-muted-foreground/80',
                            f.priority === 'low' && 'bg-muted-foreground/70 text-white border-muted-foreground/50',
                          )}
                        >
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Import button */}
                {isCancerRelated && !isImported && (
                  <div className="flex justify-end pt-1">
                    {completeness.level === 'complete' ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1.5 bg-success hover:bg-success/90 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImport(false);
                        }}
                        disabled={isImporting}
                      >
                        {isImporting ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        นำเข้า
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 border-warning/40 text-warning hover:bg-warning/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onImport(true);
                        }}
                        disabled={isImporting}
                      >
                        {isImporting ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-warning border-t-transparent" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        นำเข้าแม้ไม่สมบูรณ์
                      </Button>
                    )}
                  </div>
                )}

                {/* Sync button — for already-imported cancer visits */}
                {isCancerRelated && isImported && onSync && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSync();
                      }}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                      {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์จาก HIS'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Field Row Helper ───────────────────────────────────────────────────────

function FieldRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn(mono && 'font-mono')}>{value}</span>
    </div>
  );
}
