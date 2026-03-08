'use client';

import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HelpButtonProps {
  section: string;
  className?: string;
}

export function HelpButton({ section, className }: HelpButtonProps) {
  return (
    <Link
      href={`/user-manual#${section}`}
      title="ดูคู่มือใช้งาน"
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1 text-muted-foreground/60',
        'hover:text-primary hover:bg-primary/10 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <HelpCircle className="h-4 w-4" />
    </Link>
  );
}
