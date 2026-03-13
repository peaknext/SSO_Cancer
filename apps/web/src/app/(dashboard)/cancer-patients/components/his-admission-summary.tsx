'use client';

import { BedDouble, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IpdPreviewResult {
  patient: { hn: string; citizenId: string; fullName: string };
  existingPatientId: number | null;
  totalAdmissions: number;
  cancerRelatedAdmissions: number;
  alreadyImportedAns: string[];
  newAdmissionsToImport: number;
}

interface HisAdmissionSummaryProps {
  preview: IpdPreviewResult;
  onImportAll: () => void;
  importing: boolean;
  compact?: boolean;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function IpdStatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-blue-200/50 dark:border-blue-800/30 bg-white/60 dark:bg-blue-950/30 px-3 py-2 text-center">
      <p className={cn('text-lg font-bold tabular-nums', color || 'text-foreground')}>{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function HisAdmissionSummary({
  preview,
  onImportAll,
  importing,
  compact,
}: HisAdmissionSummaryProps) {
  const hasNew = preview.newAdmissionsToImport > 0;
  const hasImported = preview.alreadyImportedAns.length > 0;

  return (
    <div className={cn(
      'rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20',
      compact ? 'p-3 space-y-3' : 'p-4 space-y-4',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <BedDouble className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className={cn(
            'font-semibold text-foreground',
            compact ? 'text-xs' : 'text-sm',
          )}>
            Admission ผู้ป่วยใน
          </span>
        </div>
        {preview.totalAdmissions === 0 && (
          <Badge variant="secondary" className="text-[10px]">ไม่พบข้อมูล</Badge>
        )}
      </div>

      {/* Summary stat cards */}
      {preview.totalAdmissions > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <IpdStatCard label="ทั้งหมด" value={preview.totalAdmissions} />
            <IpdStatCard
              label="เกี่ยวกับมะเร็ง"
              value={preview.cancerRelatedAdmissions}
              color="text-blue-600 dark:text-blue-400"
            />
            <IpdStatCard
              label="นำเข้าแล้ว"
              value={preview.alreadyImportedAns.length}
              color="text-muted-foreground"
            />
            <IpdStatCard
              label="นำเข้าได้"
              value={preview.newAdmissionsToImport}
              color={hasNew ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}
            />
          </div>

          {/* Already-imported ANs */}
          {hasImported && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">AN ที่นำเข้าแล้ว:</p>
              <div className="flex flex-wrap gap-1">
                {preview.alreadyImportedAns.map((an) => (
                  <span
                    key={an}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[10px] font-mono text-blue-700 dark:text-blue-300"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {an}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Import button */}
          {hasNew && (
            <Button
              onClick={onImportAll}
              disabled={importing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  กำลังนำเข้า...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  นำเข้า IPD ทั้งหมด ({preview.newAdmissionsToImport} admission)
                </>
              )}
            </Button>
          )}

          {/* All imported state */}
          {!hasNew && preview.cancerRelatedAdmissions > 0 && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>นำเข้า admission ที่เกี่ยวกับมะเร็งทั้งหมดแล้ว</span>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {preview.totalAdmissions === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          ไม่พบ admission ผู้ป่วยในในช่วงเวลาที่กำหนด
        </p>
      )}
    </div>
  );
}
