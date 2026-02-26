import * as iconv from 'iconv-lite';
import * as crypto from 'crypto';

/** Encode string to windows-874 Buffer */
export function encodeWindows874(text: string): Buffer {
  return iconv.encode(text, 'windows-874');
}

/** Calculate MD5 checksum of content encoded as windows-874 (matches actual file encoding) */
export function calculateMd5(content: string): string {
  const buf = iconv.encode(content, 'windows-874');
  return crypto.createHash('md5').update(buf).digest('hex');
}

/** Format date as YYYY-MM-DD */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format datetime as YYYY-MM-DDThh:mm:ss */
export function formatDateTime(d: Date): string {
  const date = formatDate(d);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${date}T${h}:${min}:${s}`;
}

/** Format date portion for SSOP filenames: YYYYMMDD */
export function formatDateCompact(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** Format datetime for SSOP ZIP filename: YYYYMMDD-HHMMSS */
export function formatDateTimeCompact(d: Date): string {
  const date = formatDateCompact(d);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${date}-${h}${min}${s}`;
}

/** Format Decimal/number to 2-decimal string */
export function formatAmount(val: number | string | { toNumber?: () => number }): string {
  const num = typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : (val as any).toNumber?.() ?? 0;
  return num.toFixed(2);
}
