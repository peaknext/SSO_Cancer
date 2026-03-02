'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type CardTheme = 'teal' | 'emerald' | 'amber' | 'orange' | 'rose' | 'violet';

const THEME_STYLES: Record<CardTheme, { iconBg: string; iconText: string }> = {
  teal: {
    iconBg: 'bg-teal-50 dark:bg-teal-900/30',
    iconText: 'text-teal-600 dark:text-teal-400',
  },
  emerald: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
  orange: {
    iconBg: 'bg-orange-50 dark:bg-orange-900/30',
    iconText: 'text-orange-600 dark:text-orange-400',
  },
  rose: {
    iconBg: 'bg-rose-50 dark:bg-rose-900/30',
    iconText: 'text-rose-600 dark:text-rose-400',
  },
  violet: {
    iconBg: 'bg-violet-50 dark:bg-violet-900/30',
    iconText: 'text-violet-600 dark:text-violet-400',
  },
};

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  theme?: CardTheme;
  suffix?: string;
  subtitle?: string;
  subtitleHighlight?: string;
}

export function StatCard({
  label,
  value,
  icon,
  theme = 'teal',
  suffix,
  subtitle,
  subtitleHighlight,
}: StatCardProps) {
  const [display, setDisplay] = useState(0);
  const styles = THEME_STYLES[theme];

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
    <div className="group relative rounded-xl glass glass-noise p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground leading-tight">
            {label}
          </p>
          <p className="mt-2.5 text-[28px] font-bold tabular-nums leading-none text-foreground tracking-tight font-heading">
            {display.toLocaleString('th-TH')}
          </p>
          {suffix && (
            <p className="mt-1 text-xs text-muted-foreground">{suffix}</p>
          )}
          {subtitle && (
            <p className="mt-2 text-xs text-muted-foreground truncate">
              {subtitle}
              {subtitleHighlight && (
                <span className="ml-1.5 font-semibold text-primary">
                  {subtitleHighlight}
                </span>
              )}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl shrink-0',
            'transition-transform duration-200 group-hover:scale-105',
            styles.iconBg,
            styles.iconText,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
