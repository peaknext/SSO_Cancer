'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  totalItems = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  isLoading,
  emptyTitle,
  emptyDescription,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (!isLoading && data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden md:block relative rounded-xl glass glass-noise overflow-hidden">
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border-subtle bg-white/10 dark:bg-white/5">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left font-medium text-muted-foreground',
                      col.sortable && 'cursor-pointer select-none hover:text-foreground',
                      col.headerClassName,
                    )}
                    onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  >
                    <span className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        sortBy === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                        )
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn(isLoading && 'opacity-50')}>
              {data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-glass-border-subtle last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-white/10 dark:hover:bg-white/5',
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3', col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              'rounded-xl glass-light p-4 space-y-2',
              onRowClick && 'cursor-pointer active:bg-white/15 dark:active:bg-white/8',
            )}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{col.header}</span>
                <span className="text-sm text-right">{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {onPageChange && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
