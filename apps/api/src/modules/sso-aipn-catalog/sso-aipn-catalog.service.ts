import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QuerySsoAipnDto } from './dto/query-sso-aipn.dto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AipnParsedRow {
  billingGroup: string;
  code: number;
  unit: string;
  rate: number;
  rate2: number;
  description: string;
  dateRevised: string;
  dateEffective: string;
  dateExpiry: string;
  lastUpdated: string;
  condition: string;
  note: string;
}

export interface AipnFieldChange {
  old: string | number;
  new: string | number;
}

export interface AipnDiffResult {
  fileRowCount: number;
  filteredRowCount: number;
  newCodes: AipnParsedRow[];
  newVersions: AipnParsedRow[];
  changedItems: {
    current: {
      code: number;
      description: string;
      rate: number;
      unit: string;
      dateEffective: string;
      dateExpiry: string;
    };
    incoming: AipnParsedRow;
    changes: Record<string, AipnFieldChange>;
  }[];
  removedItems: { code: number; description: string; rate: number }[];
  unchangedCount: number;
}

export interface AipnImportResult {
  created: number;
  updated: number;
  deactivated: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SsoAipnCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Existing CRUD ────────────────────────────────────────────────────────

  async findAll(query: QuerySsoAipnDto) {
    const {
      page = 1,
      limit = 25,
      sortBy = 'code',
      sortOrder = 'asc',
      search,
      billingGroup,
      minPrice,
      maxPrice,
      asOfDate,
    } = query;

    const where: Prisma.SsoAipnItemWhereInput = {};

    if (search) {
      const asNum = parseInt(search, 10);
      if (!isNaN(asNum)) {
        where.OR = [
          { code: asNum },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        where.description = { contains: search, mode: 'insensitive' };
      }
    }

    if (billingGroup) {
      where.billingGroup = billingGroup;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.rate = {};
      if (minPrice !== undefined) where.rate.gte = minPrice;
      if (maxPrice !== undefined) where.rate.lte = maxPrice;
    }

    if (asOfDate) {
      const d = new Date(asOfDate);
      where.isActive = true;
      where.dateEffective = { lte: d };
      where.dateExpiry = { gte: d };
    }

    const [data, total] = await Promise.all([
      this.prisma.ssoAipnItem.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ssoAipnItem.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /** Returns all versions for a code, newest first */
  async findByCode(code: number) {
    return this.prisma.ssoAipnItem.findMany({
      where: { code, isActive: true },
      orderBy: { dateEffective: 'desc' },
    });
  }

  /** Returns the version effective on asOfDate, or null */
  async findByCodeAsOf(code: number, asOfDate: Date) {
    return this.prisma.ssoAipnItem.findFirst({
      where: {
        code,
        isActive: true,
        dateEffective: { lte: asOfDate },
        dateExpiry: { gte: asOfDate },
      },
      orderBy: { dateEffective: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.ssoAipnItem.findUnique({ where: { id } });
  }

  async getStats() {
    const [total, drugCount, equipmentCount, priceAgg, uniqueCodeGroups] =
      await Promise.all([
        this.prisma.ssoAipnItem.count(),
        this.prisma.ssoAipnItem.count({ where: { billingGroup: '03' } }),
        this.prisma.ssoAipnItem.count({
          where: { billingGroup: { not: '03' } },
        }),
        this.prisma.ssoAipnItem.aggregate({
          _avg: { rate: true },
          _max: { rate: true },
          _min: { rate: true },
        }),
        this.prisma.ssoAipnItem.groupBy({ by: ['code'] }),
      ]);
    return {
      total,
      uniqueCodes: uniqueCodeGroups.length,
      drugCount,
      equipmentCount,
      priceStats: priceAgg,
    };
  }

  // ─── dateEffective utility ────────────────────────────────────────────────

  /** Get AIPN codes that are effective (not expired) on a given date */
  async getValidAipnCodes(asOfDate: Date): Promise<Set<number>> {
    const items = await this.prisma.ssoAipnItem.findMany({
      where: {
        isActive: true,
        dateEffective: { lte: asOfDate },
        dateExpiry: { gte: asOfDate },
      },
      select: { code: true },
    });
    return new Set(items.map((i) => i.code));
  }

  /** Get all AIPN item versions as a map for batch date validation */
  async getAipnDateMap(): Promise<
    Map<number, Array<{ dateEffective: Date; dateExpiry: Date }>>
  > {
    const items = await this.prisma.ssoAipnItem.findMany({
      where: { isActive: true },
      select: { code: true, dateEffective: true, dateExpiry: true },
      orderBy: { dateEffective: 'asc' },
    });
    const map = new Map<
      number,
      Array<{ dateEffective: Date; dateExpiry: Date }>
    >();
    for (const item of items) {
      if (!map.has(item.code)) map.set(item.code, []);
      map.get(item.code)!.push({
        dateEffective: item.dateEffective,
        dateExpiry: item.dateExpiry,
      });
    }
    return map;
  }

  // ─── Import: Parse & Diff ─────────────────────────────────────────────────

  async parseAndDiff(buffer: Buffer): Promise<AipnDiffResult> {
    const parsed = this.parseXlsx(buffer);

    // Load existing items, index by composite key (code:dateEffective)
    const existing = await this.prisma.ssoAipnItem.findMany();
    const dbMap = new Map(
      existing.map((item) => [
        `${item.code}:${this.dateToISO(item.dateEffective)}`,
        item,
      ]),
    );
    // Set of all codes in DB for removal detection
    const existingCodeSet = new Set(existing.map((item) => item.code));

    const newCodes: AipnParsedRow[] = [];
    const newVersions: AipnParsedRow[] = [];
    const changedItems: AipnDiffResult['changedItems'] = [];
    let unchangedCount = 0;
    const fileCodes = new Set<number>();

    for (const row of parsed.filtered) {
      fileCodes.add(row.code);
      const compositeKey = `${row.code}:${row.dateEffective}`;
      const db = dbMap.get(compositeKey);

      if (!db) {
        // Code doesn't exist in DB at all → new code; code exists but different dateEffective → new version
        if (existingCodeSet.has(row.code)) {
          newVersions.push(row);
        } else {
          newCodes.push(row);
        }
        continue;
      }

      // Compare fields (same code + same dateEffective)
      const changes: Record<string, AipnFieldChange> = {};
      if (Number(db.rate) !== row.rate) {
        changes.rate = { old: Number(db.rate), new: row.rate };
      }
      if (Number(db.rate2) !== row.rate2) {
        changes.rate2 = { old: Number(db.rate2), new: row.rate2 };
      }
      if (db.description !== row.description) {
        changes.description = { old: db.description, new: row.description };
      }
      if (db.unit !== row.unit) {
        changes.unit = { old: db.unit, new: row.unit };
      }
      if (db.billingGroup !== row.billingGroup) {
        changes.billingGroup = { old: db.billingGroup, new: row.billingGroup };
      }
      const dbDateExp = this.dateToISO(db.dateExpiry);
      if (dbDateExp !== row.dateExpiry) {
        changes.dateExpiry = { old: dbDateExp, new: row.dateExpiry };
      }
      const dbDateRev = this.dateToISO(db.dateRevised);
      if (dbDateRev !== row.dateRevised) {
        changes.dateRevised = { old: dbDateRev, new: row.dateRevised };
      }

      if (Object.keys(changes).length > 0) {
        changedItems.push({
          current: {
            code: db.code,
            description: db.description,
            rate: Number(db.rate),
            unit: db.unit,
            dateEffective: this.dateToISO(db.dateEffective),
            dateExpiry: dbDateExp,
          },
          incoming: row,
          changes,
        });
      } else {
        unchangedCount++;
      }
    }

    // Removed: codes in DB (active) that are entirely absent from file
    const removedItems = existing
      .filter((item) => item.isActive && !fileCodes.has(item.code))
      .map((item) => ({
        code: item.code,
        description: item.description,
        rate: Number(item.rate),
      }));

    return {
      fileRowCount: parsed.totalRows,
      filteredRowCount: parsed.filtered.length,
      newCodes,
      newVersions,
      changedItems,
      removedItems,
      unchangedCount,
    };
  }

  // ─── Import: Apply ────────────────────────────────────────────────────────

  async applyImport(buffer: Buffer): Promise<AipnImportResult> {
    const diff = await this.parseAndDiff(buffer);

    return this.prisma.$transaction(async (tx) => {
      // Create new codes + new versions
      const allNew = [...diff.newCodes, ...diff.newVersions];
      if (allNew.length > 0) {
        await tx.ssoAipnItem.createMany({
          data: allNew.map((row) => ({
            billingGroup: row.billingGroup,
            code: row.code,
            unit: row.unit,
            rate: row.rate,
            rate2: row.rate2,
            description: row.description,
            dateRevised: new Date(row.dateRevised),
            dateEffective: new Date(row.dateEffective),
            dateExpiry: new Date(row.dateExpiry),
            lastUpdated: new Date(row.lastUpdated),
            condition: row.condition,
            note: row.note || null,
            isActive: true,
          })),
        });
      }

      // Update changed items (same code + dateEffective, different fields)
      for (const item of diff.changedItems) {
        const row = item.incoming;
        await tx.ssoAipnItem.update({
          where: {
            code_dateEffective: {
              code: row.code,
              dateEffective: new Date(row.dateEffective),
            },
          },
          data: {
            billingGroup: row.billingGroup,
            unit: row.unit,
            rate: row.rate,
            rate2: row.rate2,
            description: row.description,
            dateRevised: new Date(row.dateRevised),
            dateExpiry: new Date(row.dateExpiry),
            lastUpdated: new Date(row.lastUpdated),
            condition: row.condition,
            note: row.note || null,
            isActive: true,
          },
        });
      }

      // Deactivate codes entirely absent from file
      if (diff.removedItems.length > 0) {
        const removedCodes = [
          ...new Set(diff.removedItems.map((r) => r.code)),
        ];
        await tx.ssoAipnItem.updateMany({
          where: { code: { in: removedCodes } },
          data: { isActive: false },
        });
      }

      return {
        created: allNew.length,
        updated: diff.changedItems.length,
        deactivated: diff.removedItems.length,
      };
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private parseXlsx(buffer: Buffer): {
    totalRows: number;
    filtered: AipnParsedRow[];
  } {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new BadRequestException('ไฟล์ Excel ไม่มีข้อมูล');

    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length < 2)
      throw new BadRequestException('ไฟล์ Excel ไม่มีข้อมูล');

    // Validate header row
    const headers = (data[0] as string[]).map((h) =>
      String(h ?? '').trim().toLowerCase(),
    );
    if (!headers.includes('code') || !headers.includes('rate')) {
      throw new BadRequestException(
        'รูปแบบไฟล์ไม่ถูกต้อง — ต้องมีคอลัมน์ code และ rate',
      );
    }

    const totalRows = data.length - 1;
    const filtered: AipnParsedRow[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      if (!row || row.length < 6) continue;

      const dxcond = String(row[10] ?? '').trim();
      const note = String(row[11] ?? '').trim();

      // Filter: SSOCAC or SSO Cancer Care
      if (dxcond !== 'SSOCAC' && !note.includes('SSO Cancer Care')) continue;

      const code = Number(row[1]);
      if (isNaN(code) || code === 0) continue;

      filtered.push({
        billingGroup: String(row[0] ?? '').trim(),
        code,
        unit: String(row[2] ?? '').trim(),
        rate: Number(row[3] ?? 0),
        rate2: Number(row[4] ?? 0),
        description: String(row[5] ?? '').trim(),
        dateRevised: this.excelDateToISO(row[6]),
        dateEffective: this.excelDateToISO(row[7]),
        dateExpiry: this.excelDateToISO(row[8]),
        lastUpdated: this.excelDateToISO(row[9]),
        condition: dxcond || 'SSOCAC',
        note,
      });
    }

    return { totalRows, filtered };
  }

  private excelDateToISO(val: unknown): string {
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      const d = new Date((val - 25569) * 86400 * 1000);
      return d.toISOString().split('T')[0];
    }
    return String(val ?? '');
  }

  private dateToISO(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
