import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditLogsDto) {
    const { page = 1, limit = 25, sortBy = 'createdAt', sortOrder = 'desc', userId, action, entityType, dateFrom, dateTo } = query;
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async exportCsv(query: QueryAuditLogsDto) {
    const { userId, action, entityType, dateFrom, dateTo } = query;
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const header = 'ID,Date,User,Email,Action,Entity Type,Entity ID,IP Address\n';
    const rows = logs.map((log) =>
      [
        log.id,
        log.createdAt.toISOString(),
        `"${log.user?.fullName || 'System'}"`,
        log.user?.email || '',
        log.action,
        log.entityType,
        log.entityId ?? '',
        log.ipAddress || '',
      ].join(','),
    );

    return header + rows.join('\n');
  }

  async purgeOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
    return result.count;
  }
}
