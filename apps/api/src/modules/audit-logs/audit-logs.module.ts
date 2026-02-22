import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsCleanupService } from './audit-logs-cleanup.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogsCleanupService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
