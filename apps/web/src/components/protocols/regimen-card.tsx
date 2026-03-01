'use client';

import { useState } from 'react';
import { ChevronDown, Star, Pill } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { PriceBadge } from '@/components/shared/price-badge';
import { cn } from '@/lib/utils';

interface DrugTradeName {
  id: number;
  tradeName: string;
  drugCode: string;
  dosageForm: string | null;
  strength: string | null;
  unitPrice: number | null;
  isActive: boolean;
}

interface Drug {
  id: number;
  drugCode?: string;
  genericName: string;
  drugCategory: string;
  tradeNames: DrugTradeName[];
}

interface RegimenDrug {
  id: number;
  dosePerCycle: string | null;
  route: string | null;
  daySchedule: string | null;
  notes: string | null;
  drug: Drug;
}

interface Regimen {
  id: number;
  regimenCode: string;
  regimenName: string;
  regimenType: string | null;
  cycleDays: number | null;
  maxCycles: number | null;
  regimenDrugs: RegimenDrug[];
}

interface ProtocolRegimen {
  id: number;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  notes: string | null;
  regimen: Regimen;
}

interface RegimenCardProps {
  protocolRegimen: ProtocolRegimen;
}

export function RegimenCard({ protocolRegimen }: RegimenCardProps) {
  const { regimen, lineOfTherapy, isPreferred, notes } = protocolRegimen;
  const [expanded, setExpanded] = useState(isPreferred);

  return (
    <Card className={cn(isPreferred && 'border-l-[3px] border-l-primary')}>
      <CardHeader
        className="cursor-pointer select-none p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <CodeBadge code={regimen.regimenCode} />
            <span className="font-medium text-sm text-foreground">{regimen.regimenName}</span>
            {isPreferred && (
              <Badge variant="warning" className="gap-1">
                <Star className="h-3 w-3" />
                Preferred
              </Badge>
            )}
            {lineOfTherapy != null && (
              <Badge variant="secondary">Line {lineOfTherapy}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
              {regimen.cycleDays && (
                <span>รอบ: {regimen.cycleDays} วัน</span>
              )}
              {regimen.maxCycles && (
                <span>สูงสุด: {regimen.maxCycles} รอบ</span>
              )}
              <span>{regimen.regimenDrugs.length} ยา</span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-4">
          {/* Protocol-regimen notes */}
          {notes && (
            <div className="mb-3 rounded-md bg-muted/10 border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium">หมายเหตุ:</span> {notes}
            </div>
          )}
          {/* Drug table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10 dark:bg-white/5 border-b border-glass-border-subtle">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">ยา</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">ขนาดยา</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">วิธีให้</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">วันที่ให้</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {regimen.regimenDrugs.map((rd) => (
                  <DrugRow key={rd.id} regimenDrug={rd} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cycle info on mobile */}
          <div className="sm:hidden mt-3 flex gap-4 text-xs text-muted-foreground">
            {regimen.cycleDays && (
              <span>รอบ: {regimen.cycleDays} วัน</span>
            )}
            {regimen.maxCycles && (
              <span>สูงสุด: {regimen.maxCycles} รอบ</span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DrugRow({ regimenDrug }: { regimenDrug: RegimenDrug }) {
  const [showTradeNames, setShowTradeNames] = useState(false);
  const { drug } = regimenDrug;
  const hasTradeNames = drug.tradeNames && drug.tradeNames.length > 0;

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Pill className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <button
                onClick={hasTradeNames ? () => setShowTradeNames(!showTradeNames) : undefined}
                className={cn(
                  'font-medium text-foreground text-left',
                  hasTradeNames && 'hover:text-primary cursor-pointer',
                )}
              >
                {drug.genericName}
              </button>
              {drug.drugCode && (
                <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                  {drug.drugCode}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 tabular-nums">
          {regimenDrug.dosePerCycle ? (
            <span>{regimenDrug.dosePerCycle}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          {regimenDrug.route ? (
            <Badge variant="secondary" className="text-[11px]">{regimenDrug.route}</Badge>
          ) : '—'}
        </td>
        <td className="px-3 py-2.5 font-mono text-xs">
          {regimenDrug.daySchedule || '—'}
        </td>
        <td className="px-3 py-2.5 text-xs text-muted-foreground">
          {regimenDrug.notes || '—'}
        </td>
      </tr>

      {/* Trade names accordion */}
      {showTradeNames && hasTradeNames && (
        <tr>
          <td colSpan={5} className="bg-white/10 dark:bg-white/5 px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              ชื่อการค้า SSO ({drug.tradeNames.length} รายการ)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {drug.tradeNames.filter(tn => tn.isActive).map((tn) => (
                <div
                  key={tn.id}
                  className="flex items-center justify-between rounded-md border border-glass-border-subtle bg-white/40 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{tn.tradeName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {tn.drugCode && <span className="font-mono">{tn.drugCode}</span>}
                      {tn.strength && <span>{tn.strength}</span>}
                      {tn.dosageForm && <span>{tn.dosageForm}</span>}
                    </div>
                  </div>
                  <PriceBadge price={tn.unitPrice} className="ml-3 shrink-0" />
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
