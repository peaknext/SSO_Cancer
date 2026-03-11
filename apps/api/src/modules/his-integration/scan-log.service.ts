import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QueryScanLogsDto } from './dto/query-scan-logs.dto';
import { UpdateScanConfigDto } from './dto/update-scan-config.dto';

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

  async getScanConfig() {
    const keys = [
      'his_nightly_scan_enabled',
      'his_scan_filter_cancer_diag',
      'his_scan_filter_z510',
      'his_scan_filter_z511',
      'his_scan_filter_cancer_site_ids',
      'his_scan_filter_has_medications',
    ];
    const settings = await this.prisma.appSetting.findMany({
      where: { settingKey: { in: keys } },
    });
    const map = new Map(settings.map((s) => [s.settingKey, s.settingValue]));

    let cancerSiteIds: number[] = [];
    try {
      cancerSiteIds = JSON.parse(map.get('his_scan_filter_cancer_site_ids') || '[]');
    } catch { /* keep empty */ }

    return {
      enabled: map.get('his_nightly_scan_enabled') === 'true',
      cancerDiag: map.get('his_scan_filter_cancer_diag') !== 'false',
      z510: map.get('his_scan_filter_z510') === 'true',
      z511: map.get('his_scan_filter_z511') === 'true',
      cancerSiteIds,
      hasMedications: map.get('his_scan_filter_has_medications') === 'true',
    };
  }

  async updateScanConfig(dto: UpdateScanConfigDto) {
    const updates: { key: string; value: string }[] = [];
    if (dto.enabled !== undefined) updates.push({ key: 'his_nightly_scan_enabled', value: String(dto.enabled) });
    if (dto.cancerDiag !== undefined) updates.push({ key: 'his_scan_filter_cancer_diag', value: String(dto.cancerDiag) });
    if (dto.z510 !== undefined) updates.push({ key: 'his_scan_filter_z510', value: String(dto.z510) });
    if (dto.z511 !== undefined) updates.push({ key: 'his_scan_filter_z511', value: String(dto.z511) });
    if (dto.cancerSiteIds !== undefined) updates.push({ key: 'his_scan_filter_cancer_site_ids', value: JSON.stringify(dto.cancerSiteIds) });
    if (dto.hasMedications !== undefined) updates.push({ key: 'his_scan_filter_has_medications', value: String(dto.hasMedications) });

    for (const { key, value } of updates) {
      await this.prisma.appSetting.upsert({
        where: { settingKey: key },
        update: { settingValue: value },
        create: { settingKey: key, settingValue: value, settingGroup: 'hospital', description: '' },
      });
    }
    return this.getScanConfig();
  }
}
