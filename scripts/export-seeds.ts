/**
 * Export current DB data as seed SQL files.
 * Usage: npx tsx scripts/export-seeds.ts
 *
 * Exports all seedable tables (skipping runtime/transactional tables)
 * into database/seeds/ as INSERT ... ON CONFLICT DO NOTHING statements.
 */
import 'dotenv/config';
import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const { Pool } = pg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/sso_cancer?schema=public',
});

// Tables to export, in dependency order (matches seed file numbering)
const tables: {
  file: string;
  table: string;
  comment: string;
  columns: string[];
  conflictKey: string;
  orderBy: string;
}[] = [
  {
    file: '001_cancer_sites.sql',
    table: 'cancer_sites',
    comment: '001: Cancer Sites — ตำแหน่งมะเร็ง',
    columns: [
      'id',
      'site_code',
      'name_thai',
      'name_english',
      'sort_order',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'site_code',
    orderBy: 'id',
  },
  {
    file: '002_cancer_stages.sql',
    table: 'cancer_stages',
    comment: '002: Cancer Stages — ระยะของโรคมะเร็ง',
    columns: [
      'id',
      'stage_code',
      'name_thai',
      'name_english',
      'description',
      'stage_group',
      'sort_order',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'stage_code',
    orderBy: 'id',
  },
  {
    file: '003_drugs.sql',
    table: 'drugs',
    comment: '003: Drugs — รายการยา generic names',
    columns: [
      'id',
      'generic_name',
      'drug_category',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'generic_name',
    orderBy: 'id',
  },
  {
    file: '004_drug_trade_names.sql',
    table: 'drug_trade_names',
    comment: '004: Drug Trade Names — รหัสยา SSO + ชื่อทางการค้า',
    columns: [
      'id',
      'drug_id',
      'drug_code',
      'trade_name',
      'dosage_form',
      'strength',
      'unit',
      'unit_price',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'drug_code',
    orderBy: 'id',
  },
  {
    file: '005_protocol_names.sql',
    table: 'protocol_names',
    comment: '005: Protocol Names — ชื่อโปรโตคอลการรักษา',
    columns: [
      'id',
      'protocol_code',
      'cancer_site_id',
      'name_thai',
      'name_english',
      'protocol_type',
      'treatment_intent',
      'notes',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'protocol_code',
    orderBy: 'id',
  },
  {
    file: '006_regimens.sql',
    table: 'regimens',
    comment: '006: Regimens — สูตรยา',
    columns: [
      'id',
      'regimen_code',
      'regimen_name',
      'description',
      'cycle_days',
      'max_cycles',
      'regimen_type',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'regimen_code',
    orderBy: 'id',
  },
  {
    file: '007_regimen_drugs.sql',
    table: 'regimen_drugs',
    comment: '007: Regimen Drugs — สูตรยา ↔ ยา (พร้อม dose/route/schedule)',
    columns: [
      'id',
      'regimen_id',
      'drug_id',
      'dose_per_cycle',
      'route',
      'day_schedule',
      'is_optional',
      'notes',
    ],
    conflictKey: 'regimen_id, drug_id, day_schedule',
    orderBy: 'id',
  },
  {
    file: '008_protocol_regimens.sql',
    table: 'protocol_regimens',
    comment: '008: Protocol Regimens — โปรโตคอล ↔ สูตรยา',
    columns: [
      'id',
      'protocol_id',
      'regimen_id',
      'line_of_therapy',
      'is_preferred',
      'notes',
    ],
    conflictKey: 'protocol_id, regimen_id',
    orderBy: 'id',
  },
  {
    file: '009_protocol_stages.sql',
    table: 'protocol_stages',
    comment: '009: Protocol Stages — โปรโตคอล ↔ ระยะโรค',
    columns: ['id', 'protocol_id', 'stage_id', 'notes'],
    conflictKey: 'protocol_id, stage_id',
    orderBy: 'id',
  },
  {
    file: '010_cancer_site_stages.sql',
    table: 'cancer_site_stages',
    comment: '010: Cancer Site Stages — ตำแหน่งมะเร็ง ↔ ระยะโรค',
    columns: ['id', 'cancer_site_id', 'stage_id'],
    conflictKey: 'cancer_site_id, stage_id',
    orderBy: 'id',
  },
  {
    file: '011_app_settings.sql',
    table: 'app_settings',
    comment: '011: Application Settings',
    columns: [
      'setting_key',
      'setting_value',
      'description',
      'setting_group',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'setting_key',
    orderBy: 'id',
  },
  {
    file: '012_initial_super_admin.sql',
    table: 'users',
    comment: '012: Initial Super Admin user',
    columns: [
      'id',
      'email',
      'password_hash',
      'full_name',
      'full_name_thai',
      'role',
      'department',
      'position',
      'phone_number',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'email',
    orderBy: 'id',
  },
  {
    file: '013_icd10_cancer_site_map.sql',
    table: 'icd10_cancer_site_map',
    comment: '013: ICD-10 → CancerSite mapping',
    columns: [
      'id',
      'icd_prefix',
      'cancer_site_id',
      'description',
      'is_active',
      'created_at',
      'updated_at',
    ],
    conflictKey: 'icd_prefix',
    orderBy: 'id',
  },
];

// Keys that contain secrets — redact their values in seed output
const REDACT_KEYS = new Set([
  'ai_gemini_api_key',
  'ai_claude_api_key',
  'ai_openai_api_key',
]);

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  // String — escape single quotes
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function exportTable(config: (typeof tables)[0]) {
  const { file, table, comment, columns, conflictKey, orderBy } = config;
  const seedDir = path.join(__dirname, '..', 'database', 'seeds');

  const rows = await pool.query(
    `SELECT ${columns.join(', ')} FROM ${table} ORDER BY ${orderBy}`,
  );

  if (rows.rowCount === 0) {
    console.log(`  SKIP: ${table} (0 rows)`);
    return;
  }

  let sql = `-- ${comment}\n`;
  sql += `-- Exported from database: ${rows.rowCount} rows\n\n`;

  // Build INSERT with VALUES batches (max 50 rows per INSERT for readability)
  const batchSize = 50;
  for (let i = 0; i < rows.rows.length; i += batchSize) {
    const batch = rows.rows.slice(i, i + batchSize);

    sql += `INSERT INTO ${table} (${columns.join(', ')})\nVALUES\n`;
    sql += batch
      .map((row: Record<string, unknown>) => {
        const vals = columns.map((col) => {
          // Redact API keys
          if (
            col === 'setting_value' &&
            REDACT_KEYS.has(row['setting_key'] as string)
          ) {
            return "''";
          }
          return escapeSQL(row[col]);
        });
        return `  (${vals.join(', ')})`;
      })
      .join(',\n');
    sql += `\nON CONFLICT (${conflictKey}) DO NOTHING;\n\n`;
  }

  // Reset sequence to max id + 1 for tables with autoincrement id
  if (columns.includes('id')) {
    sql += `-- Reset sequence\n`;
    sql += `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1));\n`;
  }

  fs.writeFileSync(path.join(seedDir, file), sql, 'utf-8');
  console.log(`  Exported: ${file} (${rows.rowCount} rows)`);
}

async function main() {
  console.log('=== Exporting DB data as seed files ===\n');

  for (const config of tables) {
    await exportTable(config);
  }

  // Handle seed files 014-016 that were merged from multiple tables
  // 014 & 015 are additional trade names/regimens — already covered in main tables
  // 016 is AI settings — already in app_settings
  // Remove the old partial files since all data is now in the main exports
  const obsoleteFiles = [
    '014_hormonal_regimens_and_trade_names.sql',
    '015_hospital_trade_names.sql',
    '016_ai_settings.sql',
  ];

  const seedDir = path.join(__dirname, '..', 'database', 'seeds');
  for (const f of obsoleteFiles) {
    const p = path.join(seedDir, f);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log(`  Removed obsolete: ${f}`);
    }
  }

  console.log('\n=== Export Complete ===');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
