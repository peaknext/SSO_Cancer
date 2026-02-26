import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as archiver from 'archiver';
import { PrismaService } from '../../prisma/prisma.service';
import { generateBilltranXml } from './generators/billtran.generator';
import { generateBilldispXml } from './generators/billdisp.generator';
import { generateOpServicesXml } from './generators/opservices.generator';
import {
  encodeWindows874,
  formatDateCompact,
  formatDateTimeCompact,
  formatAmount,
} from './generators/encoding';
import type { SsopVisitData } from './types/ssop.types';

export interface ValidationIssue {
  visitId: number;
  vn: string;
  issues: string[];
}

@Injectable()
export class SsopExportService {
  private readonly logger = new Logger(SsopExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Preview/validate visits before export */
  async preview(visitIds: number[]): Promise<{
    valid: { visitId: number; vn: string; amount: number }[];
    invalid: ValidationIssue[];
    totalAmount: number;
  }> {
    const visits = await this.loadVisitData(visitIds);
    const valid: { visitId: number; vn: string; amount: number }[] = [];
    const invalid: ValidationIssue[] = [];

    for (const visit of visits) {
      const issues = this.validateVisit(visit);
      if (issues.length === 0) {
        const amount = visit.billingItems.reduce(
          (sum, item) => sum + item.quantity * item.claimUnitPrice,
          0,
        );
        valid.push({ visitId: visit.visitId, vn: visit.vn, amount });
      } else {
        invalid.push({ visitId: visit.visitId, vn: visit.vn, issues });
      }
    }

    const totalAmount = valid.reduce((sum, v) => sum + v.amount, 0);
    return { valid, invalid, totalAmount };
  }

  /** Generate SSOP 0.93 ZIP file */
  async generateExport(
    visitIds: number[],
    userId: number | null,
  ): Promise<{ buffer: Buffer; fileName: string; batchId: number }> {
    // Load and validate
    const visits = await this.loadVisitData(visitIds);
    const validVisits = visits.filter((v) => this.validateVisit(v).length === 0);

    if (validVisits.length === 0) {
      throw new BadRequestException('ไม่มี visit ที่ผ่านการตรวจสอบ — กรุณาตรวจสอบข้อมูลให้ครบ');
    }

    // Get hospital settings
    const { hcode, hname } = await this.getHospitalSettings();
    const subUnit = '01';

    // Reserve session number atomically (prevents race condition)
    // Transaction locks the row during findFirst→create sequence
    const sessNo = await this.reserveSessionNo(hcode);
    const sessNoStr = String(sessNo).padStart(4, '0');

    // Generate SVIDs
    const svidMap = this.generateSvidMap(validVisits);

    // Convert to SsopVisitData format
    const ssopVisits: SsopVisitData[] = validVisits.map((v) => ({
      vn: v.vn,
      visitDate: v.visitDate,
      serviceStartTime: v.serviceStartTime,
      serviceEndTime: v.serviceEndTime,
      physicianLicenseNo: v.physicianLicenseNo,
      clinicCode: v.clinicCode,
      primaryDiagnosis: v.primaryDiagnosis,
      secondaryDiagnoses: v.secondaryDiagnoses,
      patientHn: v.patientHn,
      patientCitizenId: v.patientCitizenId,
      patientFullName: v.patientFullName,
      caseNumber: v.caseNumber,
      vcrCode: v.vcrCode,
      protocolCode: v.protocolCode,
      mainHospitalCode: v.mainHospitalCode,
      billingItems: v.billingItems,
    }));

    // Generate XML content
    const billtranXml = generateBilltranXml(ssopVisits, hcode, hname, sessNoStr, svidMap);
    const billdispXml = generateBilldispXml(hcode, hname, sessNoStr);
    const opservicesXml = generateOpServicesXml(ssopVisits, hcode, hname, sessNoStr, svidMap);

    // Encode to windows-874
    const now = new Date();
    const dateStr = formatDateCompact(now);
    const billtranBuf = encodeWindows874(billtranXml);
    const billdispBuf = encodeWindows874(billdispXml);
    const opservicesBuf = encodeWindows874(opservicesXml);

    // Create ZIP
    const zipBuffer = await this.createZip([
      { name: `BILLTRAN${dateStr}.txt`, content: billtranBuf },
      { name: `BILLDISP${dateStr}.txt`, content: billdispBuf },
      { name: `OPServices${dateStr}.txt`, content: opservicesBuf },
    ]);

    // ZIP filename per spec: {hcode5}_SSOPBIL_{sessno4}_{subunit2}_{YYYYMMDD-HHMMSS}.zip
    const fileName = `${hcode}_SSOPBIL_${sessNoStr}_${subUnit}_${formatDateTimeCompact(now)}.zip`;

    // Calculate total amount
    const totalAmount = ssopVisits.reduce(
      (sum, v) =>
        sum +
        v.billingItems.reduce((s, i) => s + i.quantity * i.claimUnitPrice, 0),
      0,
    );

    // Save export batch (atomic with session number via transaction)
    const batch = await this.prisma.$transaction(async (tx) => {
      return tx.billingExportBatch.create({
        data: {
          sessionNo: sessNo,
          hcode,
          subUnit,
          visitCount: validVisits.length,
          totalAmount,
          fileName,
          visitIds: validVisits.map((v) => v.visitId),
          fileData: new Uint8Array(zipBuffer),
          createdByUserId: userId,
        },
      });
    });

    return { buffer: zipBuffer, fileName, batchId: batch.id };
  }

  /** List export batches */
  async listBatches(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.billingExportBatch.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          sessionNo: true,
          hcode: true,
          subUnit: true,
          exportDate: true,
          visitCount: true,
          totalAmount: true,
          fileName: true,
          visitIds: true,
          createdByUserId: true,
          createdAt: true,
          createdByUser: { select: { fullName: true } },
        },
      }),
      this.prisma.billingExportBatch.count({ where: { isActive: true } }),
    ]);
    return { data, total, page, limit };
  }

  /** Download a batch ZIP by ID */
  async downloadBatch(batchId: number): Promise<{ buffer: Buffer; fileName: string }> {
    const batch = await this.prisma.billingExportBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch || !batch.fileData) {
      throw new BadRequestException('ไม่พบข้อมูล export batch หรือไฟล์ถูกลบแล้ว');
    }
    return { buffer: Buffer.from(batch.fileData), fileName: batch.fileName };
  }

  /** List visits that have billing items (exportable) with filters */
  async listExportableVisits(query: {
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { from, to, search, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      visitBillingItems: { some: { isActive: true } },
    };

    if (from || to) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visitDateFilter: any = {};
      if (from) visitDateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        visitDateFilter.lte = toDate;
      }
      where.visitDate = visitDateFilter;
    }

    if (search) {
      where.OR = [
        { vn: { contains: search } },
        { hn: { contains: search } },
        { patient: { fullName: { contains: search, mode: 'insensitive' } } },
        { patient: { citizenId: { contains: search } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.patientVisit.findMany({
        where,
        orderBy: { visitDate: 'desc' },
        skip,
        take: Math.min(limit, 100),
        select: {
          id: true,
          vn: true,
          hn: true,
          visitDate: true,
          primaryDiagnosis: true,
          physicianLicenseNo: true,
          clinicCode: true,
          serviceStartTime: true,
          serviceEndTime: true,
          patient: {
            select: {
              id: true,
              fullName: true,
              citizenId: true,
            },
          },
          case: {
            select: {
              caseNumber: true,
              vcrCode: true,
              protocol: { select: { protocolCode: true, nameThai: true } },
              sourceHospital: { select: { hcode5: true } },
            },
          },
          _count: {
            select: { visitBillingItems: { where: { isActive: true } } },
          },
        },
      }),
      this.prisma.patientVisit.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /** Load enriched visit data with all relations needed for SSOP */
  private async loadVisitData(visitIds: number[]) {
    const visits = await this.prisma.patientVisit.findMany({
      where: { id: { in: visitIds } },
      include: {
        patient: true,
        case: {
          include: {
            protocol: true,
            sourceHospital: true,
          },
        },
        visitBillingItems: {
          where: { isActive: true },
        },
      },
    });

    return visits.map((v) => ({
      visitId: v.id,
      vn: v.vn,
      visitDate: v.visitDate,
      serviceStartTime: v.serviceStartTime,
      serviceEndTime: v.serviceEndTime,
      physicianLicenseNo: v.physicianLicenseNo,
      clinicCode: v.clinicCode,
      primaryDiagnosis: v.primaryDiagnosis,
      secondaryDiagnoses: v.secondaryDiagnoses,
      patientHn: v.patient?.hn || v.hn,
      patientCitizenId: v.patient?.citizenId || '',
      patientFullName: v.patient?.fullName || '',
      caseNumber: v.case?.caseNumber || '',
      vcrCode: v.case?.vcrCode || '',
      protocolCode: v.case?.protocol?.protocolCode || '',
      mainHospitalCode: v.case?.sourceHospital?.hcode5 || v.patient?.mainHospitalCode || '',
      billingItems: v.visitBillingItems.map((item) => ({
        hospitalCode: item.hospitalCode,
        aipnCode: item.aipnCode,
        billingGroup: item.billingGroup,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        claimUnitPrice: Number(item.claimUnitPrice ?? item.unitPrice),
        claimCategory: item.claimCategory,
      })),
    }));
  }

  /** Validate a single visit has all required data for SSOP */
  private validateVisit(visit: {
    patientCitizenId: string;
    patientFullName: string;
    vn: string;
    primaryDiagnosis: string;
    billingItems: { quantity: number; claimUnitPrice: number }[];
    physicianLicenseNo: string | null;
    clinicCode: string | null;
    serviceStartTime: Date | null;
    serviceEndTime: Date | null;
    caseNumber: string;
    vcrCode: string;
    protocolCode: string;
    mainHospitalCode: string;
  }): string[] {
    const issues: string[] = [];

    // HIS data checks
    if (!visit.patientCitizenId || visit.patientCitizenId.length !== 13) {
      issues.push('ไม่มีเลขบัตรประชาชน 13 หลัก');
    }
    if (!visit.patientFullName) issues.push('ไม่มีชื่อ-สกุลผู้ป่วย');
    if (!visit.vn) issues.push('ไม่มี VN');
    if (!visit.primaryDiagnosis) issues.push('ไม่มีรหัสวินิจฉัยหลัก');
    if (visit.billingItems.length === 0) issues.push('ไม่มีรายการค่าใช้จ่าย (VisitBillingItem)');
    if (!visit.physicianLicenseNo) issues.push('ไม่มีเลขใบประกอบวิชาชีพแพทย์');
    if (!visit.clinicCode) issues.push('ไม่มีรหัสแผนก');
    if (!visit.serviceStartTime) issues.push('ไม่มีเวลาเริ่มต้นบริการ (BegDT)');
    if (!visit.serviceEndTime) issues.push('ไม่มีเวลาสิ้นสุดบริการ (EndDT)');

    // SSO Cancer Care data checks
    if (!visit.caseNumber) issues.push('ไม่มีเลขที่เคส (Case Number)');
    if (!visit.vcrCode) issues.push('ไม่มีรหัส Protocol QR Code (VCR Code)');
    if (!visit.protocolCode) issues.push('ไม่มีรหัส Protocol (ต้อง confirm protocol ก่อน)');
    if (!visit.mainHospitalCode) issues.push('ไม่มีรหัส รพ.ตามสิทธิ');

    return issues;
  }

  /** Generate unique SVID for each visit (format: YYMMDDHHMM + seq) */
  private generateSvidMap(visits: { vn: string; visitDate: Date }[]): Map<string, string> {
    const map = new Map<string, string>();
    const seqDigits = visits.length > 99 ? 3 : 2;

    for (let i = 0; i < visits.length; i++) {
      const v = visits[i];
      const d = v.visitDate;
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const seq = String(i + 1).padStart(seqDigits, '0');
      const svid = `${yy}${mm}${dd}0000${seq}`;
      map.set(v.vn, svid);
    }

    return map;
  }

  /** Get hospital settings from AppSetting */
  private async getHospitalSettings(): Promise<{ hcode: string; hname: string }> {
    const hospitalIdSetting = await this.prisma.appSetting.findUnique({
      where: { settingKey: 'hospital_id' },
    });

    const hospitalId = hospitalIdSetting?.settingValue
      ? parseInt(hospitalIdSetting.settingValue, 10)
      : null;

    if (!hospitalId) {
      throw new BadRequestException(
        'ยังไม่ได้ตั้งค่าสถานพยาบาล — กรุณาตั้งค่า hospital_id ในหน้า Settings',
      );
    }

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { hcode5: true, nameThai: true },
    });

    if (!hospital || !hospital.hcode5) {
      throw new BadRequestException('ไม่พบข้อมูลสถานพยาบาลหรือไม่มี hcode5');
    }

    return { hcode: hospital.hcode5, hname: hospital.nameThai };
  }

  /** Reserve next session number scoped by hcode (atomic via transaction) */
  private async reserveSessionNo(hcode: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.billingExportBatch.findFirst({
        where: { hcode },
        orderBy: { sessionNo: 'desc' },
        select: { sessionNo: true },
      });
      return (last?.sessionNo || 0) + 1;
    });
  }

  /** Create ZIP buffer from file entries */
  private createZip(
    files: { name: string; content: Buffer }[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      for (const file of files) {
        archive.append(file.content, { name: file.name });
      }

      archive.finalize();
    });
  }
}
