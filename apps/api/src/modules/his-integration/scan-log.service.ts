import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QueryScanLogsDto } from './dto/query-scan-logs.dto';

@Injectable()
export class ScanLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryScanLogsDto) {
    const { page = 1, limit = 25, sortBy = 'createdAt', sortOrder = 'desc', status, dateFrom, dateTo } = query;

    const where: Prisma.NightlyScanLogWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.scanDate = {};
      if (dateFrom) where.scanDate.gte = dateFrom;
      if (dateTo) where.scanDate.lte = dateTo;
    }

    const [data, total] = await Promise.all([
      this.prisma.nightlyScanLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { details: true } },
        },
      }),
      this.prisma.nightlyScanLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: number) {
    const scanLog = await this.prisma.nightlyScanLog.findUnique({
      where: { id },
      include: {
        details: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!scanLog) return null;

    // Enrich details with patientId for linking
    const hns = scanLog.details.map((d) => d.hn);
    const patients = await this.prisma.patient.findMany({
      where: { hn: { in: hns } },
      select: { id: true, hn: true },
    });
    const hnToPatientId = new Map(patients.map((p) => [p.hn, p.id]));

    return {
      ...scanLog,
      details: scanLog.details.map((d) => ({
        ...d,
        patientId: hnToPatientId.get(d.hn) || null,
      })),
    };
  }
}
