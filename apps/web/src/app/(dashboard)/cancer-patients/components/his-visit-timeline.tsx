'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CodeBadge } from '@/components/shared/code-badge';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
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
  aipnCode?: string;
  tmtCode?: string;
  stdCode?: string;
  billingGroup: string;
  description: string;
  dfsText?: string;
  quantity: number;
  unitPrice: number;
  claimUnitPrice?: number;
  claimCategory?: string;
  packsize?: string;
  sigCode?: string;
  sigText?: string;
  supplyDuration?: string;
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

export interface HisPreviewVisit {
  visit: HisVisit;
  isCancerRelated: boolean;
  isAlreadyImported: boolean;
  completeness: VisitCompleteness;
  hasProtocolDrugs: boolean;
}

export interface SummaryStats {
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
  // Batch action props
  onImportAll?: (options?: { from?: string; to?: string }) => void;
  importingAll?: boolean;
  onBatchSync?: () => void;
  batchSyncing?: boolean;
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
  onImportAll,
  importingAll,
  onBatchSync,
  batchSyncing,
}: Props) {
  const [expandedVns, setExpandedVns] = useState<Set<string>>(new Set());

  // Filter state
  const [cancerOnly, setCancerOnly] = useState(true);
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filtered visits
  const filteredVisits = useMemo(() => {
    let result = visits;
    if (cancerOnly) {
      result = result.filter((pv) => pv.isCancerRelated);
    }
    if (dateFilterEnabled && dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((pv) => {
        const vd = new Date(pv.visit.visitDate);
        return vd >= from && vd <= to;
      });
    }
    return result;
  }, [visits, cancerOnly, dateFilterEnabled, dateFrom, dateTo]);

  // Recalculate summary from filtered visits
  const filteredSummary = useMemo<SummaryStats>(() => {
    const stats: SummaryStats = {
      totalVisits: filteredVisits.length,
      cancerRelatedVisits: 0,
      alreadyImported: 0,
      newImportable: 0,
      completeVisits: 0,
      incompleteVisits: 0,
    };
    for (const pv of filteredVisits) {
      if (pv.isCancerRelated) stats.cancerRelatedVisits++;
      const isImported = pv.isAlreadyImported || importedVns.has(pv.visit.vn);
      if (isImported) {
        stats.alreadyImported++;
      } else if (pv.isCancerRelated) {
        stats.newImportable++;
      }
      if (pv.completeness.level === 'complete') stats.completeVisits++;
      else stats.incompleteVisits++;
    }
    return stats;
  }, [filteredVisits, importedVns]);

  const isFiltered = cancerOnly || (dateFilterEnabled && dateFrom && dateTo);

  const toggleVn = useCallback((vn: string) => {
    setExpandedVns((prev) => {
      const next = new Set(prev);
      if (next.has(vn)) next.delete(vn);
      else next.add(vn);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedVns(new Set(filteredVisits.map((v) => v.visit.vn)));
  }, [filteredVisits]);

  const collapseAll = useCallback(() => {
    setExpandedVns(new Set());
  }, []);

  const handleImportAll = useCallback(() => {
    if (!onImportAll) return;
    if (dateFilterEnabled && dateFrom && dateTo) {
      onImportAll({ from: dateFrom, to: dateTo });
    } else {
      onImportAll();
    }
  }, [onImportAll, dateFilterEnabled, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-primary" />
          ข้อมูล Visit ({visits.length} visits)
        </h2>
        {filteredVisits.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={expandedVns.size === filteredVisits.length ? collapseAll : expandAll}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {expandedVns.size === filteredVisits.length ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}
          </Button>
        )}
      </div>

      {/* Summary stats */}
      <VisitSummaryStats summary={isFiltered ? filteredSummary : summary} />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-dashed border-border/80 bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Filter className="h-3 w-3" />
          ตัวกรอง
        </div>

        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={cancerOnly}
            onChange={(e) => setCancerOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs">เฉพาะ visit มะเร็ง</span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dateFilterEnabled}
              onChange={(e) => setDateFilterEnabled(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs">เฉพาะช่วงเวลา</span>
          </label>
          {dateFilterEnabled && (
            <div className="flex items-center gap-1.5">
              <ThaiDatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="ตั้งแต่"
                className="w-32 h-7 text-xs"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <ThaiDatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="ถึง"
                className="w-32 h-7 text-xs"
              />
            </div>
          )}
        </div>

        {isFiltered && filteredVisits.length !== visits.length && (
          <span className="text-xs text-muted-foreground ml-auto">
            แสดง {filteredVisits.length}/{visits.length}
          </span>
        )}
      </div>

      {/* Batch action buttons */}
      {(onImportAll || onBatchSync) && (
        <div className="flex items-center gap-2">
          {onImportAll && filteredSummary.newImportable > 0 && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-success hover:bg-success/90 text-white"
              onClick={handleImportAll}
              disabled={importingAll || importingVn !== null}
            >
              {importingAll ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              นำเข้าทั้งหมด ({filteredSummary.newImportable})
            </Button>
          )}
          {onBatchSync && filteredSummary.alreadyImported > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={onBatchSync}
              disabled={batchSyncing || syncingVn !== null}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', batchSyncing && 'animate-spin')} />
              {batchSyncing ? 'กำลังซิงค์...' : `ซิงค์ทั้งหมด (${filteredSummary.alreadyImported})`}
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      {filteredVisits.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {isFiltered && visits.length > 0
              ? 'ไม่พบ visit ที่ตรงกับตัวกรอง'
              : 'ไม่พบข้อมูล visit'}
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

          <div className="space-y-1">
            {filteredVisits.map((pv) => {
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

                {/* Billing items — SSOP-like detail */}
                <BillingItemsTable items={items} />

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

// ─── Billing Group Labels ────────────────────────────────────────────────────

const BILLING_GROUP_LABELS: Record<string, string> = {
  '1': 'ค่าห้อง/อาหาร',
  '2': 'อุปกรณ์การแพทย์',
  '3': 'ค่ายา',
  '4': 'เวชภัณฑ์',
  '5': 'บริการโลหิต',
  '6': 'วินิจฉัยเทคนิค',
  '7': 'ห้องปฏิบัติการ',
  '8': 'วินิจฉัยอื่น',
  '9': 'บริการอื่น',
  '10': 'เวชภัณฑ์อื่น',
  '11': 'ทันตกรรม',
  '12': 'ผู้ป่วยนอก',
  '13': 'กายภาพ',
  '14': 'แพทย์แผนไทย',
  '15': 'หอผู้ป่วย',
  '16': 'อื่นๆ',
};

const BILLING_GROUP_COLORS: Record<string, string> = {
  '3': 'bg-violet-600 text-white border-violet-700',
  '7': 'bg-sky-600 text-white border-sky-700',
  '8': 'bg-cyan-600 text-white border-cyan-700',
  '12': 'bg-emerald-600 text-white border-emerald-700',
  '16': 'bg-amber-600 text-white border-amber-700',
};

function getBillingGroupColor(group: string) {
  return BILLING_GROUP_COLORS[group] || 'bg-gray-600 text-white border-gray-700';
}

// ─── Billing Items Table (SSOP-like) ────────────────────────────────────────

function BillingItemsTable({ items }: { items: HisBillingItem[] }) {
  const [showAll, setShowAll] = useState(false);

  // Group items by billingGroup
  const grouped = items.reduce<Record<string, HisBillingItem[]>>((acc, item) => {
    const g = item.billingGroup || '16';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b));
  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const totalClaim = items.reduce((sum, i) => sum + i.quantity * (i.claimUnitPrice ?? i.unitPrice), 0);

  const visibleItems = showAll ? items : items.slice(0, 15);
  const hasMore = items.length > 15;

  return (
    <div>
      <h4 className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
        <Receipt className="h-3.5 w-3.5 text-primary" />
        รายการค่ารักษา ({items.length})
        {items.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-muted-foreground tabular-nums">
            รวม {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
            {totalClaim !== totalAmount && (
              <span className="ml-1.5 text-primary">
                เบิก {totalClaim.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
              </span>
            )}
          </span>
        )}
      </h4>
      {items.length > 0 ? (
        <div className="rounded-md border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[32px_60px_1fr_55px_70px_70px] gap-0 bg-primary px-2 py-1 text-[10px] text-white font-medium border-b">
            <span>กลุ่ม</span>
            <span>รหัส</span>
            <span>รายการ</span>
            <span className="text-right">จำนวน</span>
            <span className="text-right">ราคา</span>
            <span className="text-right">เบิก</span>
          </div>
          {/* Items */}
          <div className="divide-y">
            {(showAll ? groupKeys : null)
              ? groupKeys.map((gk) => (
                  <div key={gk}>
                    {/* Group header */}
                    <div className="bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                      <span className={cn(
                        'inline-flex items-center rounded px-1 py-0 text-[9px] font-bold border',
                        getBillingGroupColor(gk),
                      )}>
                        {gk}
                      </span>
                      {BILLING_GROUP_LABELS[gk] || `กลุ่ม ${gk}`}
                      <span className="ml-auto tabular-nums">
                        ({grouped[gk].length})
                      </span>
                    </div>
                    {grouped[gk].map((item, i) => (
                      <BillingItemRow key={`${gk}-${i}`} item={item} />
                    ))}
                  </div>
                ))
              : visibleItems.map((item, i) => (
                  <BillingItemRow key={i} item={item} />
                ))}
          </div>
          {/* Show more / less */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full px-3 py-1.5 text-[10px] text-primary hover:bg-primary/5 transition-colors border-t font-medium"
            >
              {showAll
                ? 'ยุบรายการ'
                : `แสดงทั้งหมด ${items.length} รายการ (จัดกลุ่มตามหมวด)`}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-warning py-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          ยังไม่มีข้อมูลค่ารักษา
        </div>
      )}
    </div>
  );
}

function BillingItemRow({ item }: { item: HisBillingItem }) {
  const isDrug = item.billingGroup === '3';
  const desc = item.description || item.dfsText || '-';
  const drugCode = item.tmtCode || item.aipnCode || item.stdCode || item.hospitalCode;
  const amount = item.quantity * item.unitPrice;
  const claimAmount = item.quantity * (item.claimUnitPrice ?? item.unitPrice);

  return (
    <div className="group">
      <div className="grid grid-cols-[32px_60px_1fr_55px_70px_70px] gap-0 px-2 py-1 text-[11px] items-start hover:bg-muted/20">
        <span className={cn(
          'inline-flex items-center justify-center rounded px-0 py-0 text-[9px] font-bold border w-5 h-4 mt-0.5',
          getBillingGroupColor(item.billingGroup),
        )}>
          {item.billingGroup}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground truncate mt-0.5" title={drugCode}>
          {drugCode?.slice(-7) || '-'}
        </span>
        <span className="truncate pr-1" title={desc}>
          {desc}
        </span>
        <span className="text-right font-mono text-[10px] tabular-nums text-muted-foreground mt-0.5">
          {item.quantity}
        </span>
        <span className="text-right font-mono text-[10px] tabular-nums mt-0.5">
          {amount.toLocaleString()}
        </span>
        <span className={cn(
          'text-right font-mono text-[10px] tabular-nums mt-0.5',
          claimAmount !== amount ? 'text-primary font-medium' : 'text-muted-foreground',
        )}>
          {claimAmount.toLocaleString()}
        </span>
      </div>
      {/* Drug detail row — sigText, packsize */}
      {isDrug && (item.sigText || item.packsize) && (
        <div className="px-2 pb-1 pl-[94px] text-[10px] text-muted-foreground leading-tight">
          {item.sigText && <span>{item.sigText}</span>}
          {item.packsize && (
            <span className="ml-2 font-mono">pack: {item.packsize}</span>
          )}
        </div>
      )}
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
