import * as iconv from 'iconv-lite';
import * as crypto from 'crypto';

// ─── Bangkok timezone helpers ───────────────────────────────────────────────
// All SSOP date/time fields must use Thai local time (Asia/Bangkok, UTC+7).
// Using Date.getHours() etc. is dangerous because Docker containers default
// to UTC — these helpers guarantee correct Thai time regardless of system TZ.
// ────────────────────────────────────────────────────────────────────────────

const BANGKOK_TZ = 'Asia/Bangkok';

export interface DateParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Extract date/time components in Bangkok timezone (UTC+7) */
export function getBangkokDateParts(d: Date): DateParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23', // 00-23 (avoids "24" midnight edge case)
  });
  const parts = fmt.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour'),
    minutes: get('minute'),
    seconds: get('second'),
  };
}

// ─── Encoding utilities ─────────────────────────────────────────────────────

/** Encode string to windows-874 Buffer */
export function encodeWindows874(text: string): Buffer {
  return iconv.encode(text, 'windows-874');
}

/**
 * Calculate MD5 checksum of content encoded as windows-874.
 * Returns UPPERCASE hex string to match SSO reference files.
 */
export function calculateMd5(content: string): string {
  const buf = iconv.encode(content, 'windows-874');
  return crypto.createHash('md5').update(buf).digest('hex').toUpperCase();
}

// ─── Date/time formatters (Bangkok timezone) ────────────────────────────────

/** Format date as YYYY-MM-DD (Bangkok time) */
export function formatDate(d: Date): string {
  const p = getBangkokDateParts(d);
  const y = p.year;
  const m = String(p.month).padStart(2, '0');
  const day = String(p.day).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format datetime as YYYY-MM-DDThh:mm:ss (Bangkok time) */
export function formatDateTime(d: Date): string {
  const date = formatDate(d);
  const p = getBangkokDateParts(d);
  const h = String(p.hours).padStart(2, '0');
  const min = String(p.minutes).padStart(2, '0');
  const s = String(p.seconds).padStart(2, '0');
  return `${date}T${h}:${min}:${s}`;
}

/** Format date portion for SSOP filenames: YYYYMMDD (Bangkok time) */
export function formatDateCompact(d: Date): string {
  const p = getBangkokDateParts(d);
  const y = p.year;
  const m = String(p.month).padStart(2, '0');
  const day = String(p.day).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** Format datetime for SSOP ZIP filename: YYYYMMDD-HHMMSS (Bangkok time) */
export function formatDateTimeCompact(d: Date): string {
  const date = formatDateCompact(d);
  const p = getBangkokDateParts(d);
  const h = String(p.hours).padStart(2, '0');
  const min = String(p.minutes).padStart(2, '0');
  const s = String(p.seconds).padStart(2, '0');
  return `${date}-${h}${min}${s}`;
}

/** Format Decimal/number to 2-decimal string */
export function formatAmount(val: number | string | { toNumber?: () => number }): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const num =
    typeof val === 'number'
      ? val
      : typeof val === 'string'
        ? parseFloat(val)
        : ((val as any).toNumber?.() ?? 0);
  return num.toFixed(2);
}
