'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
}

interface PatientSearchResultsProps {
  results: HisPatient[];
  onSelect: (patient: HisPatient) => void;
  onImportAll?: (patient: HisPatient) => void;
  importingHn?: string | null;
  disabled?: boolean;
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
}: PatientSearchResultsProps) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
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
  }, [filter]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return results;
    const q = filter.toLowerCase().trim();
    return results.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.hn.toLowerCase().includes(q) ||
        (p.citizenId && p.citizenId.includes(q)),
    );
  }, [results, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (results.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header: count + quick filter */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground shrink-0">
          พบ {filtered.length === results.length ? results.length : `${filtered.length}/${results.length}`} ผลลัพธ์
        </p>
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

      {/* Patient list */}
      <div className="divide-y rounded-lg border">
        {paged.map((p) => (
          <div
            key={p.hn}
            className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
          >
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
