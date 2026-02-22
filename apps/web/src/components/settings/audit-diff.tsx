'use client';

import { cn } from '@/lib/utils';

interface AuditDiffProps {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}

export function AuditDiff({ oldValues, newValues }: AuditDiffProps) {
  // Collect all unique keys
  const allKeys = new Set<string>();
  if (oldValues) Object.keys(oldValues).forEach((k) => allKeys.add(k));
  if (newValues) Object.keys(newValues).forEach((k) => allKeys.add(k));

  if (allKeys.size === 0) {
    return <p className="text-sm text-muted-foreground">ไม่มีข้อมูลการเปลี่ยนแปลง</p>;
  }

  const keys = Array.from(allKeys).sort();

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        การเปลี่ยนแปลง ({keys.length} fields)
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Old values */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-3 py-2 bg-destructive-subtle text-xs font-medium text-destructive border-b">
            ค่าเดิม (Before)
          </div>
          <div className="p-3 space-y-1.5">
            {keys.map((key) => {
              const oldVal = oldValues?.[key];
              const newVal = newValues?.[key];
              const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
              return (
                <div key={key} className="flex items-baseline gap-2 text-xs">
                  <span className="text-muted-foreground w-32 shrink-0 font-mono truncate">{key}:</span>
                  <span
                    className={cn(
                      'font-mono break-all',
                      changed ? 'bg-destructive/10 text-destructive px-1 rounded' : 'text-foreground',
                    )}
                  >
                    {formatValue(oldVal)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* New values */}
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-3 py-2 bg-success-subtle text-xs font-medium text-success border-b">
            ค่าใหม่ (After)
          </div>
          <div className="p-3 space-y-1.5">
            {keys.map((key) => {
              const oldVal = oldValues?.[key];
              const newVal = newValues?.[key];
              const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
              return (
                <div key={key} className="flex items-baseline gap-2 text-xs">
                  <span className="text-muted-foreground w-32 shrink-0 font-mono truncate">{key}:</span>
                  <span
                    className={cn(
                      'font-mono break-all',
                      changed ? 'bg-success/10 text-success px-1 rounded' : 'text-foreground',
                    )}
                  >
                    {formatValue(newVal)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(null)';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
