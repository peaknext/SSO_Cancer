import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary-subtle text-primary',
        secondary: 'bg-foreground/[0.06] text-foreground/70 border border-foreground/[0.08]',
        destructive: 'bg-destructive-subtle text-destructive',
        warning: 'bg-warning-subtle text-warning',
        success: 'bg-success-subtle text-success',
        accent: 'bg-accent-subtle text-accent',
        outline: 'border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
