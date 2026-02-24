import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ParsedVisitRow,
  ParsedMedication,
  PreviewResult,
  ImportResult,
} from '../types/matching.types';

// Column header mappings (Thai → internal key)
const COLUMN_MAP: Record<string, string> = {
  hn: 'hn',
  HN: 'hn',
  vsdate: 'visitDate',
  visitDate: 'visitDate',
  visit_date: 'visitDate',
  'วันที่': 'visitDate',
  vn: 'vn',
  VN: 'vn',
  'วินิจฉัยหลัก': 'primaryDiagnosis',
  'วินิจฉัยรอง': 'secondaryDiagnoses',
  HPI: 'hpi',
  hpi: 'hpi',
  'หมายเหตุจากแพทย์': 'doctorNotes',
  'รายการยาที่ได้รับ': 'medicationsRaw',
};

/**
 * Convert Excel serial number to ISO date string (yyyy-mm-dd)
 * Excel epoch: Jan 1, 1900 (with the Lotus 1-2-3 bug for Feb 29, 1900)
 */
function excelSerialToDate(serial: number): string {
  // Excel serial: days since 1899-12-30 (accounting for the 1900 leap year bug)
  const epoch = new Date(Date.UTC(1899, 11, 30));
  const ms = epoch.getTime() + serial * 86400000;
  const d = new Date(ms);
  return d.toISOString().split('T')[0];
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse xlsx buffer and return preview (no DB write)
   */
  parseXlsx(buffer: Buffer, filename: string): PreviewResult {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('ไฟล์ Excel ไม่มี sheet — No sheets found in file');
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
    });

    if (rawRows.length === 0) {
      throw new BadRequestException('ไฟล์ Excel ไม่มีข้อมูล — No data rows found');
    }

    // Map headers
    const headers = Object.keys(rawRows[0]);
    const mappedHeaders: Record<string, string> = {};
    for (const h of headers) {
      const trimmed = h.trim();
      if (COLUMN_MAP[trimmed]) {
        mappedHeaders[trimmed] = COLUMN_MAP[trimmed];
      }
    }

    // Validate required columns
    const requiredKeys = ['hn', 'vn', 'visitDate', 'primaryDiagnosis'];
    const mappedKeys = Object.values(mappedHeaders);
    const missing = requiredKeys.filter((k) => !mappedKeys.includes(k));
    if (missing.length > 0) {
      throw new BadRequestException(
        `ไม่พบคอลัมน์ที่จำเป็น: ${missing.join(', ')} — Missing required columns`,
      );
    }

    const errors: { row: number; message: string }[] = [];
    const parsed: ParsedVisitRow[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const rowNum = i + 2; // 1-based + header row

      // Map raw columns to internal keys
      const mapped: Record<string, string> = {};
      for (const [origKey, internalKey] of Object.entries(mappedHeaders)) {
        const val = raw[origKey];
        mapped[internalKey] = val !== undefined && val !== null ? String(val).trim() : '';
      }

      const rowErrors: string[] = [];

      // Validate required fields
      if (!mapped.hn) rowErrors.push('hn ว่างเปล่า');
      if (!mapped.vn) rowErrors.push('vn ว่างเปล่า');
      if (!mapped.visitDate) rowErrors.push('vsdate ว่างเปล่า');
      if (!mapped.primaryDiagnosis) rowErrors.push('วินิจฉัยหลักว่างเปล่า');

      // Normalize ICD-10 code: remove dots
      const primaryDx = (mapped.primaryDiagnosis || '').replace(/\./g, '').toUpperCase();

      // Parse visit date — find the original raw value for date column
      let visitDateStr = mapped.visitDate || '';
      const dateKey = Object.keys(raw).find((k) => COLUMN_MAP[k.trim()] === 'visitDate') || '';
      const rawDateVal = dateKey ? raw[dateKey] : undefined;

      if (rawDateVal instanceof Date) {
        visitDateStr = rawDateVal.toISOString().split('T')[0];
      } else if (typeof rawDateVal === 'number' && rawDateVal > 1000) {
        // Excel serial number (e.g. 46175)
        visitDateStr = excelSerialToDate(rawDateVal);
      } else if (visitDateStr && !visitDateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Try common date formats: dd/mm/yyyy, mm/dd/yyyy
        const parts = visitDateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [a, b, c] = parts;
          // Assume dd/mm/yyyy or dd/mm/BE_year
          let year = parseInt(c, 10);
          if (year > 2400) year -= 543; // Convert Buddhist Era
          if (year < 100) year += 2000;
          visitDateStr = `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, message: rowErrors.join(', ') });
      }

      parsed.push({
        hn: mapped.hn || '',
        vn: mapped.vn || '',
        visitDate: visitDateStr,
        primaryDiagnosis: primaryDx,
        secondaryDiagnoses: mapped.secondaryDiagnoses
          ? mapped.secondaryDiagnoses.replace(/\./g, '').toUpperCase()
          : null,
        hpi: mapped.hpi || null,
        doctorNotes: mapped.doctorNotes || null,
        medicationsRaw: mapped.medicationsRaw && mapped.medicationsRaw.trim() !== 'ไม่มีรายการยา'
          ? mapped.medicationsRaw
          : null,
        errors: rowErrors,
      });
    }

    const validRows = parsed.filter((r) => r.errors.length === 0).length;

    // Compute min/max visit dates from ALL parsed rows
    const validDates = parsed
      .map((r) => r.visitDate)
      .filter((d) => d && /^\d{4}-\d{2}-\d{2}/.test(d))
      .sort();
    const minVisitDate = validDates[0] || null;
    const maxVisitDate = validDates[validDates.length - 1] || null;

    return {
      totalRows: parsed.length,
      validRows,
      invalidRows: parsed.length - validRows,
      errors,
      preview: parsed.slice(0, 20),
      minVisitDate,
      maxVisitDate,
    };
  }

  /**
   * Parse xlsx buffer and return ALL rows (for confirm flow)
   */
  parseAllRows(buffer: Buffer): ParsedVisitRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rawRows.length === 0) return [];

    const headers = Object.keys(rawRows[0]);
    const mappedHeaders: Record<string, string> = {};
    for (const h of headers) {
      const trimmed = h.trim();
      if (COLUMN_MAP[trimmed]) mappedHeaders[trimmed] = COLUMN_MAP[trimmed];
    }

    return rawRows.map((raw) => {
      const mapped: Record<string, string> = {};
      for (const [origKey, internalKey] of Object.entries(mappedHeaders)) {
        const val = raw[origKey];
        mapped[internalKey] = val !== undefined && val !== null ? String(val).trim() : '';
      }

      const rowErrors: string[] = [];
      if (!mapped.hn) rowErrors.push('hn ว่างเปล่า');
      if (!mapped.vn) rowErrors.push('vn ว่างเปล่า');
      if (!mapped.visitDate) rowErrors.push('vsdate ว่างเปล่า');
      if (!mapped.primaryDiagnosis) rowErrors.push('วินิจฉัยหลักว่างเปล่า');

      const primaryDx = (mapped.primaryDiagnosis || '').replace(/\./g, '').toUpperCase();

      let visitDateStr = mapped.visitDate || '';
      const vsKey = Object.keys(raw).find((k) => COLUMN_MAP[k.trim()] === 'visitDate') || '';
      const rawDateVal2 = vsKey ? raw[vsKey] : undefined;

      if (rawDateVal2 instanceof Date) {
        visitDateStr = rawDateVal2.toISOString().split('T')[0];
      } else if (typeof rawDateVal2 === 'number' && rawDateVal2 > 1000) {
        visitDateStr = excelSerialToDate(rawDateVal2);
      } else if (visitDateStr && !visitDateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parts = visitDateStr.split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [a, b, c] = parts;
          let year = parseInt(c, 10);
          if (year > 2400) year -= 543;
          if (year < 100) year += 2000;
          visitDateStr = `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
      }

      return {
        hn: mapped.hn || '',
        vn: mapped.vn || '',
        visitDate: visitDateStr,
        primaryDiagnosis: primaryDx,
        secondaryDiagnoses: mapped.secondaryDiagnoses
          ? mapped.secondaryDiagnoses.replace(/\./g, '').toUpperCase()
          : null,
        hpi: mapped.hpi || null,
        doctorNotes: mapped.doctorNotes || null,
        medicationsRaw: mapped.medicationsRaw && mapped.medicationsRaw.trim() !== 'ไม่มีรายการยา'
          ? mapped.medicationsRaw
          : null,
        errors: rowErrors,
      };
    });
  }

  /**
   * Parse medication string into structured components
   * Input formats:
   *   "1502262 - INTAXEL 1 vial (1357)"
   *   "1502262 - INTAXEL (Paclitaxel 300mg/50ml) 1 vial (1357)"
   *   "DEXAMETHASONE 8 mg"
   */
  parseMedicationLine(line: string): ParsedMedication {
    const trimmed = line.trim();
    if (!trimmed) {
      return { rawLine: line, hospitalCode: null, medicationName: null, quantity: null, unit: null };
    }

    // Pattern 1: "CODE - NAME QTY UNIT (price)" or "CODE - NAME (details) QTY UNIT (price)"
    const match1 = trimmed.match(
      /^(\d+)\s*-\s*(.+?)\s+(\d+(?:\.\d+)?)\s+(\S+?)(?:\s*\(.*\))?\s*$/,
    );
    if (match1) {
      return {
        rawLine: trimmed,
        hospitalCode: match1[1],
        medicationName: match1[2].replace(/\s*\(.*\)\s*$/, '').trim(),
        quantity: match1[3],
        unit: match1[4],
      };
    }

    // Pattern 2: "CODE - NAME"
    const match2 = trimmed.match(/^(\d+)\s*-\s*(.+)$/);
    if (match2) {
      return {
        rawLine: trimmed,
        hospitalCode: match2[1],
        medicationName: match2[2].replace(/\s*\(.*\)\s*$/, '').trim(),
        quantity: null,
        unit: null,
      };
    }

    // Pattern 3: "NAME QTY UNIT" (no code)
    const match3 = trimmed.match(/^([A-Za-z][A-Za-z\s\-]+?)\s+(\d+(?:\.\d+)?)\s+(\S+)$/);
    if (match3) {
      return {
        rawLine: trimmed,
        hospitalCode: null,
        medicationName: match3[1].trim(),
        quantity: match3[2],
        unit: match3[3],
      };
    }

    // Fallback: treat entire line as medication name
    return {
      rawLine: trimmed,
      hospitalCode: null,
      medicationName: trimmed,
      quantity: null,
      unit: null,
    };
  }

  /**
   * Resolve drug by medication name — 3-tier matching strategy
   * Tier 1: Exact match (most precise, prevents false positives)
   * Tier 2: Starts-with match (handles names with trailing strength/form info)
   * Tier 3: Contains match (broadest fallback)
   * Each tier tries trade name first, then generic name.
   */
  async resolveDrug(medicationName: string): Promise<number | null> {
    if (!medicationName) return null;

    const nameUpper = medicationName.toUpperCase().trim();

    // Strip trailing dosage/strength info: "FEMARA 2.5 MG" → "FEMARA"
    const nameBase = nameUpper.replace(/\s+\d[\d.,/]*\s*(MG|GM|ML|MCG|%|G|IU|UNIT|TAB|CAP|AMP|VIAL|SYRINGE|PREFILL).*$/i, '').trim();

    // Try both full name and base name
    const namesToTry = nameBase !== nameUpper ? [nameUpper, nameBase] : [nameUpper];

    for (const name of namesToTry) {
      // --- Tier 1: Exact match ---
      const exactTrade = await this.prisma.drugTradeName.findFirst({
        where: {
          tradeName: { equals: name, mode: 'insensitive' },
          drug: { isActive: true },
        },
        select: { drugId: true },
      });
      if (exactTrade) return exactTrade.drugId;

      const exactGeneric = await this.prisma.drug.findFirst({
        where: {
          genericName: { equals: name, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      if (exactGeneric) return exactGeneric.id;
    }

    for (const name of namesToTry) {
      // --- Tier 2: Starts-with match ---
      const startsWithTrade = await this.prisma.drugTradeName.findFirst({
        where: {
          tradeName: { startsWith: name, mode: 'insensitive' },
          drug: { isActive: true },
        },
        select: { drugId: true },
      });
      if (startsWithTrade) return startsWithTrade.drugId;

      const startsWithGeneric = await this.prisma.drug.findFirst({
        where: {
          genericName: { startsWith: name, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      if (startsWithGeneric) return startsWithGeneric.id;
    }

    for (const name of namesToTry) {
      // --- Tier 3: Contains match (broadest fallback, skip short names to avoid false positives) ---
      if (name.length < 5) continue;
      const containsTrade = await this.prisma.drugTradeName.findFirst({
        where: {
          tradeName: { contains: name, mode: 'insensitive' },
          drug: { isActive: true },
        },
        select: { drugId: true },
      });
      if (containsTrade) return containsTrade.drugId;

      const containsGeneric = await this.prisma.drug.findFirst({
        where: {
          genericName: { contains: name, mode: 'insensitive' },
          isActive: true,
        },
        select: { id: true },
      });
      if (containsGeneric) return containsGeneric.id;
    }

    return null;
  }

  /**
   * Resolve ICD-10 code to CancerSite ID (longest prefix match)
   */
  async resolveIcd10(icdCode: string): Promise<number | null> {
    const code = icdCode.replace(/\./g, '').toUpperCase();

    // Try progressively shorter prefixes
    for (let len = code.length; len >= 2; len--) {
      const prefix = code.substring(0, len);
      const mapping = await this.prisma.icd10CancerSiteMap.findUnique({
        where: { icdPrefix: prefix, isActive: true },
        select: { cancerSiteId: true },
      });
      if (mapping) return mapping.cancerSiteId;
    }

    return null;
  }

  /**
   * Confirm import: write parsed data to database
   */
  async confirmImport(
    rows: ParsedVisitRow[],
    filename: string,
    userId: number | null,
  ): Promise<ImportResult> {
    const validRows = rows.filter((r) => r.errors.length === 0);
    const errors: { row: number; message: string }[] = [];

    // Create import record
    const importRecord = await this.prisma.patientImport.create({
      data: {
        filename,
        totalRows: rows.length,
        importedRows: 0,
        skippedRows: 0,
        importedById: userId,
        status: 'PROCESSING',
      },
    });

    // Pre-load HN→Patient mapping for auto-linking
    const uniqueHns = [...new Set(validRows.map((r) => r.hn))];
    const existingPatients = await this.prisma.patient.findMany({
      where: { hn: { in: uniqueHns } },
      select: { id: true, hn: true },
    });
    const hnToPatientId = new Map(existingPatients.map((p) => [p.hn, p.id]));

    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];

      try {
        // Check for duplicate VN
        const existing = await this.prisma.patientVisit.findUnique({
          where: { vn: row.vn },
          select: { id: true },
        });

        if (existing) {
          skippedCount++;
          errors.push({ row: i + 2, message: `VN ${row.vn} ซ้ำ — duplicate` });
          continue;
        }

        // Resolve ICD-10 → CancerSite
        const resolvedSiteId = await this.resolveIcd10(row.primaryDiagnosis);

        // Auto-link to existing patient by HN
        const patientId = hnToPatientId.get(row.hn) ?? null;

        // Create visit
        const visit = await this.prisma.patientVisit.create({
          data: {
            importId: importRecord.id,
            hn: row.hn,
            vn: row.vn,
            visitDate: new Date(row.visitDate),
            primaryDiagnosis: row.primaryDiagnosis,
            secondaryDiagnoses: row.secondaryDiagnoses,
            hpi: row.hpi,
            doctorNotes: row.doctorNotes,
            medicationsRaw: row.medicationsRaw,
            resolvedSiteId,
            patientId,
          },
        });

        // Parse and create medications
        if (row.medicationsRaw) {
          const medLines = row.medicationsRaw
            .split(/(?:\\n|\n|\|)+/)
            .map((l) => l.trim())
            .filter(Boolean);

          for (const line of medLines) {
            const parsed = this.parseMedicationLine(line);
            const resolvedDrugId = parsed.medicationName
              ? await this.resolveDrug(parsed.medicationName)
              : null;

            await this.prisma.visitMedication.create({
              data: {
                visitId: visit.id,
                rawLine: parsed.rawLine,
                hospitalCode: parsed.hospitalCode,
                medicationName: parsed.medicationName,
                quantity: parsed.quantity,
                unit: parsed.unit,
                resolvedDrugId,
              },
            });
          }
        }

        importedCount++;
      } catch (err: any) {
        skippedCount++;
        errors.push({
          row: i + 2,
          message: err.message?.substring(0, 200) || 'Unknown error',
        });
      }
    }

    // Update import record
    await this.prisma.patientImport.update({
      where: { id: importRecord.id },
      data: {
        importedRows: importedCount,
        skippedRows: skippedCount + (rows.length - validRows.length),
        status: 'COMPLETED',
        errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });

    return {
      importId: importRecord.id,
      totalRows: rows.length,
      importedRows: importedCount,
      skippedRows: skippedCount + (rows.length - validRows.length),
      errors,
    };
  }
}
