import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  active: boolean;
  className?: string;
}

export function StatusBadge({ active, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        active
          ? 'bg-success-subtle text-success'
          : 'bg-foreground/[0.06] text-foreground/60 border border-foreground/[0.08]',
        className,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-success' : 'bg-foreground/40',
        )}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
