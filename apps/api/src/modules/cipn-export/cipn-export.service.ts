import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as archiver from 'archiver';
import { PrismaService } from '../../prisma/prisma.service';
import { generateCipnXml } from './generators/cipn-xml.generator';
import { encodeWindows874, formatDate, formatDateTimeCompact } from '../ssop-export/generators/encoding';
import type { CipnAdmissionData } from './types/cipn.types';

export interface CipnValidationIssue {
  visitId: number;
  an: string;
  issues: string[];
}

@Injectable()
export class CipnExportService {
  private readonly logger = new Logger(CipnExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** List IPD admissions that are export-ready */
  async listExportableAdmissions(query: {
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { from, to, search, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [
      { visitType: '2' },           // IPD only
      { an: { not: null } },        // Must have admission number
      { visitBillingItems: { some: { isActive: true } } },
      { patient: { isNot: null } },
      { hn: { not: null } },
    ];

    // Date range filter
    if (from) andConditions.push({ visitDate: { gte: new Date(from) } });
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      andConditions.push({ visitDate: { lte: toDate } });
    }

    // Search filter
    if (search) {
      andConditions.push({
        OR: [
          { an: { contains: search, mode: 'insensitive' } },
          { hn: { contains: search, mode: 'insensitive' } },
          { vn: { contains: search, mode: 'insensitive' } },
          { patient: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const where = { AND: andConditions };

    const [data, total] = await Promise.all([
      this.prisma.patientVisit.findMany({
        where,
        include: {
          patient: { select: { id: true, fullName: true, citizenId: true } },
          case: {
            include: {
              protocol: { select: { protocolCode: true, nameThai: true } },
              sourceHospital: { select: { hcode5: true } },
            },
          },
          _count: {
            select: {
              visitBillingItems: { where: { isActive: true } },
              diagnoses: true,
              procedures: true,
            },
          },
        },
        orderBy: { visitDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patientVisit.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /** Preview/validate admissions before export */
  async preview(visitIds: number[]): Promise<{
    valid: { visitId: number; an: string; amount: number }[];
    invalid: CipnValidationIssue[];
    totalAmount: number;
  }> {
    const admissions = await this.loadAdmissionData(visitIds);
    const valid: { visitId: number; an: string; amount: number }[] = [];
    const invalid: CipnValidationIssue[] = [];

    for (const admission of admissions) {
      const issues = this.validateAdmission(admission);
      if (issues.length === 0) {
        const amount = admission.billingItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice - (item.discount || 0),
          0,
        );
        valid.push({ visitId: admission.visitId, an: admission.an, amount });
      } else {
        invalid.push({ visitId: admission.visitId, an: admission.an, issues });
      }
    }

    const totalAmount = valid.reduce((sum, v) => sum + v.amount, 0);
    return { valid, invalid, totalAmount };
  }

  /** Generate CIPN ZIP file */
  async generateExport(
    visitIds: number[],
    userId: number | null,
  ): Promise<{ buffer: Buffer; fileName: string; batchId: number }> {
    const admissions = await this.loadAdmissionData(visitIds);
    const validAdmissions = admissions.filter(
      (a) => this.validateAdmission(a).length === 0,
    );

    if (validAdmissions.length === 0) {
      throw new BadRequestException('ไม่มี admission ที่ผ่านการตรวจสอบ — กรุณาตรวจสอบข้อมูลให้ครบ');
    }

    const { hcode, hname } = await this.getHospitalSettings();

    // Reserve session number (CIPN starts at 10000, range 10000-99999)
    const sessNo = await this.reserveSessionNo(hcode);
    const sessNoStr = String(sessNo).padStart(5, '0');

    // Generate one XML per admission
    const xmlFiles: { name: string; content: Buffer }[] = [];
    for (const admission of validAdmissions) {
      const xml = generateCipnXml(admission, hcode, hname);
      const buf = encodeWindows874(xml);
      // Filename: HCode-CIPN-AN-SubmDT.xml
      const submDt = formatDateTimeCompact(new Date()).replace('-', '');
      const fileName = `${hcode}-CIPN-${admission.an}-${submDt}.xml`;
      xmlFiles.push({ name: fileName, content: buf });
    }

    // Create ZIP: {hcode}CIPN{sessNo}.ZIP
    const zipBuffer = await this.createZip(xmlFiles);
    const zipFileName = `${hcode}CIPN${sessNoStr}.ZIP`;

    // Calculate total amount
    const totalAmount = validAdmissions.reduce(
      (sum, a) =>
        sum + a.billingItems.reduce(
          (s, i) => s + i.quantity * i.unitPrice - (i.discount || 0),
          0,
        ),
      0,
    );

    // Save batch
    const batch = await this.prisma.billingExportBatch.create({
      data: {
        sessionNo: sessNo,
        hcode,
        subUnit: '01',
        visitCount: validAdmissions.length,
        totalAmount,
        fileName: zipFileName,
        visitIds: validAdmissions.map((a) => a.visitId),
        fileData: new Uint8Array(zipBuffer),
        exportType: 'CIPN',
        createdByUserId: userId,
      },
    });

    return { buffer: zipBuffer, fileName: zipFileName, batchId: batch.id };
  }

  /** List CIPN export batches */
  async listBatches(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [batches, total] = await Promise.all([
      this.prisma.billingExportBatch.findMany({
        where: { isActive: true, exportType: 'CIPN' },
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
          createdAt: true,
          createdByUser: { select: { fullName: true } },
        },
      }),
      this.prisma.billingExportBatch.count({ where: { isActive: true, exportType: 'CIPN' } }),
    ]);

    return { data: batches, total, page, limit };
  }

  /** Download a batch ZIP by ID */
  async downloadBatch(batchId: number): Promise<{ buffer: Buffer; fileName: string }> {
    const batch = await this.prisma.billingExportBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch || !batch.fileData) {
      throw new BadRequestException('ไม่พบข้อมูล export batch หรือไฟล์ถูกลบแล้ว');
    }
    if (batch.exportType !== 'CIPN') {
      throw new BadRequestException('Batch นี้ไม่ใช่ CIPN export');
    }
    return { buffer: Buffer.from(batch.fileData), fileName: batch.fileName };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /** Load full admission data with all relations needed for CIPN */
  private async loadAdmissionData(visitIds: number[]): Promise<CipnAdmissionData[]> {
    const visits = await this.prisma.patientVisit.findMany({
      where: { id: { in: visitIds }, visitType: '2' },
      include: {
        patient: true,
        case: {
          include: {
            protocol: true,
            sourceHospital: true,
          },
        },
        diagnoses: {
          where: { isActive: true },
          orderBy: { sequence: 'asc' },
        },
        procedures: {
          where: { isActive: true },
          orderBy: { sequence: 'asc' },
        },
        visitBillingItems: {
          where: { isActive: true },
        },
      },
    });

    return visits.map((v) => ({
      visitId: v.id,
      an: v.an || '',
      hn: v.hn,
      visitDate: v.visitDate,
      // Schema has no admitDate — for IPD, visitDate IS the admit date
      admitDate: formatDate(v.visitDate),
      admitTime: v.admitTime,
      dischargeDate: v.dischargeDate,
      dischargeTime: v.dischargeTime,
      admissionType: v.admissionType,
      admissionSource: v.admissionSource,
      dischargeStatus: v.dischargeStatus,
      dischargeType: v.dischargeType,
      ward: v.ward,
      department: v.department,
      lengthOfStay: v.lengthOfStay,
      leaveDay: v.leaveDay,
      birthWeight: v.birthWeight ? Number(v.birthWeight) : null,
      drg: v.drg,
      drgVersion: v.drgVersion,
      rw: v.rw ? Number(v.rw) : null,
      adjRw: v.adjRw ? Number(v.adjRw) : null,
      authCode: v.authCode,
      authDate: v.authDate,
      primaryDiagnosis: v.primaryDiagnosis || '',
      secondaryDiagnoses: v.secondaryDiagnoses,
      physicianLicenseNo: v.physicianLicenseNo,
      patientHn: v.patient?.hn || v.hn,
      patientCitizenId: v.patient?.citizenId || '',
      patientFullName: v.patient?.fullName || '',
      patientDob: v.patient?.dateOfBirth || null,
      patientSex: v.patient?.gender || null,
      patientTitle: v.patient?.titleName || null,
      patientMaritalStatus: v.patient?.maritalStatus || null,
      patientNationality: v.patient?.nationality || null,
      patientProvince: v.patient?.province || null,
      patientDistrict: v.patient?.district || null,
      caseNumber: v.case?.caseNumber || '',
      mainHospitalCode: v.case?.sourceHospital?.hcode5 || v.patient?.mainHospitalCode || '',
      diagnoses: (v.diagnoses || []).map((d) => ({
        sequence: d.sequence,
        diagCode: d.diagCode,
        diagType: d.diagType,
        codeSys: d.codeSys,
        diagTerm: d.diagTerm,
        doctorLicense: d.doctorLicense,
        diagDate: d.diagDate,
      })),
      procedures: (v.procedures || []).map((p) => ({
        sequence: p.sequence,
        procedureCode: p.procedureCode,
        codeSys: p.codeSys,
        procedureTerm: p.procedureTerm,
        doctorLicense: p.doctorLicense,
        startDate: p.startDate,
        startTime: p.startTime,
        endDate: p.endDate,
        endTime: p.endTime,
        location: p.location,
      })),
      billingItems: v.visitBillingItems.map((item) => ({
        hospitalCode: item.hospitalCode,
        aipnCode: item.aipnCode,
        tmtCode: item.tmtCode ?? null,
        stdCode: item.stdCode ?? null,
        billingGroup: item.billingGroup,
        stdGroup: item.stdGroup ?? null,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount ?? 0),
        serviceDate: item.serviceDate,
        sksDrugCode: item.sksDrugCode ?? null,
        sksReimbPrice: item.sksReimbPrice ? Number(item.sksReimbPrice) : null,
        claimUnitPrice: Number(item.claimUnitPrice ?? item.unitPrice),
        claimCategory: item.claimCategory || 'T',
      })),
    }));
  }

  /** Validate a single admission has required data */
  private validateAdmission(admission: CipnAdmissionData): string[] {
    const issues: string[] = [];

    if (!admission.an) issues.push('ไม่มีเลข AN (Admission Number)');
    if (!admission.patientCitizenId || admission.patientCitizenId.length !== 13) {
      issues.push('เลขบัตรประชาชนไม่ครบ 13 หลัก');
    }
    if (!admission.patientFullName) issues.push('ไม่มีชื่อ-สกุลผู้ป่วย');
    if (!admission.primaryDiagnosis && admission.diagnoses.length === 0) {
      issues.push('ไม่มีรหัสวินิจฉัย (IPDx)');
    }
    if (admission.billingItems.length === 0) issues.push('ไม่มีรายการเรียกเก็บ (BillItems)');
    if (!admission.admitDate && !admission.visitDate) issues.push('ไม่มีวันที่ admit');

    return issues;
  }

  /** Get hospital settings from AppSetting */
  private async getHospitalSettings(): Promise<{ hcode: string; hname: string }> {
    const hospitalIdSetting = await this.prisma.appSetting.findUnique({
      where: { settingKey: 'hospital_id' },
    });

    const settingValue = hospitalIdSetting?.settingValue?.trim();
    if (!settingValue) {
      throw new BadRequestException(
        'ยังไม่ได้ตั้งค่าสถานพยาบาล — กรุณาตั้งค่า hospital_id ในหน้า Settings',
      );
    }

    const numericId = parseInt(settingValue, 10);
    let hospital = await this.prisma.hospital.findUnique({
      where: { id: numericId },
      select: { hcode5: true, nameThai: true },
    });

    if (!hospital) {
      hospital = await this.prisma.hospital.findFirst({
        where: { hcode5: settingValue },
        select: { hcode5: true, nameThai: true },
      });
    }

    if (!hospital || !hospital.hcode5) {
      throw new BadRequestException('ไม่พบข้อมูลสถานพยาบาลหรือไม่มี hcode5');
    }

    return { hcode: hospital.hcode5, hname: hospital.nameThai };
  }

  /** Reserve next CIPN session number (starts at 10000, per spec) */
  private async reserveSessionNo(hcode: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.billingExportBatch.findFirst({
        where: { hcode, exportType: 'CIPN' },
        orderBy: { sessionNo: 'desc' },
        select: { sessionNo: true },
      });
      const nextFromLast = (last?.sessionNo || 9999) + 1;
      return Math.max(10000, nextFromLast);
    });
  }

  /** Create ZIP buffer from file entries */
  private createZip(files: { name: string; content: Buffer }[]): Promise<Buffer> {
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
