'use client';

import { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';

// ─── Field Definitions ────────────────────────────────────────────────────────

const EXPORT_FIELDS = [
  { key: 'citizenId', label: 'เลขบัตรประชาชน' },
  { key: 'hn', label: 'HN' },
  { key: 'caseNumber', label: 'เลขที่เคส' },
  { key: 'fullName', label: 'ชื่อ-สกุล' },
  { key: 'referralDate', label: 'วันที่ลงทะเบียนส่งต่อ' },
  { key: 'admissionDate', label: 'วันที่ลงทะเบียนรับเข้า' },
  { key: 'sourceHospital', label: 'รพ.ต้นทาง' },
  { key: 'protocol', label: 'โปรโตคอล' },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  filters: {
    search?: string;
    cancerSiteId?: string;
    sourceHospitalId?: string;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportModal({ open, onClose, total, filters }: ExportModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(EXPORT_FIELDS.map((f) => f.key)),
  );
  const [isExporting, setIsExporting] = useState(false);

  const toggleField = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === EXPORT_FIELDS.length) return new Set();
      return new Set(EXPORT_FIELDS.map((f) => f.key));
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (selected.size === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 ฟิลด์');
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('fields', Array.from(selected).join(','));
      if (filters.search) params.set('search', filters.search);
      if (filters.cancerSiteId) params.set('cancerSiteId', filters.cancerSiteId);
      if (filters.sourceHospitalId) params.set('sourceHospitalId', filters.sourceHospitalId);

      const url = `/api/v1/cancer-patients/export?${params.toString()}`;
      const token = apiClient.getAccessToken();

      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!resp.ok) throw new Error('Export failed');

      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cancer-patients-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);

      toast.success('ส่งออกสำเร็จ');
      onClose();
    } catch {
      toast.error('ไม่สามารถส่งออกได้');
    } finally {
      setIsExporting(false);
    }
  }, [selected, filters, onClose]);

  return (
    <Modal open={open} onClose={onClose} maxWidth="sm">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold text-foreground">
            ส่งออก Excel
          </h2>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground/80">
            จะส่งออก <span className="font-semibold text-primary">{total.toLocaleString()}</span> รายการ
            (ตามตัวกรองที่เลือก)
          </p>
        </div>

        {/* Field checkboxes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">เลือกฟิลด์ที่ต้องการ</span>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {selected.size === EXPORT_FIELDS.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            คอลัมน์ &quot;ลำดับที่&quot; จะถูกเพิ่มอัตโนมัติเป็นคอลัมน์แรก
          </p>

          <div className="grid grid-cols-1 gap-1.5">
            {EXPORT_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(field.key)}
                  onChange={() => toggleField(field.key)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
                />
                <span className="text-sm text-foreground">{field.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            ยกเลิก
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selected.size === 0}>
            {isExporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                กำลังส่งออก...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" />
                ส่งออก Excel
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
