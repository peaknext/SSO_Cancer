/**
 * One-time script: read EquipdevAIPN-230269.xlsx and generate SQL seed file.
 *
 * Usage:  npx ts-node scripts/generate-aipn-seed.ts
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_PATH = path.join(__dirname, '..', 'EquipdevAIPN-230269.xlsx');
const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'database',
  'seeds',
  '014_sso_aipn_items.sql',
);

function excelDateToISO(val: unknown): string {
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // Excel serial number
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  return String(val);
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

// ─── Main ────────────────────────────────────────────────────────────────────

const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
  defval: null,
});

// Normalize column names — Excel headers may have leading/trailing spaces
const rows = rawRows.map((row) => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    cleaned[key.trim()] = val;
  }
  return cleaned;
});

console.log(`Read ${rows.length} rows from ${path.basename(EXCEL_PATH)}`);

let sql = `-- 014: SSO AIPN Items -- รายการยา/อุปกรณ์ SSO Cancer Care\n`;
sql += `-- Source: EquipdevAIPN-230269.xlsx (${rows.length} rows)\n`;
sql += `-- Generated: ${new Date().toISOString()}\n\n`;

sql += `INSERT INTO sso_aipn_items (\n`;
sql += `  billing_group, code, unit, rate, rate2, description,\n`;
sql += `  date_revised, date_effective, date_expiry, last_updated,\n`;
sql += `  condition, note, is_active, created_at, updated_at\n`;
sql += `)\nVALUES\n`;

const values: string[] = [];

for (const row of rows) {
  const billgrcs = String(row['billgrcs'] ?? '').trim();
  const code = Number(row['code']);
  const unit = escapeSQL(String(row['unit'] ?? '').trim());
  const rate = Number(row['rate'] ?? 0);
  const rate2 = Number(row['rate2'] ?? 0);
  const desc = escapeSQL(String(row['desc'] ?? '').trim());
  const daterev = excelDateToISO(row['daterev']);
  const dateeff = excelDateToISO(row['dateeff']);
  const dateexp = excelDateToISO(row['dateexp']);
  const lastupd = excelDateToISO(row['lastupd']);
  const dxcond = escapeSQL(String(row['dxcond'] ?? 'SSOCAC').trim());
  const note = row['note']
    ? `'${escapeSQL(String(row['note']).trim())}'`
    : 'NULL';

  if (isNaN(code)) {
    console.warn(`  Skipping row with invalid code: ${row['code']}`);
    continue;
  }

  values.push(
    `  ('${billgrcs}', ${code}, '${unit}', ${rate}, ${rate2}, '${desc}',` +
      ` '${daterev}', '${dateeff}', '${dateexp}', '${lastupd}',` +
      ` '${dxcond}', ${note}, true, NOW(), NOW())`,
  );
}

sql += values.join(',\n');
sql += `\nON CONFLICT (code) DO NOTHING;\n`;

fs.writeFileSync(OUTPUT_PATH, sql, 'utf-8');

console.log(
  `Generated ${OUTPUT_PATH} with ${values.length} rows (${(Buffer.byteLength(sql) / 1024).toFixed(0)} KB)`,
);
