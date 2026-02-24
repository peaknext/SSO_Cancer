import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QuerySsoProtocolDrugsDto } from './dto/query-sso-protocol-drugs.dto';

@Injectable()
export class SsoProtocolDrugsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QuerySsoProtocolDrugsDto) {
    const {
      page = 1,
      limit = 25,
      sortBy = 'id',
      sortOrder = 'asc',
      search,
      protocolCode,
      formulaCategory,
      minRate,
      maxRate,
    } = query;

    const where: Prisma.SsoProtocolDrugWhereInput = { isActive: true };

    if (search) {
      const asNum = parseInt(search, 10);
      if (!isNaN(asNum)) {
        where.OR = [
          { aipnCode: asNum },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        where.description = { contains: search, mode: 'insensitive' };
      }
    }

    if (protocolCode) where.protocolCode = protocolCode;
    if (formulaCategory !== undefined && formulaCategory !== '')
      where.formulaCategory = formulaCategory;

    if (minRate !== undefined || maxRate !== undefined) {
      where.rate = {};
      if (minRate !== undefined) where.rate.gte = minRate;
      if (maxRate !== undefined) where.rate.lte = maxRate;
    }

    const [data, total] = await Promise.all([
      this.prisma.ssoProtocolDrug.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ssoProtocolDrug.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findByProtocol(protocolCode: string) {
    return this.prisma.ssoProtocolDrug.findMany({
      where: { protocolCode, isActive: true },
      orderBy: { aipnCode: 'asc' },
    });
  }

  async findByAipnCode(aipnCode: number) {
    return this.prisma.ssoProtocolDrug.findMany({
      where: { aipnCode, isActive: true },
      orderBy: { protocolCode: 'asc' },
    });
  }

  async getStats() {
    const [total, protocolGroups, drugGroups, categoryBreakdown] =
      await Promise.all([
        this.prisma.ssoProtocolDrug.count({ where: { isActive: true } }),
        this.prisma.ssoProtocolDrug.groupBy({
          by: ['protocolCode'],
          where: { isActive: true },
        }),
        this.prisma.ssoProtocolDrug.groupBy({
          by: ['aipnCode'],
          where: { isActive: true },
        }),
        this.prisma.ssoProtocolDrug.groupBy({
          by: ['formulaCategory'],
          where: { isActive: true },
          _count: { _all: true },
        }),
      ]);

    return {
      totalEntries: total,
      uniqueProtocols: protocolGroups.length,
      uniqueDrugs: drugGroups.length,
      byCategory: categoryBreakdown.map((c) => ({
        category: c.formulaCategory || 'standard',
        count: c._count._all,
      })),
    };
  }

  /**
   * Core formulary compliance check.
   * Given a protocol code and list of AIPN codes, returns compliance data.
   */
  async checkFormularyCompliance(
    protocolCode: string,
    aipnCodes: number[],
  ) {
    if (aipnCodes.length === 0) {
      return { compliant: [], nonCompliant: [], complianceRatio: 0 };
    }

    const formularyItems = await this.prisma.ssoProtocolDrug.findMany({
      where: {
        protocolCode,
        aipnCode: { in: aipnCodes },
        isActive: true,
      },
    });

    const formularyMap = new Map(
      formularyItems.map((f) => [f.aipnCode, f]),
    );

    const compliant: {
      aipnCode: number;
      rate: number;
      unit: string;
      category: string;
      description: string;
    }[] = [];
    const nonCompliant: number[] = [];

    for (const code of aipnCodes) {
      const item = formularyMap.get(code);
      if (item) {
        compliant.push({
          aipnCode: item.aipnCode,
          rate: Number(item.rate),
          unit: item.unit,
          category: item.formulaCategory || 'standard',
          description: item.description,
        });
      } else {
        nonCompliant.push(code);
      }
    }

    return {
      compliant,
      nonCompliant,
      complianceRatio:
        aipnCodes.length > 0
          ? Math.round((compliant.length / aipnCodes.length) * 100)
          : 0,
    };
  }

  /**
   * Batch lookup: get formulary AIPN code sets for multiple protocol codes.
   * Used by matching service to annotate protocol matches.
   */
  async getFormularyAipnSets(
    protocolCodes: string[],
  ): Promise<Map<string, Set<number>>> {
    if (protocolCodes.length === 0) return new Map();

    const items = await this.prisma.ssoProtocolDrug.findMany({
      where: {
        protocolCode: { in: protocolCodes },
        isActive: true,
      },
      select: { protocolCode: true, aipnCode: true },
    });

    const result = new Map<string, Set<number>>();
    for (const item of items) {
      if (!result.has(item.protocolCode)) {
        result.set(item.protocolCode, new Set());
      }
      result.get(item.protocolCode)!.add(item.aipnCode);
    }
    return result;
  }

  /**
   * Extract generic drug name from SSO description.
   * Format: "BRAND (MANUFACTURER, COUNTRY) (generic_name DOSAGE) ..."
   */
  private extractGenericName(description: string): string | null {
    const match = description.match(/\)\s*\(([^()]+?)\s+\d/);
    return match ? match[1].trim().toLowerCase() : null;
  }

  /**
   * Batch lookup: get formulary drug generic names for multiple protocol codes.
   * Used by matching service to check formulary compliance via resolved drug names
   * instead of AIPN codes (which use a different numbering system than hospital codes).
   */
  async getFormularyDrugNames(
    protocolCodes: string[],
  ): Promise<Map<string, Set<string>>> {
    if (protocolCodes.length === 0) return new Map();

    const items = await this.prisma.ssoProtocolDrug.findMany({
      where: {
        protocolCode: { in: protocolCodes },
        isActive: true,
      },
      select: { protocolCode: true, description: true },
    });

    const result = new Map<string, Set<string>>();
    for (const item of items) {
      const genericName = this.extractGenericName(item.description);
      if (!genericName) continue;
      if (!result.has(item.protocolCode)) {
        result.set(item.protocolCode, new Set());
      }
      result.get(item.protocolCode)!.add(genericName);
    }
    return result;
  }
}
