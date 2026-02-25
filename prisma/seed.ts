import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/sso_cancer?schema=public',
});
const prisma = new PrismaClient({ adapter });

const seedFiles = [
  '001_cancer_sites.sql',
  '002_cancer_stages.sql',
  '003_drugs.sql',
  '004_drug_trade_names.sql',
  '005_protocol_names.sql',
  '006_regimens.sql',
  '007_regimen_drugs.sql',
  '008_protocol_regimens.sql',
  '009_protocol_stages.sql',
  '010_cancer_site_stages.sql',
  '011_app_settings.sql',
  '012_initial_super_admin.sql',
  '013_icd10_cancer_site_map.sql',
  '014_sso_aipn_items.sql',
  '015_sso_protocol_drugs.sql',
  '016_hospitals.sql',
];

async function main() {
  const seedDir = path.join(__dirname, '..', 'database', 'seeds');

  console.log('=== SSO Cancer Care Database Seeding ===\n');

  for (const file of seedFiles) {
    const filePath = path.join(seedDir, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP: ${file} (file not found)`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    // Strip SQL comment lines, then split by semicolons outside quotes
    const stripped = sql
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n');

    const statements: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of stripped) {
      if (ch === "'" && !inQuote) {
        inQuote = true;
        current += ch;
      } else if (ch === "'" && inQuote) {
        inQuote = false;
        current += ch;
      } else if (ch === ';' && !inQuote) {
        const trimmed = current.trim();
        if (trimmed.length > 0) statements.push(trimmed);
        current = '';
      } else {
        current += ch;
      }
    }
    const remaining = current.trim();
    if (remaining.length > 0) statements.push(remaining);

    console.log(`  Seeding: ${file} (${statements.length} statement(s))...`);

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement + ';');
      } catch (error: any) {
        // Log but continue on conflict errors
        if (error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
          console.log(`    (skipped duplicate entry)`);
        } else {
          console.error(`    ERROR in ${file}:`, error.message?.substring(0, 200));
        }
      }
    }

    console.log(`    Done.`);
  }

  console.log('\n=== Seeding Complete ===');

  // Print summary counts
  const counts = await Promise.all([
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM cancer_sites'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM cancer_stages'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM drugs'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM drug_trade_names'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM protocol_names'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM regimens'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM regimen_drugs'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM protocol_regimens'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM protocol_stages'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM cancer_site_stages'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM app_settings'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM users'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM sso_aipn_items'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM sso_protocol_drugs'),
    prisma.$queryRawUnsafe<any[]>('SELECT count(*) as c FROM hospitals'),
  ]);

  const tables = [
    'cancer_sites', 'cancer_stages', 'drugs', 'drug_trade_names',
    'protocol_names', 'regimens', 'regimen_drugs', 'protocol_regimens',
    'protocol_stages', 'cancer_site_stages', 'app_settings', 'users',
    'sso_aipn_items', 'sso_protocol_drugs', 'hospitals',
  ];

  console.log('\nRow counts:');
  tables.forEach((table, i) => {
    console.log(`  ${table}: ${counts[i][0].c}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
