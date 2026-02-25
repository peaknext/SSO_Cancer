import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

// Tables in dependency order (for INSERT). TRUNCATE uses reverse.
const TABLE_ORDER = [
  // Phase 1 — Independent
  'drugs',
  'cancer_sites',
  'cancer_stages',
  'hospitals',
  'users',
  // Phase 2 — Depends on Phase 1
  'drug_trade_names',
  'protocol_names',
  'regimens',
  'icd10_cancer_site_map',
  // Phase 3 — Junction tables
  'protocol_regimens',
  'regimen_drugs',
  'protocol_stages',
  'cancer_site_stages',
  // Phase 4 — Reference/Config
  'sso_aipn_items',
  'sso_protocol_drugs',
  'app_settings',
  // Phase 5 — Transactional
  'patients',
  'patient_imports',
  'patient_cases',
  'patient_visits',
  'visit_medications',
  'ai_suggestions',
  'visit_billing_claims',
  // Phase 6 — Auth/System
  'password_history',
  'audit_logs',
];

const SKIP_TABLES = ['sessions', '_prisma_migrations'];

export interface BackupMetadata {
  version: string;
  createdAt: string;
  createdBy: { id: number; email: string; fullName: string } | null;
  tableCount: number;
  totalRows: number;
  includesAuditLogs: boolean;
  tables: Record<string, { count: number }>;
  checksum: string;
}

@Injectable()
export class BackupRestoreService {
  private readonly logger = new Logger(BackupRestoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Backup ──────────────────────────────────────────────────────────────────

  async createBackup(userId: number, includeAuditLogs: boolean) {
    const tables = includeAuditLogs
      ? TABLE_ORDER
      : TABLE_ORDER.filter((t) => t !== 'audit_logs');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true },
    });

    const data: Record<string, unknown[]> = {};
    const tableMeta: Record<string, { count: number }> = {};
    let totalRows = 0;

    for (const table of tables) {
      const rows: unknown[] = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "${table}" ORDER BY id`,
      );
      data[table] = rows;
      totalRows += rows.length;
      tableMeta[table] = { count: rows.length };
    }

    const dataJson = JSON.stringify(data);
    const checksum =
      'sha256:' + crypto.createHash('sha256').update(dataJson).digest('hex');

    const metadata: BackupMetadata = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      createdBy: user,
      tableCount: tables.length,
      totalRows,
      includesAuditLogs: includeAuditLogs,
      tables: tableMeta,
      checksum,
    };

    const backup = { metadata, data };
    const jsonBuffer = Buffer.from(JSON.stringify(backup));
    const gzipBuffer = zlib.gzipSync(jsonBuffer, { level: 6 });

    return { buffer: gzipBuffer, metadata };
  }

  // ─── Preview ─────────────────────────────────────────────────────────────────

  async parseAndPreview(buffer: Buffer, filename: string) {
    const backup = this.decompress(buffer, filename);
    this.validateStructure(backup);

    const currentCounts = await this.getTableCounts();

    const comparison = Object.entries(backup.metadata.tables as Record<string, { count: number }>)
      .map(([table, info]) => ({
        table,
        backupRows: info.count,
        currentRows: currentCounts[table] ?? 0,
        diff: info.count - (currentCounts[table] ?? 0),
      }));

    return {
      metadata: backup.metadata,
      comparison,
      warnings: this.generateWarnings(backup),
    };
  }

  // ─── Restore ─────────────────────────────────────────────────────────────────

  async restoreFromBackup(
    buffer: Buffer,
    filename: string,
    userId: number,
    includeAuditLogs: boolean,
  ) {
    const backup = this.decompress(buffer, filename);
    this.validateStructure(backup);
    this.verifyChecksum(backup);

    let tablesToRestore = TABLE_ORDER.filter((t) => t in backup.data);
    if (!includeAuditLogs) {
      tablesToRestore = tablesToRestore.filter((t) => t !== 'audit_logs');
    }
    tablesToRestore = tablesToRestore.filter((t) => !SKIP_TABLES.includes(t));

    const startTime = Date.now();
    const results: Record<string, { expected: number; inserted: number }> = {};

    try {
      // Step 1: Disable FK triggers
      await this.prisma.$executeRawUnsafe(
        `SET session_replication_role = replica`,
      );

      // Step 2: TRUNCATE in reverse dependency order
      const reversed = [...tablesToRestore].reverse();
      for (const table of reversed) {
        await this.prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${table}" CASCADE`,
        );
      }

      // Step 3: INSERT in dependency order
      for (const table of tablesToRestore) {
        const rows = (backup.data[table] as Record<string, unknown>[]) || [];
        if (rows.length === 0) {
          results[table] = { expected: 0, inserted: 0 };
          continue;
        }
        const columns = Object.keys(rows[0]);
        const inserted = await this.bulkInsert(table, columns, rows);
        results[table] = { expected: rows.length, inserted };
      }

      // Step 4: Reset sequences
      await this.resetSequences(tablesToRestore);

      // Step 5: Re-enable FK triggers
      await this.prisma.$executeRawUnsafe(
        `SET session_replication_role = DEFAULT`,
      );

      // Step 6: Verify
      const verification = await this.verifyRestore(tablesToRestore, backup.data);

      // Step 7: Audit log
      const elapsed = Date.now() - startTime;
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'RESTORE',
          entityType: 'Database',
          entityId: null,
          metadata: JSON.stringify({
            backupCreatedAt: backup.metadata.createdAt,
            backupCreatedBy: backup.metadata.createdBy?.email,
            tableCount: tablesToRestore.length,
            totalRows: Object.values(results).reduce((s, r) => s + r.inserted, 0),
            durationMs: elapsed,
          }),
        },
      });

      return {
        success: true,
        message: 'การกู้คืนข้อมูลสำเร็จ — Database restored successfully',
        duration: `${elapsed}ms`,
        results,
        verification,
      };
    } catch (error: unknown) {
      // Re-enable triggers on failure
      try {
        await this.prisma.$executeRawUnsafe(
          `SET session_replication_role = DEFAULT`,
        );
      } catch {}

      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Restore failed: ${msg}`);
      throw new InternalServerErrorException(
        `การกู้คืนล้มเหลว: ${msg} — Restore failed`,
      );
    }
  }

  // ─── Audit ───────────────────────────────────────────────────────────────────

  async logBackupAudit(userId: number, metadata: BackupMetadata) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BACKUP',
        entityType: 'Database',
        entityId: null,
        metadata: JSON.stringify({
          tableCount: metadata.tableCount,
          totalRows: metadata.totalRows,
          includesAuditLogs: metadata.includesAuditLogs,
          checksum: metadata.checksum,
        }),
      },
    });
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  async getDatabaseStatus() {
    const counts = await this.getTableCounts();
    const totalRows = Object.values(counts).reduce((s, c) => s + c, 0);
    return { tables: counts, totalRows, tableCount: Object.keys(counts).length };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private decompress(buffer: Buffer, filename: string): { metadata: BackupMetadata; data: Record<string, unknown[]> } {
    let jsonBuffer: Buffer;

    if (filename.endsWith('.gz') || filename.endsWith('.gzip')) {
      try {
        jsonBuffer = zlib.gunzipSync(buffer);
      } catch {
        throw new BadRequestException('ไฟล์ gzip ไม่ถูกต้อง — Invalid gzip file');
      }
    } else if (filename.endsWith('.json')) {
      jsonBuffer = buffer;
    } else {
      throw new BadRequestException(
        'รองรับเฉพาะ .json.gz หรือ .json — Only .json.gz or .json files supported',
      );
    }

    try {
      return JSON.parse(jsonBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('JSON ไม่ถูกต้อง — Invalid JSON in backup file');
    }
  }

  private validateStructure(backup: { metadata?: BackupMetadata; data?: Record<string, unknown[]> }) {
    if (!backup?.metadata?.version) {
      throw new BadRequestException(
        'ไฟล์สำรองไม่ถูกต้อง — Invalid backup: missing metadata.version',
      );
    }
    if (!backup?.data || typeof backup.data !== 'object') {
      throw new BadRequestException(
        'ไฟล์สำรองไม่ถูกต้อง — Invalid backup: missing data section',
      );
    }
    const required = ['drugs', 'cancer_sites', 'users'];
    for (const t of required) {
      if (!Array.isArray(backup.data[t])) {
        throw new BadRequestException(
          `ไฟล์สำรองขาดตาราง ${t} — Backup missing required table: ${t}`,
        );
      }
    }
  }

  private verifyChecksum(backup: { metadata: BackupMetadata; data: Record<string, unknown[]> }) {
    if (!backup.metadata.checksum) return;
    const dataJson = JSON.stringify(backup.data);
    const computed =
      'sha256:' + crypto.createHash('sha256').update(dataJson).digest('hex');
    if (computed !== backup.metadata.checksum) {
      throw new BadRequestException(
        'ข้อมูลไม่ตรงกับ checksum — Data integrity check failed',
      );
    }
  }

  private async bulkInsert(
    table: string,
    columns: string[],
    rows: Record<string, unknown>[],
  ): Promise<number> {
    const BATCH = 500;
    let total = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const colList = columns.map((c) => `"${c}"`).join(', ');
      const valueSets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      for (const row of batch) {
        const placeholders = columns.map(() => `$${idx++}`);
        valueSets.push(`(${placeholders.join(', ')})`);
        for (const col of columns) {
          params.push(row[col] ?? null);
        }
      }

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "${table}" (${colList}) VALUES ${valueSets.join(', ')} ON CONFLICT DO NOTHING`,
        ...params,
      );
      total += batch.length;
    }
    return total;
  }

  private async resetSequences(tables: string[]) {
    for (const table of tables) {
      try {
        const seqResult = await this.prisma.$queryRawUnsafe<{ seq_name: string | null }[]>(
          `SELECT pg_get_serial_sequence('"${table}"', 'id') AS seq_name`,
        );
        const seqName = seqResult[0]?.seq_name;
        if (!seqName) continue;

        const maxResult = await this.prisma.$queryRawUnsafe<{ max_id: number }[]>(
          `SELECT COALESCE(MAX(id), 0) AS max_id FROM "${table}"`,
        );
        const maxId = Number(maxResult[0]?.max_id) || 0;
        if (maxId > 0) {
          await this.prisma.$executeRawUnsafe(
            `SELECT setval('${seqName}', $1)`,
            maxId,
          );
        }
      } catch {
        // Non-fatal — some tables may not have an id sequence
      }
    }
  }

  private async verifyRestore(
    tables: string[],
    backupData: Record<string, unknown[]>,
  ) {
    const mismatches: { table: string; expected: number; actual: number }[] = [];
    const verified: string[] = [];

    for (const table of tables) {
      const expected = backupData[table]?.length ?? 0;
      const countResult = await this.prisma.$queryRawUnsafe<{ cnt: number }[]>(
        `SELECT COUNT(*)::int AS cnt FROM "${table}"`,
      );
      const actual = Number(countResult[0]?.cnt) || 0;

      if (actual !== expected) {
        mismatches.push({ table, expected, actual });
      } else {
        verified.push(table);
      }
    }

    return { allMatch: mismatches.length === 0, verified, mismatches };
  }

  private async getTableCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const table of TABLE_ORDER) {
      try {
        const result = await this.prisma.$queryRawUnsafe<{ cnt: number }[]>(
          `SELECT COUNT(*)::int AS cnt FROM "${table}"`,
        );
        counts[table] = Number(result[0]?.cnt) || 0;
      } catch {
        counts[table] = 0;
      }
    }
    return counts;
  }

  private generateWarnings(backup: { metadata: BackupMetadata; data: Record<string, unknown[]> }): string[] {
    const warnings: string[] = [];

    if (backup.metadata.includesAuditLogs) {
      const count = backup.metadata.tables?.audit_logs?.count ?? 0;
      if (count > 10000) {
        warnings.push(
          `ไฟล์มี audit logs ${count.toLocaleString()} รายการ อาจทำให้การกู้คืนช้า`,
        );
      }
    }

    if (!backup.metadata.checksum) {
      warnings.push('ไฟล์ไม่มี checksum สำหรับตรวจสอบความถูกต้อง');
    }

    const unknown = Object.keys(backup.data || {}).filter(
      (t) => !TABLE_ORDER.includes(t) && !SKIP_TABLES.includes(t),
    );
    if (unknown.length > 0) {
      warnings.push(`พบตารางที่ไม่รู้จัก: ${unknown.join(', ')} (จะถูกข้าม)`);
    }

    return warnings;
  }
}
