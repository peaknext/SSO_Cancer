import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from './audit-logs.service';

const DEFAULT_RETENTION_DAYS = 90;

@Injectable()
export class AuditLogsCleanupService {
  private readonly logger = new Logger(AuditLogsCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    const retentionDays = await this.getRetentionDays();
    const deleted = await this.auditLogsService.purgeOldLogs(retentionDays);
    if (deleted > 0) {
      this.logger.log(
        `Purged ${deleted} audit logs older than ${retentionDays} days`,
      );
    }
  }

  private async getRetentionDays(): Promise<number> {
    try {
      const setting = await this.prisma.appSetting.findFirst({
        where: {
          settingGroup: 'system',
          settingKey: 'audit_log_retention_days',
          isActive: true,
        },
      });
      if (setting) {
        const days = parseInt(setting.settingValue, 10);
        if (!isNaN(days) && days > 0) return days;
      }
    } catch {
      // fall through to default
    }
    return DEFAULT_RETENTION_DAYS;
  }
}
