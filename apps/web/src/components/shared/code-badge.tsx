import { cn } from '@/lib/utils';

interface CodeBadgeProps {
  code: string;
  className?: string;
}

export function CodeBadge({ code, className }: CodeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-primary-subtle px-2 py-0.5 font-mono text-xs font-medium text-primary',
        className,
      )}
    >
      {code}
    </span>
  );
}
