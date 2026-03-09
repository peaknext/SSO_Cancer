'use client';

import { useMemo } from 'react';
import { CircleCheckBig, Clock, XCircle, CreditCard } from 'lucide-react';
import { Visit } from './types';

export function BillingOverviewPanel({ visits }: { visits: Visit[] }) {
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let noBilling = 0;

    for (const visit of visits) {
      const active = visit.billingClaims.filter((bc) => bc.isActive);
      if (active.length === 0) {
        noBilling++;
        continue;
      }
      const latest = active.reduce((a, b) =>
        b.roundNumber > a.roundNumber ? b : a,
      );
      if (latest.status === 'APPROVED') approved++;
      else if (latest.status === 'REJECTED') rejected++;
      else pending++;
    }

    return { pending, approved, rejected, noBilling };
  }, [visits]);

  if (visits.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
          <CreditCard className="h-3.5 w-3.5" />
          สรุปการเรียกเก็บ
        </span>
        <div className="h-3.5 w-px bg-border/60 hidden sm:block" />

        <div className="flex items-center gap-2.5 flex-wrap">
          {stats.approved > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <CircleCheckBig className="h-3.5 w-3.5" />
              {stats.approved} ผ่าน
            </span>
          )}
          {stats.pending > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              {stats.pending} รอผล
            </span>
          )}
          {stats.rejected > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              {stats.rejected} ไม่ผ่าน
            </span>
          )}
          {stats.noBilling > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {stats.noBilling} ยังไม่เรียกเก็บ
            </span>
          )}
        </div>

        <div className="ml-auto hidden sm:flex items-center gap-1">
          {/* Proportional bar */}
          {visits.length > 0 && (
            <div className="flex h-1.5 w-24 rounded-full overflow-hidden gap-px">
              {stats.approved > 0 && (
                <div
                  className="bg-emerald-500 dark:bg-emerald-400 rounded-l-full"
                  style={{ flex: stats.approved }}
                />
              )}
              {stats.pending > 0 && (
                <div
                  className="bg-amber-400 dark:bg-amber-400"
                  style={{ flex: stats.pending }}
                />
              )}
              {stats.rejected > 0 && (
                <div
                  className="bg-rose-500 dark:bg-rose-400"
                  style={{ flex: stats.rejected }}
                />
              )}
              {stats.noBilling > 0 && (
                <div
                  className="bg-muted-foreground/20 rounded-r-full"
                  style={{ flex: stats.noBilling }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
