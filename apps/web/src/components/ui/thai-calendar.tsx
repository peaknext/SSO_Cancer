'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker/buddhist';
import { useDayPicker } from 'react-day-picker';
import { th } from 'react-day-picker/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import 'react-day-picker/style.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const DEFAULT_START = new Date(2020, 0); // Jan 2020 (พ.ศ. 2563)
const DEFAULT_END = new Date(2030, 11); // Dec 2030 (พ.ศ. 2573)

// ─── Chevron button (shared) ─────────────────────────────────────────────────

const chevronBtnClass = cn(
  'inline-flex h-7 w-7 items-center justify-center rounded-md shrink-0',
  'border border-input bg-transparent text-muted-foreground',
  'transition-colors duration-150',
  'hover:bg-accent/50 hover:text-accent-foreground',
  'disabled:pointer-events-none disabled:opacity-35',
);

// ─── Custom MonthCaption ─────────────────────────────────────────────────────

const selectBaseClass = cn(
  'h-7 rounded-md border border-input bg-transparent text-sm font-medium',
  'cursor-pointer appearance-none pl-2 pr-6',
  'transition-colors duration-150',
  'hover:bg-accent/30',
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1',
);

function MonthCaption({ calendarMonth }: { calendarMonth: { date: Date }; displayIndex: number }) {
  const { goToMonth, previousMonth, nextMonth, dayPickerProps } = useDayPicker();

  const current = calendarMonth.date;
  const currentMonth = current.getMonth();
  const currentYear = current.getFullYear();

  const start = dayPickerProps.startMonth ?? DEFAULT_START;
  const end = dayPickerProps.endMonth ?? DEFAULT_END;
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  // Build year options (Gregorian value, Buddhist label)
  const years = React.useMemo(() => {
    const arr: { value: number; label: string }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      arr.push({ value: y, label: String(y + 543) });
    }
    return arr;
  }, [startYear, endYear]);

  const handleMonthChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      goToMonth(new Date(currentYear, Number(e.target.value)));
    },
    [goToMonth, currentYear],
  );

  const handleYearChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      goToMonth(new Date(Number(e.target.value), currentMonth));
    },
    [goToMonth, currentMonth],
  );

  return (
    <div className="flex w-full items-center justify-between gap-1 px-0.5 pt-1">
      {/* Previous month */}
      <button
        type="button"
        className={chevronBtnClass}
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        aria-label="เดือนก่อนหน้า"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Dropdowns */}
      <div className="flex items-center gap-1.5">
        {/* Month dropdown */}
        <div className="relative">
          <select
            value={currentMonth}
            onChange={handleMonthChange}
            className={cn(selectBaseClass, 'w-27.5')}
            aria-label="เลือกเดือน"
          >
            {THAI_MONTHS.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
          {/* Custom dropdown chevron */}
          <ChevronRight
            className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-muted-foreground/60"
          />
        </div>

        {/* Year dropdown (Buddhist era) */}
        <div className="relative">
          <select
            value={currentYear}
            onChange={handleYearChange}
            className={cn(selectBaseClass, 'w-18')}
            aria-label="เลือกปี"
          >
            {years.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
          <ChevronRight
            className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Next month */}
      <button
        type="button"
        className={chevronBtnClass}
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        aria-label="เดือนถัดไป"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── ThaiCalendar ────────────────────────────────────────────────────────────

export type ThaiCalendarProps = React.ComponentProps<typeof DayPicker>;

function ThaiCalendar({ className, classNames, ...props }: ThaiCalendarProps) {
  return (
    <DayPicker
      locale={th}
      numerals="latn"
      showOutsideDays
      captionLayout="dropdown"
      startMonth={DEFAULT_START}
      endMonth={DEFAULT_END}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-2',
        month_caption: 'flex justify-center relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'hidden',
        button_previous: 'hidden',
        button_next: 'hidden',
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
        MonthCaption: MonthCaption as any,
      }}
      {...props}
    />
  );
}

ThaiCalendar.displayName = 'ThaiCalendar';

export { ThaiCalendar };
