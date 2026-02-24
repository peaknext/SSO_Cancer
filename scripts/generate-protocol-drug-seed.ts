/**
 * One-time script: read d1.csv (DBF file) and generate SQL seed file.
 *
 * The file is actually a dBASE III format despite the .csv extension.
 * We parse it using raw binary reading since we know the exact structure.
 *
 * Usage:  npx ts-node scripts/generate-protocol-drug-seed.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DBF_PATH = path.join(__dirname, '..', 'd1.csv');
const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'database',
  'seeds',
  '015_sso_protocol_drugs.sql',
);

// DBF structure (verified via hex analysis)
const HEADER_SIZE = 488;
const RECORD_SIZE = 305;
const FIELDS: { name: string; length: number }[] = [
  { name: 'PROTOCOL', length: 10 },
  { name: 'FORMULA', length: 10 },
  { name: 'CODE', length: 10 },
  { name: 'DESC', length: 254 },
  { name: 'RATE', length: 10 },
  { name: 'UNIT', length: 10 },
];

// TIS-620 (Thai Industrial Standard 620) to UTF-8 mapping
// TIS-620 maps 0xA1-0xFB to Thai characters U+0E01-U+0E5B
function decodeTIS620(buf: Buffer): string {
  let result = '';
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    if (byte >= 0xa1 && byte <= 0xfb) {
      // TIS-620 Thai character range → Unicode U+0E01 + (byte - 0xA1)
      result += String.fromCharCode(0x0e01 + (byte - 0xa1));
    } else if (byte < 0x80) {
      // ASCII range
      result += String.fromCharCode(byte);
    } else {
      // Unknown — skip or replace
      result += '?';
    }
  }
  return result;
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

// ─── Main ────────────────────────────────────────────────────────────────────

const fileData = fs.readFileSync(DBF_PATH);
console.log(`File size: ${fileData.length} bytes`);

const records: {
  protocol: string;
  formula: string;
  code: number;
  desc: string;
  rate: number;
  unit: string;
}[] = [];

let offset = HEADER_SIZE;
let skipped = 0;

while (offset + RECORD_SIZE <= fileData.length) {
  const record = fileData.subarray(offset, offset + RECORD_SIZE);
  offset += RECORD_SIZE;

  // First byte is deletion flag — skip if '*'
  if (record[0] === 0x2a) continue;

  let fieldOffset = 1; // skip deletion flag byte
  const row: Record<string, string> = {};

  for (const field of FIELDS) {
    const val = record.subarray(fieldOffset, fieldOffset + field.length);
    row[field.name] = decodeTIS620(val).trim();
    fieldOffset += field.length;
  }

  const protocol = row['PROTOCOL'];
  const code = parseInt(row['CODE'], 10);

  if (!protocol || isNaN(code)) {
    skipped++;
    continue;
  }

  records.push({
    protocol,
    formula: row['FORMULA'],
    code,
    desc: row['DESC'],
    rate: parseFloat(row['RATE']) || 0,
    unit: row['UNIT'],
  });
}

console.log(`Parsed ${records.length} valid records (skipped ${skipped})`);

// ─── Generate SQL ────────────────────────────────────────────────────────────

let sql = `-- 015: SSO Protocol Drug Formulary -- บัญชียาตามโปรโตคอล สปส.\n`;
sql += `-- Source: d1.csv (DBF, ${records.length} records)\n`;
sql += `-- Generated: ${new Date().toISOString()}\n\n`;

// Split into batches of 5000 rows to avoid memory issues
const BATCH_SIZE = 5000;

for (let batch = 0; batch * BATCH_SIZE < records.length; batch++) {
  const start = batch * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, records.length);
  const batchRecords = records.slice(start, end);

  sql += `INSERT INTO sso_protocol_drugs (\n`;
  sql += `  protocol_code, formula_category, aipn_code, description, rate, unit,\n`;
  sql += `  is_active, created_at, updated_at\n`;
  sql += `)\nVALUES\n`;

  const values: string[] = [];

  for (const rec of batchRecords) {
    values.push(
      `  ('${escapeSQL(rec.protocol)}', '${escapeSQL(rec.formula)}', ${rec.code}, '${escapeSQL(rec.desc)}', ${rec.rate}, '${escapeSQL(rec.unit)}',` +
        ` true, NOW(), NOW())`,
    );
  }

  sql += values.join(',\n');
  sql += `\nON CONFLICT (protocol_code, aipn_code) DO NOTHING;\n\n`;
}

fs.writeFileSync(OUTPUT_PATH, sql, 'utf-8');

console.log(
  `Generated ${OUTPUT_PATH} with ${records.length} rows in ${Math.ceil(records.length / BATCH_SIZE)} batches (${(Buffer.byteLength(sql) / 1024).toFixed(0)} KB)`,
);

// ─── Summary statistics ──────────────────────────────────────────────────────

const protocols = new Set(records.map((r) => r.protocol));
const codes = new Set(records.map((r) => r.code));
const formulas: Record<string, number> = {};
for (const rec of records) {
  const key = rec.formula || '(standard)';
  formulas[key] = (formulas[key] || 0) + 1;
}

console.log(`\nSummary:`);
console.log(`  Unique protocols: ${protocols.size}`);
console.log(`  Unique AIPN codes: ${codes.size}`);
console.log(`  Formula categories:`);
for (const [k, v] of Object.entries(formulas).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k}: ${v}`);
}
