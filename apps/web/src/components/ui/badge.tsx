import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary border border-primary/20',
        secondary: 'bg-foreground/[0.06] text-foreground/70 border border-foreground/[0.10]',
        destructive: 'bg-destructive/15 text-destructive border border-destructive/20',
        warning: 'bg-warning/15 text-warning border border-warning/20',
        success: 'bg-success/15 text-success border border-success/20',
        accent: 'bg-accent/15 text-accent border border-accent/20',
        outline: 'border border-glass-border text-foreground',
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
