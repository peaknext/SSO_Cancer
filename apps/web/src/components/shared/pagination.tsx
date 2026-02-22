'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        แสดง{' '}
        <span className="font-mono tabular-nums text-foreground/70">
          {start}–{end}
        </span>{' '}
        จาก{' '}
        <span className="font-mono tabular-nums text-foreground/70">
          {totalItems.toLocaleString()}
        </span>{' '}
        รายการ
      </p>

      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="หน้าแรก"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="ก่อนหน้า"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page selector */}
        <div className="relative mx-1">
          <select
            value={page}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="h-8 appearance-none rounded-md border bg-card px-3 pr-6 font-mono text-xs tabular-nums text-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted/10 transition-colors"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                หน้า {p} / {totalPages}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-90 text-muted-foreground" />
        </div>

        {/* Next */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="ถัดไป"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="หน้าสุดท้าย"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
