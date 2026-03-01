'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, ChevronDown, X, Check, Building2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HospitalOption {
  id: number;
  hcode9: string;
  hcode5: string | null;
  nameThai: string;
  hospitalLevel: string | null;
  province: string;
  district: string | null;
}

interface HospitalsResponse {
  data: HospitalOption[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface HospitalComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HospitalCombobox({
  value,
  onChange,
  placeholder = 'ค้นหาสถานพยาบาล...',
  className,
  disabled,
}: HospitalComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<HospitalOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalOption | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Resolve selected hospital on mount / value change ─────────────────────

  useEffect(() => {
    if (!value) {
      setSelectedHospital(null);
      return;
    }

    // Check if already resolved
    if (selectedHospital && String(selectedHospital.id) === value) return;

    // Check if it's in current results
    const found = results.find((h) => String(h.id) === value);
    if (found) {
      setSelectedHospital(found);
      return;
    }

    // Fetch by ID
    apiClient
      .get<HospitalOption>(`/hospitals/${value}`)
      .then((h) => setSelectedHospital(h))
      .catch(() => {});
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const q = search.trim();
        const url = q
          ? `/hospitals?search=${encodeURIComponent(q)}&limit=20&sortBy=nameThai&sortOrder=asc`
          : '/hospitals?limit=20&sortBy=nameThai&sortOrder=asc';
        const res = await apiClient.get<HospitalsResponse>(url);
        setResults(res.data || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, isOpen]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setSearch('');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  const selectHospital = useCallback(
    (h: HospitalOption) => {
      onChange(String(h.id));
      setSelectedHospital(h);
      closeDropdown();
    },
    [onChange, closeDropdown],
  );

  const clearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setSelectedHospital(null);
    },
    [onChange],
  );

  // ── Click-outside ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, closeDropdown]);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    },
    [closeDropdown],
  );

  // ── Level badge helper ────────────────────────────────────────────────────

  const levelBadge = useMemo(() => {
    if (!selectedHospital?.hospitalLevel) return null;
    const code = selectedHospital.hospitalLevel.split(' ')[0];
    return code;
  }, [selectedHospital]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* ── Trigger ── */}
      {isOpen ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์ชื่อ, รหัส 5 หลัก, หรือจังหวัด..."
            className={cn(
              'flex h-10 w-full rounded-lg border border-primary/40 bg-background pl-9 pr-3 py-2 text-sm',
              'ring-2 ring-ring ring-offset-2 ring-offset-background',
              'placeholder:text-muted-foreground outline-none',
            )}
          />
        </div>
      ) : (
        <div
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          onClick={openDropdown}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDropdown(); }}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-lg border border-glass-border-subtle bg-white/40 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm text-left cursor-pointer',
            'ring-offset-background transition-colors',
            'hover:border-primary/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50 pointer-events-none',
            !value && 'text-muted-foreground',
          )}
        >
          {selectedHospital ? (
            <>
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              {selectedHospital.hcode5 && (
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {selectedHospital.hcode5}
                </span>
              )}
              <span className="truncate text-foreground">{selectedHospital.nameThai}</span>
              <span className="ml-auto shrink-0 flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {selectedHospital.province}
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-full p-0.5 hover:bg-muted transition-colors"
                  tabIndex={-1}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </span>
            </>
          ) : (
            <>
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{placeholder}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </>
          )}
        </div>
      )}

      {/* ── Dropdown ── */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full max-h-80 overflow-auto overscroll-contain',
            'rounded-xl glass-heavy',
            'shadow-xl ring-1 ring-black/5 dark:ring-white/5',
          )}
        >
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2 align-middle" />
              กำลังค้นหา...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {search.trim() ? 'ไม่พบสถานพยาบาล' : 'พิมพ์เพื่อค้นหา...'}
            </div>
          ) : (
            results.map((h) => {
              const isSelected = String(h.id) === value;
              const levelCode = h.hospitalLevel?.split(' ')[0] || '';
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => selectHospital(h)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors',
                    'hover:bg-primary/5 cursor-pointer',
                    isSelected && 'bg-primary/8 dark:bg-primary/12',
                  )}
                >
                  {h.hcode5 && (
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0 min-w-[3.5rem] text-center">
                      {h.hcode5}
                    </span>
                  )}
                  <span className={cn('truncate', isSelected && 'font-medium text-primary')}>
                    {h.nameThai}
                  </span>
                  <span className="ml-auto shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {levelCode && (
                      <span className="bg-muted/80 px-1 py-0.5 rounded text-[10px]">
                        {levelCode}
                      </span>
                    )}
                    <span>{h.province}</span>
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
