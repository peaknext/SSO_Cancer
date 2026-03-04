'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export type CompletenessLevel = 'complete' | 'incomplete' | 'minimal';

export interface FieldCompleteness {
  field: string;
  label: string;
  present: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface VisitCompleteness {
  level: CompletenessLevel;
  score: number;
  missingFields: FieldCompleteness[];
}

interface Props {
  completeness: VisitCompleteness;
  showScore?: boolean;
  className?: string;
}

export function HisCompletenessBadge({ completeness, showScore = true, className }: Props) {
  const { level, score, missingFields } = completeness;

  if (level === 'complete') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
          'bg-success/12 text-success border border-success/20',
          className,
        )}
        title="ข้อมูลครบถ้วน"
      >
        <CheckCircle2 className="h-3 w-3" />
        ครบถ้วน{showScore && ` ${score}%`}
      </span>
    );
  }

  if (level === 'incomplete') {
    const missingCount = missingFields.length;
    const tooltip = missingFields.map((f) => `${f.label} (${f.priority})`).join('\n');
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
          'bg-warning/12 text-warning border border-warning/20',
          className,
        )}
        title={tooltip}
      >
        <AlertTriangle className="h-3 w-3" />
        ไม่สมบูรณ์{showScore && ` ${score}%`} ({missingCount} ช่อง)
      </span>
    );
  }

  // minimal
  const criticalMissing = missingFields.filter((f) => f.priority === 'critical');
  const tooltip = criticalMissing.map((f) => f.label).join(', ');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
        'bg-destructive/12 text-destructive border border-destructive/20',
        className,
      )}
      title={`ขาดข้อมูลสำคัญ: ${tooltip}`}
    >
      <AlertCircle className="h-3 w-3" />
      ขาดข้อมูลสำคัญ
    </span>
  );
}
