'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { CodeBadge } from '@/components/shared/code-badge';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CancerSiteInfo {
  id: number;
  siteCode: string;
  nameThai: string;
  nameEnglish: string;
}

interface ProtocolWithSite {
  id: number;
  protocolCode: string;
  nameThai: string;
  nameEnglish: string;
  cancerSite: CancerSiteInfo;
}

interface ProtocolsResponse {
  data: ProtocolWithSite[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface SiteGroup {
  cancerSite: CancerSiteInfo;
  protocols: ProtocolWithSite[];
}

export interface ProtocolComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Promote this cancer site's group to the top of the list */
  suggestedCancerSiteId?: number;
}

// ─── Module-level cache ───────────────────────────────────────────────────────

let cachedProtocols: ProtocolWithSite[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadAllProtocols(): Promise<ProtocolWithSite[]> {
  if (cachedProtocols && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedProtocols;
  }

  // Fetch page 1 & page 2 in parallel (API max 100/page, total ~170)
  const [page1, page2] = await Promise.all([
    apiClient.get<ProtocolsResponse>(
      '/protocols?limit=100&page=1&sortBy=protocolCode&sortOrder=asc',
    ),
    apiClient.get<ProtocolsResponse>(
      '/protocols?limit=100&page=2&sortBy=protocolCode&sortOrder=asc',
    ),
  ]);

  cachedProtocols = [...(page1.data || []), ...(page2.data || [])];
  cacheTimestamp = Date.now();
  return cachedProtocols;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupByCancerSite(
  protocols: ProtocolWithSite[],
  suggestedSiteId?: number,
): SiteGroup[] {
  const map = new Map<number, SiteGroup>();

  for (const p of protocols) {
    const siteId = p.cancerSite.id;
    if (!map.has(siteId)) {
      map.set(siteId, { cancerSite: p.cancerSite, protocols: [] });
    }
    map.get(siteId)!.protocols.push(p);
  }

  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (suggestedSiteId) {
      if (a.cancerSite.id === suggestedSiteId) return -1;
      if (b.cancerSite.id === suggestedSiteId) return 1;
    }
    return a.cancerSite.siteCode.localeCompare(b.cancerSite.siteCode);
  });

  return groups;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProtocolCombobox({
  value,
  onChange,
  placeholder = 'ค้นหาหรือเลือกโปรโตคอล...',
  className,
  disabled,
  suggestedCancerSiteId,
}: ProtocolComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [protocols, setProtocols] = useState<ProtocolWithSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load protocols ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadAllProtocols()
      .then((data) => {
        if (!cancelled) setProtocols(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Selected protocol lookup ────────────────────────────────────────────────

  const selectedProtocol = useMemo(
    () => (value ? protocols.find((p) => String(p.id) === value) : null),
    [value, protocols],
  );

  // ── Filtering ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return protocols;
    const q = search.toLowerCase();
    return protocols.filter(
      (p) =>
        p.protocolCode.toLowerCase().includes(q) ||
        p.nameThai.toLowerCase().includes(q) ||
        p.nameEnglish?.toLowerCase().includes(q) ||
        p.cancerSite.nameThai.toLowerCase().includes(q) ||
        p.cancerSite.nameEnglish?.toLowerCase().includes(q),
    );
  }, [protocols, search]);

  const groups = useMemo(
    () => groupByCancerSite(filtered, suggestedCancerSiteId),
    [filtered, suggestedCancerSiteId],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  const selectProtocol = useCallback(
    (p: ProtocolWithSite) => {
      onChange(String(p.id));
      closeDropdown();
    },
    [onChange, closeDropdown],
  );

  const clearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
    },
    [onChange],
  );

  // ── Click-outside ───────────────────────────────────────────────────────────

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

  // ── Keyboard ────────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    },
    [closeDropdown],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

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
            placeholder="พิมพ์เพื่อค้นหาโปรโตคอล..."
            className={cn(
              'flex h-10 w-full rounded-lg border border-primary/40 bg-background pl-9 pr-3 py-2 text-sm',
              'ring-2 ring-ring ring-offset-2 ring-offset-background',
              'placeholder:text-muted-foreground outline-none',
            )}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={openDropdown}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-left',
            'ring-offset-background transition-colors',
            'hover:border-primary/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
          )}
        >
          {selectedProtocol ? (
            <>
              <CodeBadge code={selectedProtocol.protocolCode} className="shrink-0" />
              <span className="truncate text-foreground">{selectedProtocol.nameThai}</span>
              <span className="ml-auto shrink-0 flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {selectedProtocol.cancerSite.nameThai}
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
              <span className="truncate flex-1">{isLoading ? 'กำลังโหลด...' : placeholder}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </>
          )}
        </button>
      )}

      {/* ── Dropdown ── */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full max-h-80 overflow-auto overscroll-contain',
            'rounded-xl border border-border/80 bg-card',
            'shadow-xl ring-1 ring-black/5 dark:ring-white/5',
          )}
        >
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2 align-middle" />
              กำลังโหลดโปรโตคอล...
            </div>
          ) : groups.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              ไม่พบโปรโตคอล
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.cancerSite.id}>
                {/* Sticky group header */}
                <div
                  className={cn(
                    'sticky top-0 z-10 px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase',
                    'border-b border-border/40 select-none',
                    'bg-muted/90 backdrop-blur-sm text-muted-foreground',
                    suggestedCancerSiteId === group.cancerSite.id &&
                      'bg-primary/8 text-primary dark:bg-primary/15',
                  )}
                >
                  <span className="font-mono mr-1.5">{group.cancerSite.siteCode}</span>
                  {group.cancerSite.nameThai}
                  {suggestedCancerSiteId === group.cancerSite.id && (
                    <span className="ml-2 text-[10px] font-normal normal-case opacity-70">
                      (แนะนำ)
                    </span>
                  )}
                </div>

                {/* Protocol items */}
                {group.protocols.map((p) => {
                  const isSelected = String(p.id) === value;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectProtocol(p)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors',
                        'hover:bg-primary/5 cursor-pointer',
                        isSelected && 'bg-primary/8 dark:bg-primary/12',
                      )}
                    >
                      <CodeBadge code={p.protocolCode} className="shrink-0" />
                      <span className={cn('truncate', isSelected && 'font-medium text-primary')}>
                        {p.nameThai}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
