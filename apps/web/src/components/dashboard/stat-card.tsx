'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor?: string;
  suffix?: string;
  subtitle?: string;
  subtitleHighlight?: string;
}

export function StatCard({
  label,
  value,
  icon,
  accentColor = 'bg-primary',
  suffix,
  subtitle,
  subtitleHighlight,
}: StatCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const duration = 600;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className="relative rounded-xl glass glass-noise glass-shine p-5 overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] z-10', accentColor)} />
      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {display.toLocaleString('th-TH')}
            {suffix && (
              <span className="text-base font-normal text-muted-foreground ml-1">
                {suffix}
              </span>
            )}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {subtitle}
              {subtitleHighlight && (
                <span className="ml-1.5 font-semibold text-primary">
                  {subtitleHighlight}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 dark:bg-white/8 text-muted shrink-0 relative z-10">
          {icon}
        </div>
      </div>
    </div>
  );
}
