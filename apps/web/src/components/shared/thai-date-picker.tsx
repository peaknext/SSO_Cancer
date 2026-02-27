'use client';

import { useState, useCallback } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ThaiCalendar } from '@/components/ui/thai-calendar';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** Format YYYY-MM-DD string to Thai display: "27 กุมภาพันธ์ 2569" */
function formatThaiDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const buddhistYear = y + 543;
  return `${d} ${THAI_MONTHS[m - 1]} ${buddhistYear}`;
}

/** Parse YYYY-MM-DD string to local Date at midnight */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date to YYYY-MM-DD string (local timezone) */
function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface ThaiDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ThaiDatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่...',
  disabled,
  className,
}: ThaiDatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? parseLocalDate(value) : undefined;

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        onChange(formatDateStr(date));
      }
      setOpen(false);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal w-full',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
          {value ? formatThaiDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ThaiCalendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
        />
      </PopoverContent>
    </Popover>
  );
}
