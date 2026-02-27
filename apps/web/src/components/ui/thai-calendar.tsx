'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker/buddhist';
import { th } from 'react-day-picker/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import 'react-day-picker/style.css';

export type ThaiCalendarProps = React.ComponentProps<typeof DayPicker>;

function ThaiCalendar({ className, classNames, ...props }: ThaiCalendarProps) {
  return (
    <DayPicker
      locale={th}
      numerals="latn"
      showOutsideDays
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-2',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1',
        button_previous:
          'absolute left-1 top-0 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent/50 hover:text-accent-foreground disabled:opacity-50',
        button_next:
          'absolute right-1 top-0 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent/50 hover:text-accent-foreground disabled:opacity-50',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        week: 'flex w-full mt-1',
        day: cn(
          'relative p-0 text-center text-sm',
          'focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-primary/10 [&:has([aria-selected].day-outside)]:bg-primary/5',
          '[&:has([aria-selected].day-range-end)]:rounded-r-md',
        ),
        day_button: cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal',
          'hover:bg-accent/50 hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'aria-selected:opacity-100',
        ),
        range_end: 'day-range-end',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md',
        today: 'bg-primary/10 text-primary font-semibold rounded-md',
        outside:
          'day-outside text-muted-foreground/50 aria-selected:bg-primary/5 aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground/30',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

ThaiCalendar.displayName = 'ThaiCalendar';

export { ThaiCalendar };
