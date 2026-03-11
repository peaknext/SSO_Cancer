'use client';

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ExternalLink,
  FileArchive,
  Pill,
  Plus,
  SearchCheck,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { cn } from '@/lib/utils';
import { Visit, VisitMedication, PatientCase, TopMatch, VisitExportBatch, formatThaiDate } from './types';
import { BillingClaimRow } from './billing-claim-row';
import { AddBillingClaimForm } from './add-billing-claim-form';

function MedicationChip({ med }: { med: VisitMedication }) {
  const category = med.resolvedDrug?.drugCategory ?? '';
  const name = med.resolvedDrug?.genericName ?? med.medicationName;
  const isResolved = !!med.resolvedDrug;

  const colorClass = isResolved
    ? category === 'chemotherapy'
      ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800'
      : category === 'hormonal'
        ? 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800'
        : 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800'
    : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800';

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-2 py-0.5 ring-1 ring-inset',
      colorClass,
    )}>
      {name}
      {med.quantity && med.unit && (
        <span className="opacity-60 font-normal">{med.quantity} {med.unit}</span>
      )}
    </span>
  );
}

export function VisitTimelineEntry({
  visit,
  activeCases,
  isExpanded,
  onToggle,
  onRequestAssignCase,
  addClaimVn,
  onShowAddClaim,
  onHideAddClaim,
  onClaimAdded,
  topMatch,
  loadingMatch,
  exportBatches,
  onConfirmProtocol,
  onDeleteVisit,
}: {
  visit: Visit;
  activeCases: PatientCase[];
  isExpanded: boolean;
  onToggle: () => void;
  onRequestAssignCase: (vn: string, caseId: string) => void;
  addClaimVn: string | null;
  onShowAddClaim: () => void;
  onHideAddClaim: () => void;
  onClaimAdded: () => void;
  topMatch: TopMatch | null;
  loadingMatch: boolean;
  exportBatches: VisitExportBatch[];
  onConfirmProtocol: (match: {
    protocolId: number;
    regimenId: number | null;
    protocolCode: string;
    protocolName: string;
  }) => void;
  onDeleteVisit?: (vn: string) => void;
}) {
  const activeBillingClaims = visit.billingClaims.filter((bc) => bc.isActive);
  const caseOptions = activeCases.map((c) => ({
    value: String(c.id),
    label: `${c.caseNumber}${c.protocol ? ` — ${c.protocol.nameThai}` : ''}`,
  }));

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className={cn(
        'absolute left-[15px] top-5 h-2.5 w-2.5 rounded-full border-2 border-background',
        visit.case ? 'bg-primary' : 'bg-muted-foreground/40',
      )} />

      <div className="py-2">
        {/* Clickable header */}
        <button
          onClick={onToggle}
          className="flex items-center gap-3 w-full text-left group"
        >
          <span className="text-xs text-muted-foreground w-[80px] shrink-0 tabular-nums">
            {formatThaiDate(visit.visitDate)}
          </span>
          <CodeBadge code={visit.vn} copyable />
          {visit.case ? (
            <Badge variant="default" className="text-[10px]">
              {visit.case.caseNumber}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">ไม่มีเคส</Badge>
          )}
          {visit.confirmedProtocol ? (
            <span className="text-xs text-success hidden sm:inline">
              <CheckCircle2 className="h-3 w-3 inline mr-0.5" />
              {visit.confirmedProtocol.nameThai}
            </span>
          ) : topMatch ? (
            <span className="text-xs text-warning hidden sm:inline">
              <SearchCheck className="h-3 w-3 inline mr-0.5" />
              {topMatch.protocolName} ({topMatch.score})
            </span>
          ) : null}
          {exportBatches.length > 0 && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded px-1.5 py-0.5 shrink-0"
              title={exportBatches.map((b) => `งวด ${String(b.sessionNo).padStart(4, '0')}`).join(', ')}
            >
              <FileArchive className="h-2.5 w-2.5" />
              งวด {String(exportBatches[exportBatches.length - 1].sessionNo).padStart(4, '0')}
              {exportBatches.length > 1 && ` +${exportBatches.length - 1}`}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            {onDeleteVisit && (
              <span
                role="button"
                tabIndex={0}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
                title="ลบ visit"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteVisit(visit.vn);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.stopPropagation(); onDeleteVisit(visit.vn); }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="mt-3 ml-[80px] space-y-3">
            <Card>
              <CardContent className="py-4 px-5 space-y-3 text-sm">
                {/* Primary diagnosis */}
                {visit.primaryDiagnosis && (
                  <div>
                    <span className="text-xs text-muted-foreground">วินิจฉัยหลัก:</span>
                    <span className="ml-2 font-mono text-xs font-medium">{visit.primaryDiagnosis}</span>
                  </div>
                )}

                {/* Secondary diagnoses */}
                {visit.secondaryDiagnoses && (
                  <div>
                    <span className="text-xs text-muted-foreground">วินิจฉัยรอง:</span>
                    <span className="ml-2 font-mono text-xs">{visit.secondaryDiagnoses}</span>
                  </div>
                )}

                {/* Resolved cancer site */}
                {visit.resolvedSite && (
                  <div>
                    <span className="text-xs text-muted-foreground">ตำแหน่งมะเร็ง:</span>
                    <span className="ml-2">{visit.resolvedSite.nameThai}</span>
                  </div>
                )}

                {/* HPI */}
                {visit.hpi && (
                  <div>
                    <span className="text-xs text-muted-foreground">HPI:</span>
                    <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed line-clamp-3">
                      {visit.hpi}
                    </p>
                  </div>
                )}

                {/* Doctor notes */}
                {visit.doctorNotes && (
                  <div>
                    <span className="text-xs text-muted-foreground">หมายเหตุแพทย์:</span>
                    <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed line-clamp-3">
                      {visit.doctorNotes}
                    </p>
                  </div>
                )}

                {/* Medications */}
                {visit.medications && visit.medications.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Pill className="h-3.5 w-3.5" />
                        รายการยา ({visit.medications.length})
                      </span>
                      <Link
                        href={`/protocol-analysis?vn=${visit.vn}&hn=${visit.hn}`}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        ดูการวิเคราะห์
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {visit.medications.map((med) => (
                        <MedicationChip key={med.id} med={med} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Protocol — confirmed or best match */}
                <div className="pt-2 border-t border-border/50">
                  {(!visit.medications || visit.medications.length === 0) && (
                    <div className="flex justify-end mb-1">
                      <Link
                        href={`/protocol-analysis?vn=${visit.vn}&hn=${visit.hn}`}
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        ดูการวิเคราะห์
                      </Link>
                    </div>
                  )}
                  {visit.confirmedProtocol ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                        <Badge variant="success" className="text-[10px] gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          ยืนยันแล้ว
                        </Badge>
                        <span className="font-mono text-xs font-semibold">{visit.confirmedProtocol.protocolCode}</span>
                        <span className="text-xs">{visit.confirmedProtocol.nameThai}</span>
                      </div>
                      {visit.confirmedRegimen && (
                        <div className="flex items-center gap-2 ml-15">
                          <span className="text-xs text-muted-foreground">สูตรยา:</span>
                          <span className="font-mono text-xs">{visit.confirmedRegimen.regimenCode}</span>
                          <span className="text-xs text-muted-foreground">{visit.confirmedRegimen.regimenName}</span>
                        </div>
                      )}
                      {visit.confirmedAt && (
                        <p className="text-[10px] text-muted-foreground ml-15">
                          ยืนยันเมื่อ {formatThaiDate(visit.confirmedAt)}
                        </p>
                      )}
                    </div>
                  ) : topMatch ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                        <Badge variant="warning" className="text-[10px] gap-0.5">
                          <SearchCheck className="h-2.5 w-2.5" />
                          แนะนำ
                        </Badge>
                        <span className="font-mono text-xs font-semibold">{topMatch.protocolCode}</span>
                        <span className="text-xs">{topMatch.protocolName}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">({topMatch.score} คะแนน)</span>
                        {topMatch.protocolId !== 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 px-2 text-[10px] gap-1 cursor-pointer text-primary border-primary/30 hover:bg-primary/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfirmProtocol({
                                protocolId: topMatch.protocolId,
                                regimenId: topMatch.regimenId,
                                protocolCode: topMatch.protocolCode,
                                protocolName: topMatch.protocolName,
                              });
                            }}
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            คลิกเพื่อยืนยัน
                          </Button>
                        )}
                      </div>
                      {topMatch.regimenCode && (
                        <div className="flex items-center gap-2 ml-15">
                          <span className="text-xs text-muted-foreground">สูตรยา:</span>
                          <span className="font-mono text-xs">{topMatch.regimenCode}</span>
                          {topMatch.regimenName && (
                            <span className="text-xs text-muted-foreground">{topMatch.regimenName}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : loadingMatch ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs text-muted-foreground">กำลังวิเคราะห์...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">โปรโตคอล:</span>
                      <span className="text-xs text-muted-foreground italic">ยังไม่ได้ยืนยัน</span>
                    </div>
                  )}
                </div>

                {/* Case assignment */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">เคส:</span>
                    <Select
                      value={visit.case ? String(visit.case.id) : ''}
                      onChange={(v) => onRequestAssignCase(visit.vn, v)}
                      options={caseOptions}
                      placeholder="ไม่มีเคส"
                      className="w-full max-w-xs"
                    />
                  </div>
                </div>

                {/* SSOP Export Batches */}
                {exportBatches.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                      <FileArchive className="h-3.5 w-3.5" />
                      ส่งออก SSOP แล้ว
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {exportBatches.map((b) => (
                        <span
                          key={b.batchId}
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded px-1.5 py-0.5"
                        >
                          งวด {String(b.sessionNo).padStart(4, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Billing Claims */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      การเรียกเก็บ ({activeBillingClaims.length})
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowAddClaim();
                      }}
                    >
                      <Plus className="h-3 w-3 mr-0.5" />
                      เพิ่มรอบ
                    </Button>
                  </div>

                  {activeBillingClaims.length > 0 && (
                    <div className="space-y-1.5">
                      {activeBillingClaims.map((bc) => (
                        <BillingClaimRow
                          key={bc.id}
                          claim={bc}
                          vn={visit.vn}
                          onUpdated={onClaimAdded}
                        />
                      ))}
                    </div>
                  )}

                  {/* Inline add claim form */}
                  {addClaimVn === visit.vn && (
                    <AddBillingClaimForm
                      vn={visit.vn}
                      nextRound={(activeBillingClaims.length > 0
                        ? Math.max(...activeBillingClaims.map((bc) => bc.roundNumber)) + 1
                        : 1)}
                      onCancel={onHideAddClaim}
                      onCreated={() => {
                        onHideAddClaim();
                        onClaimAdded();
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
