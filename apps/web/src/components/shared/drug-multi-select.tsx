'use client';

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Check, Pill } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProtocolDrug {
  id: number;
  genericName: string;
  drugCategory: string | null;
}

export interface DrugMultiSelectProps {
  value: string[];
  onChange: (names: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// ─── Module-level cache ───────────────────────────────────────────────────────

let cachedDrugs: ProtocolDrug[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadProtocolDrugs(): Promise<ProtocolDrug[]> {
  if (cachedDrugs && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedDrugs;
  }

  const data = await apiClient.get<ProtocolDrug[]>('/his-integration/protocol-drug-names');
  cachedDrugs = data;
  cacheTimestamp = Date.now();
  return data;
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  chemotherapy: 'เคมีบำบัด (Chemotherapy)',
  hormonal: 'ฮอร์โมน (Hormonal)',
  'targeted therapy': 'มุ่งเป้า (Targeted Therapy)',
  immunotherapy: 'ภูมิคุ้มกัน (Immunotherapy)',
  supportive: 'ช่วยเหลือ (Supportive)',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DrugMultiSelect({
  value,
  onChange,
  placeholder = 'เลือกยา...',
  className,
  disabled,
}: DrugMultiSelectProps) {
  const [drugs, setDrugs] = useState<ProtocolDrug[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Portal positioning
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, dropUp: false });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < 320;
    setPos({
      top: dropUp ? rect.top : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      dropUp,
    });
  }, []);

  // Load drugs on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadProtocolDrugs()
      .then((data) => {
        if (!cancelled) setDrugs(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  // Update dropdown position on open, scroll, resize
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Group drugs by category, filtered by search
  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? drugs.filter((d) => d.genericName.toLowerCase().includes(q))
      : drugs;

    const groups: { category: string; label: string; items: ProtocolDrug[] }[] = [];
    const categoryOrder = ['chemotherapy', 'hormonal', 'targeted therapy', 'immunotherapy', 'supportive'];

    for (const cat of categoryOrder) {
      const items = filtered.filter((d) => d.drugCategory === cat);
      if (items.length > 0) {
        groups.push({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          items,
        });
      }
    }

    // Uncategorized
    const uncategorized = filtered.filter(
      (d) => !d.drugCategory || !categoryOrder.includes(d.drugCategory),
    );
    if (uncategorized.length > 0) {
      groups.push({ category: 'other', label: 'อื่นๆ', items: uncategorized });
    }

    return groups;
  }, [drugs, search]);

  const toggleDrug = useCallback(
    (name: string) => {
      if (value.includes(name)) {
        onChange(value.filter((v) => v !== name));
      } else {
        onChange([...value, name]);
      }
    },
    [value, onChange],
  );

  const totalFiltered = grouped.reduce((sum, g) => sum + g.items.length, 0);

  // Select all visible (matching current search filter)
  const handleSelectAll = useCallback(() => {
    const filteredNames = grouped.flatMap((g) => g.items.map((d) => d.genericName));
    const merged = new Set([...value, ...filteredNames]);
    onChange(Array.from(merged));
  }, [grouped, value, onChange]);

  // Clear all selections (not just filtered)
  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Dropdown content (rendered via portal)
  const dropdownContent = open ? (
    <div
      ref={dropdownRef}
      className="fixed z-9999 rounded-md glass-heavy shadow-lg"
      style={{
        top: pos.dropUp ? undefined : pos.top,
        bottom: pos.dropUp ? window.innerHeight - pos.top + 4 : undefined,
        left: pos.left,
        width: pos.width,
      }}
    >
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อยา..."
            className="w-full rounded-md border border-glass-border-subtle bg-white/40 dark:bg-white/5 backdrop-blur-sm pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setSearch('');
              }
            }}
          />
        </div>
      </div>

      {/* Action bar: Select All / Clear All */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground">
          เลือก {value.length}/{drugs.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            เลือกทั้งหมด{search ? ' (ที่กรอง)' : ''}
          </button>
          <span className="text-muted-foreground/40">|</span>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={value.length === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            ล้างทั้งหมด
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-60 overflow-y-auto">
        {totalFiltered === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            ไม่พบยาที่ตรงกัน
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.category}>
              {/* Sticky group header */}
              <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b">
                {group.label} ({group.items.length})
              </div>
              {group.items.map((drug) => {
                const selected = value.includes(drug.genericName);
                return (
                  <button
                    key={drug.id}
                    type="button"
                    onClick={() => toggleDrug(drug.genericName)}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent/50 transition-colors',
                      selected && 'bg-primary/5',
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center h-4 w-4 rounded border shrink-0',
                        selected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{drug.genericName}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between w-full rounded-md border border-glass-border-subtle bg-white/40 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm',
          'hover:bg-accent/50 transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          value.length > 0 && 'ring-1 ring-primary/30',
        )}
      >
        <span className="flex items-center gap-2 text-left truncate">
          <Pill className="h-4 w-4 text-muted-foreground shrink-0" />
          {loading ? (
            <span className="text-muted-foreground">กำลังโหลด...</span>
          ) : value.length > 0 ? (
            <span>เลือกยา ({value.length})</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
            >
              {name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDrug(name);
                }}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Portal dropdown to document.body */}
      {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
