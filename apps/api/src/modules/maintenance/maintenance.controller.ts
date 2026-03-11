import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { PurgeDto, PurgeExportFilesDto, VacuumDto, ReindexDto, CancelQueryDto } from './dto/purge-data.dto';

@ApiTags('System Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  // ─── Category A: System Diagnostics ─────────────────────────

  @Get('system-info')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get system version, DB status, environment info' })
  async getSystemInfo() {
    return this.service.getSystemInfo();
  }

  @Get('db-table-sizes')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get per-table row counts and disk sizes' })
  async getDbTableSizes() {
    return this.service.getDbTableSizes();
  }

  @Get('resources')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get process memory and OS resource usage' })
  getResources() {
    return this.service.getResources();
  }

  // ─── Category B: Database Maintenance ───────────────────────

  @Get('db-active-queries')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List currently running PostgreSQL queries' })
  async getActiveQueries() {
    return this.service.getActiveQueries();
  }

  @Post('db-vacuum')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run VACUUM ANALYZE on a table or all tables' })
  async vacuum(@Body() dto: VacuumDto) {
    return this.service.vacuumTable(dto.table);
  }

  @Post('db-reindex')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run REINDEX on a specific table' })
  async reindex(@Body() dto: ReindexDto) {
    return this.service.reindexTable(dto.table);
  }

  @Post('db-cancel-query')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel a long-running PostgreSQL query by PID' })
  async cancelQuery(@Body() dto: CancelQueryDto) {
    return this.service.cancelQuery(dto.pid);
  }

  // ─── Category C: Session Management ─────────────────────────

  @Get('sessions')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all active sessions with user info' })
  async getSessions() {
    return this.service.getSessions();
  }

  @Post('sessions/purge-expired')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete all expired sessions' })
  async purgeExpiredSessions() {
    return this.service.purgeExpiredSessions();
  }

  @Post('sessions/revoke-all')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke all sessions except current user' })
  async revokeAllSessions(@CurrentUser('id') userId: number) {
    return this.service.revokeAllSessions(userId);
  }

  // ─── Category D: Cache Management ──────────────────────────

  @Get('cache-status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get dashboard and settings cache status' })
  getCacheStatus() {
    return this.service.getCacheStatus();
  }

  @Post('cache-clear')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clear all in-memory caches' })
  clearCaches() {
    return this.service.clearAllCaches();
  }

  // ─── Category E: Data Cleanup ──────────────────────────────

  @Get('data-stats')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get row counts and date ranges for operational tables' })
  async getDataStats() {
    return this.service.getDataStats();
  }

  @Post('purge-audit-logs')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete audit logs older than retention period' })
  async purgeAuditLogs(@Body() dto: PurgeDto) {
    return this.service.purgeAuditLogs(dto.retentionDays);
  }

  @Post('purge-ai-suggestions')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete AI suggestions older than retention period' })
  async purgeAiSuggestions(@Body() dto: PurgeDto) {
    return this.service.purgeAiSuggestions(dto.retentionDays);
  }

  @Post('purge-export-files')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clear ZIP file data from old export batches (preserve metadata)' })
  async purgeExportFiles(@Body() dto: PurgeExportFilesDto) {
    return this.service.purgeExportFiles(dto.retentionDays);
  }

  @Post('purge-scan-logs')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete old nightly scan logs and details' })
  async purgeScanLogs(@Body() dto: PurgeDto) {
    return this.service.purgeScanLogs(dto.retentionDays);
  }

  // ─── Category F: Data Integrity Check ──────────────────────

  @Get('integrity-check')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run data integrity checks (read-only)' })
  async integrityCheck() {
    return this.service.runIntegrityCheck();
  }
}
