'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HisPatient {
  hn: string;
  citizenId: string;
  titleName?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  insuranceType?: string;
  mainHospitalCode?: string;
  totalVisitCount?: number;
  matchingVisitCount?: number;
  existsInSystem?: boolean;
  existingPatientId?: number | null;
  importedVisitCount?: number;
}

interface PatientSearchResultsProps {
  results: HisPatient[];
  onSelect: (patient: HisPatient) => void;
  onImportAll?: (patient: HisPatient) => void;
  importingHn?: string | null;
  disabled?: boolean;
  /** Show "new only" filter checkbox */
  showNewOnlyFilter?: boolean;
  /** Enable per-row checkboxes for multi-select */
  selectable?: boolean;
  selectedHns?: Set<string>;
  onToggleSelect?: (hn: string) => void;
  onToggleSelectAll?: (pageHns: string[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientSearchResults({
  results,
  onSelect,
  onImportAll,
  importingHn,
  disabled,
  showNewOnlyFilter,
  selectable,
  selectedHns,
  onToggleSelect,
  onToggleSelectAll,
}: PatientSearchResultsProps) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const prevResultsLenRef = useRef(results.length);

  // Reset page only when filter changes or result count changes (new search),
  // NOT when results array reference changes (e.g. import status update)
  useEffect(() => {
    if (results.length !== prevResultsLenRef.current) {
      setPage(1);
      prevResultsLenRef.current = results.length;
    }
  }, [results.length]);

  useEffect(() => {
    setPage(1);
  }, [filter, showNewOnly]);

  const filtered = useMemo(() => {
    let list = results;
    // "New only" filter: show new patients OR patients with potential new visits
    if (showNewOnly) {
      list = list.filter((p) => {
        if (!p.existsInSystem) return true;
        return (p.matchingVisitCount ?? 0) > (p.importedVisitCount ?? 0);
      });
    }
    // Text filter
    if (filter.trim()) {
      const q = filter.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.hn.toLowerCase().includes(q) ||
          (p.citizenId && p.citizenId.includes(q)),
      );
    }
    return list;
  }, [results, filter, showNewOnly]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allCurrentSelected = selectable && paged.length > 0 && paged.every((p) => selectedHns?.has(p.hn));

  if (results.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Toolbar: new-only filter + count + text filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          {showNewOnlyFilter && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showNewOnly}
                onChange={(e) => setShowNewOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <span className="text-xs">แสดงเฉพาะรายใหม่/รายที่มี visit ใหม่</span>
            </label>
          )}
          <p className="text-xs text-muted-foreground shrink-0">
            พบ {filtered.length === results.length ? results.length : `${filtered.length}/${results.length}`} ผลลัพธ์
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectable && onToggleSelectAll && (
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={!!allCurrentSelected}
                onChange={() => onToggleSelectAll(paged.map((p) => p.hn))}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
              />
              เลือกทั้งหมด
            </label>
          )}
          {results.length > PAGE_SIZE && (
            <div className="relative flex-1 max-w-55">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="กรอง ชื่อ/HN..."
                className="w-full rounded-md border border-input bg-background pl-7 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Patient list */}
      <div className="divide-y rounded-lg border">
        {paged.map((p) => (
          <div
            key={p.hn}
            className={cn(
              'w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-4',
              selectable && selectedHns?.has(p.hn) ? 'bg-primary/5' : 'hover:bg-muted/50',
            )}
          >
            {/* Checkbox */}
            {selectable && onToggleSelect && (
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedHns?.has(p.hn) ?? false}
                  onChange={() => onToggleSelect(p.hn)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
                  disabled={disabled || importingHn === p.hn}
                />
              </div>
            )}
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => onSelect(p)}
              disabled={disabled || importingHn === p.hn}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.fullName}</span>
                {p.gender && (
                  <Badge variant="outline" className="text-xs">
                    {p.gender === 'M' ? 'ชาย' : 'หญิง'}
                  </Badge>
                )}
                {p.existsInSystem != null && (
                  p.existsInSystem ? (
                    <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                      อยู่ในระบบแล้ว
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                      ผู้ป่วยใหม่
                    </Badge>
                  )
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>HN: {p.hn}</span>
                {p.citizenId && <span>ID: {p.citizenId}</span>}
                {p.dateOfBirth && <span>อายุ {calculateAge(p.dateOfBirth)} ปี</span>}
                {p.matchingVisitCount != null && (
                  <span className="text-primary font-medium">{p.matchingVisitCount} visits ตรงเกณฑ์</span>
                )}
                {p.matchingVisitCount == null && p.totalVisitCount != null && (
                  <span>{p.totalVisitCount} visits</span>
                )}
                {p.importedVisitCount != null && p.importedVisitCount > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">นำเข้าแล้ว {p.importedVisitCount}</span>
                )}
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {onImportAll && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImportAll(p);
                  }}
                  disabled={disabled || importingHn != null}
                >
                  {importingHn === p.hn ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {p.existsInSystem ? 'นำเข้า visit ใหม่' : 'นำเข้าทั้งหมด'}
                </Button>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            หน้า {page}/{totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded hover:bg-muted/50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded hover:bg-muted/50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
