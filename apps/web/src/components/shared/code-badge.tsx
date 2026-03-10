'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CodeBadgeProps {
  code: string;
  className?: string;
  copyable?: boolean;
}

export function CodeBadge({ code, className, copyable }: CodeBadgeProps) {
  if (copyable) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(code).then(() => toast.success('คัดลอกแล้ว'));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            navigator.clipboard.writeText(code).then(() => toast.success('คัดลอกแล้ว'));
          }
        }}
        className={cn(
          'inline-flex items-center gap-1 rounded-md bg-primary/12 backdrop-blur-sm border border-primary/15 px-2 py-0.5 font-mono text-xs font-medium text-primary cursor-pointer hover:bg-primary/20 transition-colors group',
          className,
        )}
      >
        {code}
        <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-primary/12 backdrop-blur-sm border border-primary/15 px-2 py-0.5 font-mono text-xs font-medium text-primary',
        className,
      )}
    >
      {code}
    </span>
  );
}
