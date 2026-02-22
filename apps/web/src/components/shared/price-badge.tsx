import { cn } from '@/lib/utils';

interface PriceBadgeProps {
  price: number | null | undefined;
  unit?: string;
  className?: string;
}

export function PriceBadge({ price, unit = '฿', className }: PriceBadgeProps) {
  if (price == null) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs text-warning',
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        ไม่มีราคา
      </span>
    );
  }

  return (
    <span
      className={cn(
        'tabular-nums font-mono text-sm text-foreground',
        className,
      )}
    >
      {unit}
      {price.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
