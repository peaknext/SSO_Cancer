import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { VALID_TABLE_NAMES } from './dto/purge-data.dto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
  ) {}

  // ─── Category A: System Diagnostics ─────────────────────────

  async getSystemInfo() {
    let dbVersion = 'unknown';
    let dbName = 'unknown';
    let dbSizeBytes = 0;
    let dbConnected = false;

    try {
      const versionResult = await this.prisma.$queryRawUnsafe<{ version: string }[]>(
        'SELECT version()',
      );
      dbVersion = versionResult[0]?.version?.split(' ').slice(0, 2).join(' ') || 'unknown';

      const nameResult = await this.prisma.$queryRawUnsafe<{ current_database: string }[]>(
        'SELECT current_database()',
      );
      dbName = nameResult[0]?.current_database || 'unknown';

      const sizeResult = await this.prisma.$queryRawUnsafe<{ size: bigint }[]>(
        'SELECT pg_database_size(current_database()) as size',
      );
      dbSizeBytes = Number(sizeResult[0]?.size || 0);
      dbConnected = true;
    } catch {
      dbConnected = false;
    }

    // Read app version from root package.json (process.cwd = repo root for both dev & prod)
    let appVersion = 'unknown';
    try {
      const rootPkg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
      );
      appVersion = rootPkg.version || 'unknown';
    } catch {
      // fallback: try relative to __dirname (compiled dist)
      try {
        for (const rel of ['../../../../package.json', '../../../../../package.json']) {
          const p = path.resolve(__dirname, rel);
          if (fs.existsSync(p)) {
            appVersion = JSON.parse(fs.readFileSync(p, 'utf8')).version || 'unknown';
            break;
          }
        }
      } catch {}
    }

    // Read dependency versions (monorepo: NestJS in apps/api, Prisma in root)
    const deps: Record<string, string> = {};
    try {
      const cwd = process.cwd();
      const apiPkg = JSON.parse(
        fs.readFileSync(path.join(cwd, 'apps', 'api', 'package.json'), 'utf8'),
      );
      deps.nestjs = apiPkg.dependencies?.['@nestjs/core'] || 'unknown';

      const rootPkgDeps = JSON.parse(
        fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'),
      );
      deps.prisma = rootPkgDeps.dependencies?.['@prisma/client'] || 'unknown';
    } catch {
      // fallback
    }

    const uptimeSeconds = Math.floor(process.uptime());

    return {
      app: {
        version: appVersion,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptimeSeconds,
        startedAt: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
      },
      db: {
        connected: dbConnected,
        version: dbVersion,
        name: dbName,
        sizeBytes: dbSizeBytes,
        sizeFormatted: this.formatBytes(dbSizeBytes),
      },
      env: {
        nodeEnv: process.env.NODE_ENV || 'development',
        apiPort: process.env.PORT || process.env.API_PORT || '48002',
        encryptionConfigured: !!process.env.SETTINGS_ENCRYPTION_KEY,
        backupEncryptionConfigured: !!process.env.BACKUP_ENCRYPTION_KEY,
      },
      dependencies: deps,
    };
  }

  async getDbTableSizes() {
    const results = await this.prisma.$queryRawUnsafe<
      { table_name: string; row_count: bigint; disk_size: bigint; index_size: bigint }[]
    >(`
      SELECT
        c.relname AS table_name,
        c.reltuples::bigint AS row_count,
        pg_total_relation_size(c.oid) AS disk_size,
        pg_indexes_size(c.oid) AS index_size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
    `);

    return results.map((r) => ({
      table: r.table_name,
      rowCount: Number(r.row_count),
      diskSize: Number(r.disk_size),
      diskSizeFormatted: this.formatBytes(Number(r.disk_size)),
      indexSize: Number(r.index_size),
      indexSizeFormatted: this.formatBytes(Number(r.index_size)),
    }));
  }

  getResources() {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      process: {
        rss: mem.rss,
        rssFormatted: this.formatBytes(mem.rss),
        heapTotal: mem.heapTotal,
        heapTotalFormatted: this.formatBytes(mem.heapTotal),
        heapUsed: mem.heapUsed,
        heapUsedFormatted: this.formatBytes(mem.heapUsed),
        external: mem.external,
        externalFormatted: this.formatBytes(mem.external),
      },
      os: {
        totalMemory: totalMem,
        totalMemoryFormatted: this.formatBytes(totalMem),
        freeMemory: freeMem,
        freeMemoryFormatted: this.formatBytes(freeMem),
        usedMemoryPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
        cpuCount: os.cpus().length,
        uptimeSeconds: Math.floor(os.uptime()),
        platform: os.platform(),
        hostname: os.hostname(),
      },
    };
  }

  // ─── Category B: Database Maintenance ───────────────────────

  async getActiveQueries() {
    const results = await this.prisma.$queryRawUnsafe<
      {
        pid: number;
        duration_seconds: number;
        query: string;
        state: string;
        wait_event_type: string | null;
      }[]
    >(`
      SELECT
        pid,
        EXTRACT(EPOCH FROM (now() - query_start))::numeric(10,2) AS duration_seconds,
        LEFT(query, 200) AS query,
        state,
        wait_event_type
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND pid != pg_backend_pid()
      ORDER BY query_start ASC
      LIMIT 20
    `);

    return results.map((r) => ({
      pid: r.pid,
      durationSeconds: Number(r.duration_seconds),
      query: r.query,
      state: r.state,
      waitEventType: r.wait_event_type,
    }));
  }

  async vacuumTable(table?: string) {
    if (table) {
      this.validateTableName(table);
    }

    const start = Date.now();
    if (table) {
      await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE "${table}"`);
    } else {
      await this.prisma.$executeRawUnsafe('VACUUM ANALYZE');
    }
    const duration = Date.now() - start;

    this.logger.log(`VACUUM ANALYZE ${table || 'ALL'} completed in ${duration}ms`);
    return {
      table: table || 'ALL',
      durationMs: duration,
      message: `VACUUM ANALYZE ${table || 'ทุกตาราง'} สำเร็จ (${duration}ms)`,
    };
  }

  async reindexTable(table: string) {
    this.validateTableName(table);

    const start = Date.now();
    await this.prisma.$executeRawUnsafe(`REINDEX TABLE "${table}"`);
    const duration = Date.now() - start;

    this.logger.log(`REINDEX TABLE ${table} completed in ${duration}ms`);
    return {
      table,
      durationMs: duration,
      message: `REINDEX TABLE ${table} สำเร็จ (${duration}ms)`,
    };
  }

  async cancelQuery(pid: number) {
    const result = await this.prisma.$queryRawUnsafe<{ pg_cancel_backend: boolean }[]>(
      `SELECT pg_cancel_backend($1)`,
      pid,
    );
    const success = result[0]?.pg_cancel_backend ?? false;
    return {
      success,
      pid,
      message: success ? `ยกเลิก query PID ${pid} สำเร็จ` : `ไม่สามารถยกเลิก query PID ${pid}`,
    };
  }

  // ─── Category C: Session Management ─────────────────────────

  async getSessions() {
    const sessions = await this.prisma.session.findMany({
      include: {
        user: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    const now = new Date();
    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userEmail: s.user?.email || 'unknown',
      userFullName: s.user?.fullName || 'unknown',
      userRole: s.user?.role || 'unknown',
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      isExpired: s.expiresAt < now,
    }));
  }

  async purgeExpiredSessions() {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`Purged ${result.count} expired sessions`);
    return { deletedCount: result.count, message: `ลบเซสชันหมดอายุ ${result.count} รายการ` };
  }

  async revokeAllSessions(currentUserId: number) {
    const result = await this.prisma.session.deleteMany({
      where: { userId: { not: currentUserId } },
    });
    this.logger.log(`Revoked ${result.count} sessions (excluding user ${currentUserId})`);
    return {
      deletedCount: result.count,
      message: `ยกเลิกเซสชันทั้งหมด ${result.count} รายการ (ยกเว้นเซสชันปัจจุบัน)`,
    };
  }

  // ─── Category D: Cache Management ──────────────────────────

  getCacheStatus() {
    return {
      dashboard: {
        keys: this.dashboardService.getCacheKeys(),
        size: this.dashboardService.getCacheKeys().length,
      },
      settingsCacheTtl: '60s (in-memory, per-service)',
    };
  }

  clearAllCaches() {
    this.dashboardService.clearCache();
    this.logger.log('All caches cleared');
    return {
      cleared: ['dashboard'],
      message: 'ล้างแคชทั้งหมดสำเร็จ — ข้อมูลจะโหลดใหม่ในครั้งถัดไป',
    };
  }

  // ─── Category E: Data Cleanup ──────────────────────────────

  async getDataStats() {
    const [
      visitTotal,
      visitOldest,
      visitNewest,
      visitWithoutCase,
      auditTotal,
      auditOldest,
      auditNewest,
      aiTotal,
      aiOldest,
      aiNewest,
      batchTotal,
      batchOldest,
      batchNewest,
      scanLogTotal,
      scanLogOldest,
      scanLogNewest,
      importTotal,
      importOldest,
      importNewest,
    ] = await Promise.all([
      this.prisma.patientVisit.count(),
      this.prisma.patientVisit.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.patientVisit.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.patientVisit.count({ where: { caseId: null } }),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.aiSuggestion.count(),
      this.prisma.aiSuggestion.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.aiSuggestion.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.billingExportBatch.count(),
      this.prisma.billingExportBatch.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.billingExportBatch.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.nightlyScanLog.count(),
      this.prisma.nightlyScanLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.nightlyScanLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      this.prisma.patientImport.count(),
      this.prisma.patientImport.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.patientImport.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);

    // Estimate export batch file storage
    let batchFileSizeBytes = 0;
    try {
      const sizeResult = await this.prisma.$queryRawUnsafe<{ total_size: bigint }[]>(
        `SELECT COALESCE(SUM(octet_length(file_data)), 0) AS total_size FROM billing_export_batches WHERE file_data IS NOT NULL`,
      );
      batchFileSizeBytes = Number(sizeResult[0]?.total_size || 0);
    } catch {
      // table may not have file_data column in older schemas
    }

    return {
      visits: {
        total: visitTotal,
        oldestDate: visitOldest?.createdAt || null,
        newestDate: visitNewest?.createdAt || null,
        withoutCaseCount: visitWithoutCase,
      },
      auditLogs: {
        total: auditTotal,
        oldestDate: auditOldest?.createdAt || null,
        newestDate: auditNewest?.createdAt || null,
      },
      aiSuggestions: {
        total: aiTotal,
        oldestDate: aiOldest?.createdAt || null,
        newestDate: aiNewest?.createdAt || null,
      },
      billingExportBatches: {
        total: batchTotal,
        totalFileSizeBytes: batchFileSizeBytes,
        totalFileSizeFormatted: this.formatBytes(batchFileSizeBytes),
        oldestDate: batchOldest?.createdAt || null,
        newestDate: batchNewest?.createdAt || null,
      },
      nightlyScanLogs: {
        total: scanLogTotal,
        oldestDate: scanLogOldest?.createdAt || null,
        newestDate: scanLogNewest?.createdAt || null,
      },
      patientImports: {
        total: importTotal,
        oldestDate: importOldest?.createdAt || null,
        newestDate: importNewest?.createdAt || null,
      },
    };
  }

  async purgeAuditLogs(retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Purged ${result.count} audit logs older than ${retentionDays} days`);
    return {
      deletedCount: result.count,
      retentionDays,
      cutoffDate: cutoff.toISOString(),
      message: `ลบบันทึกกิจกรรมเก่ากว่า ${retentionDays} วัน จำนวน ${result.count} รายการ`,
    };
  }

  async purgeAiSuggestions(retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.prisma.aiSuggestion.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Purged ${result.count} AI suggestions older than ${retentionDays} days`);
    return {
      deletedCount: result.count,
      retentionDays,
      cutoffDate: cutoff.toISOString(),
      message: `ลบ AI suggestions เก่ากว่า ${retentionDays} วัน จำนวน ${result.count} รายการ`,
    };
  }

  async purgeExportFiles(retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Set fileData to null instead of deleting — preserve metadata
    const result = await this.prisma.billingExportBatch.updateMany({
      where: {
        createdAt: { lt: cutoff },
        fileData: { not: null },
      },
      data: { fileData: null },
    });

    this.logger.log(`Cleared file data from ${result.count} export batches older than ${retentionDays} days`);
    return {
      clearedCount: result.count,
      retentionDays,
      cutoffDate: cutoff.toISOString(),
      message: `ล้างไฟล์ ZIP จาก export batch เก่ากว่า ${retentionDays} วัน จำนวน ${result.count} รายการ (ข้อมูลสรุปยังคงอยู่)`,
    };
  }

  async purgeScanLogs(retentionDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Delete details first (FK constraint)
    const detailResult = await this.prisma.nightlyScanDetail.deleteMany({
      where: { scanLog: { createdAt: { lt: cutoff } } },
    });

    const logResult = await this.prisma.nightlyScanLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(
      `Purged ${logResult.count} scan logs + ${detailResult.count} details older than ${retentionDays} days`,
    );
    return {
      deletedLogs: logResult.count,
      deletedDetails: detailResult.count,
      retentionDays,
      cutoffDate: cutoff.toISOString(),
      message: `ลบบันทึกสแกน ${logResult.count} รายการ + รายละเอียด ${detailResult.count} รายการ`,
    };
  }

  // ─── Category F: Data Integrity Check ──────────────────────

  async runIntegrityCheck() {
    const checks: { name: string; nameThai: string; status: 'ok' | 'warning' | 'error'; count: number; message: string }[] = [];

    // 1. Patients with visits but no active case
    const patientsNoCaseCount = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(DISTINCT p.id) AS count
      FROM patients p
      JOIN patient_visits pv ON pv.hn = p.hn
      WHERE NOT EXISTS (
        SELECT 1 FROM patient_cases pc WHERE pc.patient_id = p.id AND pc.is_active = true
      )
      AND p.is_active = true
    `);
    const noCaseCount = Number(patientsNoCaseCount[0]?.count || 0);
    checks.push({
      name: 'patients_without_case',
      nameThai: 'ผู้ป่วยที่มี visit แต่ไม่มีเคส',
      status: noCaseCount > 0 ? 'warning' : 'ok',
      count: noCaseCount,
      message: noCaseCount > 0 ? `พบ ${noCaseCount} ราย — ควรสร้างเคสรักษา` : 'ไม่พบปัญหา',
    });

    // 2. Visits with unresolved drugs
    const unresolvedDrugs = await this.prisma.visitMedication.count({
      where: {
        resolvedDrugId: null,
        medicationName: { not: '' },
      },
    });
    checks.push({
      name: 'unresolved_drugs',
      nameThai: 'ยาที่จับคู่ไม่ได้',
      status: unresolvedDrugs > 0 ? 'warning' : 'ok',
      count: unresolvedDrugs,
      message: unresolvedDrugs > 0
        ? `พบ ${unresolvedDrugs} รายการ — อาจต้องเพิ่มชื่อการค้าหรือตรวจสอบสะกด`
        : 'ไม่พบปัญหา',
    });

    // 3. Regimens with no drugs
    const emptyRegimens = await this.prisma.regimen.count({
      where: { isActive: true, regimenDrugs: { none: {} } },
    });
    checks.push({
      name: 'empty_regimens',
      nameThai: 'สูตรยาที่ไม่มียา',
      status: emptyRegimens > 0 ? 'warning' : 'ok',
      count: emptyRegimens,
      message: emptyRegimens > 0 ? `พบ ${emptyRegimens} สูตร — ควรเพิ่มยาในสูตร` : 'ไม่พบปัญหา',
    });

    // 4. Duplicate patient HNs
    const dupHns = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(*) AS count FROM (
        SELECT hn FROM patients WHERE is_active = true GROUP BY hn HAVING COUNT(*) > 1
      ) sub
    `);
    const dupCount = Number(dupHns[0]?.count || 0);
    checks.push({
      name: 'duplicate_hns',
      nameThai: 'HN ซ้ำกัน',
      status: dupCount > 0 ? 'error' : 'ok',
      count: dupCount,
      message: dupCount > 0 ? `พบ ${dupCount} HN ที่ซ้ำกัน — ต้องตรวจสอบและแก้ไข` : 'ไม่พบปัญหา',
    });

    // 5. Sessions of deactivated users
    const orphanedSessions = await this.prisma.session.count({
      where: { user: { isActive: false } },
    });
    checks.push({
      name: 'orphaned_sessions',
      nameThai: 'เซสชันของผู้ใช้ที่ปิดใช้งาน',
      status: orphanedSessions > 0 ? 'warning' : 'ok',
      count: orphanedSessions,
      message: orphanedSessions > 0
        ? `พบ ${orphanedSessions} เซสชัน — ควร purge`
        : 'ไม่พบปัญหา',
    });

    // 6. Visits with billing claims but no billing items
    const claimsNoBilling = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(DISTINCT vbc.visit_id) AS count
      FROM visit_billing_claims vbc
      LEFT JOIN visit_billing_items vbi ON vbi.visit_id = vbc.visit_id AND vbi.is_active = true
      WHERE vbc.is_active = true AND vbi.id IS NULL
    `);
    const claimsNoBillingCount = Number(claimsNoBilling[0]?.count || 0);
    checks.push({
      name: 'claims_without_billing_items',
      nameThai: 'Visit มี billing claim แต่ไม่มี billing items',
      status: claimsNoBillingCount > 0 ? 'warning' : 'ok',
      count: claimsNoBillingCount,
      message: claimsNoBillingCount > 0
        ? `พบ ${claimsNoBillingCount} visit — ข้อมูลอาจไม่สมบูรณ์`
        : 'ไม่พบปัญหา',
    });

    // 7. Expired sessions not cleaned up
    const expiredSessions = await this.prisma.session.count({
      where: { expiresAt: { lt: new Date() } },
    });
    checks.push({
      name: 'expired_sessions',
      nameThai: 'เซสชันหมดอายุที่ยังไม่ลบ',
      status: expiredSessions > 10 ? 'warning' : 'ok',
      count: expiredSessions,
      message: expiredSessions > 0
        ? `พบ ${expiredSessions} เซสชัน — ใช้ "ลบเซสชันหมดอายุ" เพื่อล้าง`
        : 'ไม่พบปัญหา',
    });

    const totalIssues = checks.reduce((sum, c) => sum + (c.status !== 'ok' ? c.count : 0), 0);

    return {
      checks,
      checkedAt: new Date().toISOString(),
      totalIssues,
      summary: totalIssues > 0 ? `พบปัญหา ${totalIssues} รายการ` : 'ระบบปกติ — ไม่พบปัญหา',
    };
  }

  // ─── Helpers ───────────────────────────────────────────────

  private validateTableName(table: string): void {
    if (!VALID_TABLE_NAMES.has(table)) {
      throw new BadRequestException(
        `ชื่อตารางไม่ถูกต้อง: ${table} — Table name not in allowlist`,
      );
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }
}
