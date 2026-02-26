'use client';

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Check, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CancerSite {
  id: number;
  siteCode: string;
  nameThai: string;
  nameEnglish: string;
}

interface CancerSitesResponse {
  data: CancerSite[];
  meta: { total: number };
}

export interface CancerSiteMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// ─── Module-level cache ───────────────────────────────────────────────────────

let cachedSites: CancerSite[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadCancerSites(): Promise<CancerSite[]> {
  if (cachedSites && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedSites;
  }

  const resp = await apiClient.get<CancerSitesResponse>(
    '/cancer-sites?limit=100&sortBy=siteCode&sortOrder=asc',
  );
  cachedSites = resp.data;
  cacheTimestamp = Date.now();
  return resp.data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CancerSiteMultiSelect({
  value,
  onChange,
  placeholder = 'ทุกชนิดมะเร็ง',
  className,
  disabled,
}: CancerSiteMultiSelectProps) {
  const [sites, setSites] = useState<CancerSite[]>([]);
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

  // Load sites on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCancerSites()
      .then((data) => {
        if (!cancelled) setSites(data);
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

  // Filter sites by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sites;
    return sites.filter(
      (s) =>
        s.siteCode.toLowerCase().includes(q) ||
        s.nameThai.toLowerCase().includes(q) ||
        s.nameEnglish.toLowerCase().includes(q),
    );
  }, [sites, search]);

  const toggleSite = useCallback(
    (id: string) => {
      if (value.includes(id)) {
        onChange(value.filter((v) => v !== id));
      } else {
        onChange([...value, id]);
      }
    },
    [value, onChange],
  );

  // Select all visible (matching current search filter)
  const handleSelectAll = useCallback(() => {
    const filteredIds = filtered.map((s) => String(s.id));
    const merged = new Set([...value, ...filteredIds]);
    onChange(Array.from(merged));
  }, [filtered, value, onChange]);

  // Clear all selections
  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Map selected IDs to display labels
  const selectedLabels = useMemo(() => {
    const siteMap = new Map(sites.map((s) => [String(s.id), s]));
    return value
      .map((id) => siteMap.get(id))
      .filter(Boolean) as CancerSite[];
  }, [value, sites]);

  // Dropdown content (rendered via portal)
  const dropdownContent = open ? (
    <div
      ref={dropdownRef}
      className="fixed z-9999 rounded-md border bg-card shadow-lg"
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
            placeholder="ค้นหาตำแหน่งมะเร็ง..."
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
          เลือก {value.length}/{sites.length}
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
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            ไม่พบตำแหน่งมะเร็งที่ตรงกัน
          </div>
        ) : (
          filtered.map((site) => {
            const id = String(site.id);
            const selected = value.includes(id);
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => toggleSite(id)}
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
                <span className="truncate">
                  {site.siteCode} — {site.nameThai}
                </span>
              </button>
            );
          })
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
          'flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'hover:bg-accent/50 transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-50',
          value.length > 0 && 'ring-1 ring-primary/30',
        )}
      >
        <span className="flex items-center gap-2 text-left truncate">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          {loading ? (
            <span className="text-muted-foreground">กำลังโหลด...</span>
          ) : value.length > 0 ? (
            <span>เลือกตำแหน่งมะเร็ง ({value.length})</span>
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
          {selectedLabels.map((site) => (
            <span
              key={site.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
            >
              {site.siteCode} — {site.nameThai}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSite(String(site.id));
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
