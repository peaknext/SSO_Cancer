/** Normalize HN: strip leading zeros so HIS (000857160) matches stored (857160) */
export function normalizeHn(hn: string): string {
  const stripped = hn.replace(/^0+/, '');
  return stripped || '0'; // edge case: '000' → '0'
}
