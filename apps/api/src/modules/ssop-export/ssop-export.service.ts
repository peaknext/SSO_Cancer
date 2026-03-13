import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as archiver from 'archiver';
import { PrismaService } from '../../prisma/prisma.service';
import { SsoAipnCatalogService } from '../sso-aipn-catalog/sso-aipn-catalog.service';
import { generateBilltranXml, buildBilltranRecords } from './generators/billtran.generator';
import { generateBilldispXml, buildBilldispRecords, resolveClaimUP, isDrugItem, isRadiationItem } from './generators/billdisp.generator';
import { generateOpServicesXml, buildOpServiceRecords } from './generators/opservices.generator';
import {
  encodeWindows874,
  formatDateCompact,
  formatDateTimeCompact,
  formatAmount,
  getBangkokDateParts,
} from './generators/encoding';
import type {
  SsopVisitData,
  BilltranRecord,
  BillItemRecord,
  OpServiceRecord,
  OpDxRecord,
  DispensingRecord,
  DispensedItemRecord,
} from './types/ssop.types';

/** Valid ClaimCat values per สกส. T10/R20 spec */
const VALID_CLAIM_CATEGORIES = new Set([
  'OP1', 'RRT', 'P01', 'P02', 'P03', 'REF', 'EM1', 'EM2', 'OPF', 'OPR',
]);

/** Cancer treatment drug categories eligible for OPR (excludes 'supportive') */
const OPR_DRUG_CATEGORIES = new Set([
  'chemotherapy', 'targeted therapy', 'immunotherapy', 'hormonal',
]);

/** Check if a diagnosis code is a cancer ICD-10 (C* or D0*) for ClaimCat smart default */
function isCancerDiagnosis(diagnosis: string): boolean {
  if (!diagnosis) return false;
  const code = diagnosis.replace(/\./g, '').toUpperCase();
  return code.startsWith('C') || code.startsWith('D0');
}

/**
 * Extract generic drug name from dfsText/sksDfsText.
 * Input format: "cisplatin 50 mg/50 mL injection" or "PACLITAXEL 300 MG"
 * Returns generic name (lowercase) or null.
 */
function extractGenericName(dfsText: string): string | null {
  if (!dfsText) return null;
  const trimmed = dfsText.trim();
  if (!trimmed) return null;

  // Match: generic name (letters/hyphens/spaces) followed by digits
  const match = trimmed.match(
    /^([a-z][a-z\s\-]+?)\s+\d/i,
  );
  return match ? match[1].trim().toLowerCase() : null;
}

export interface ValidationIssue {
  visitId: number;
  vn: string;
  issues: string[];
}

@Injectable()
export class SsopExportService {
  private readonly logger = new Logger(SsopExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aipnCatalogService: SsoAipnCatalogService,
  ) {}

  /** Preview/validate visits before export */
  async preview(visitIds: number[]): Promise<{
    valid: { visitId: number; vn: string; amount: number }[];
    invalid: ValidationIssue[];
    totalAmount: number;
  }> {
    const [aipnRateMap, aipnDateMap, genericNameIndex, serviceDescIndex, aipnCodeSet] =
      await Promise.all([
        this.aipnCatalogService.getAipnRateMap(),
        this.aipnCatalogService.getAipnDateMap(),
        this.aipnCatalogService.getGenericNameIndex(),
        this.aipnCatalogService.getServiceDescriptionIndex(),
        this.aipnCatalogService.getAipnCodeSet(),
      ]);
    const visits = await this.loadVisitData(
      visitIds, aipnRateMap, genericNameIndex, serviceDescIndex, aipnCodeSet,
    );
    const valid: { visitId: number; vn: string; amount: number }[] = [];
    const invalid: ValidationIssue[] = [];

    for (const visit of visits) {
      const issues = this.validateVisit(visit, aipnDateMap);
      if (issues.length === 0) {
        const amount = visit.billingItems.reduce(
          (sum, item) => sum + item.quantity * resolveClaimUP(item),
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
    const [aipnRateMap, aipnDateMap, genericNameIndex, serviceDescIndex, aipnCodeSet] =
      await Promise.all([
        this.aipnCatalogService.getAipnRateMap(),
        this.aipnCatalogService.getAipnDateMap(),
        this.aipnCatalogService.getGenericNameIndex(),
        this.aipnCatalogService.getServiceDescriptionIndex(),
        this.aipnCatalogService.getAipnCodeSet(),
      ]);
    const visits = await this.loadVisitData(
      visitIds, aipnRateMap, genericNameIndex, serviceDescIndex, aipnCodeSet,
    );
    const validVisits = visits.filter((v) => this.validateVisit(v, aipnDateMap).length === 0);

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

    // Get CareAccount setting for OPServices
    const careAccount = await this.getCareAccountSetting();

    // Check which VNs were previously exported (for tflag: A=new, E=edit)
    const previouslyExportedVns = await this.findPreviouslyExportedVns(
      validVisits.map((v) => v.vn),
    );

    // Generate XML content — billdisp first to get dispIdMap for billtran
    const { xml: billdispXml, dispIdMap } = generateBilldispXml(
      ssopVisits, hcode, hname, sessNoStr, svidMap,
    );
    const billtranXml = generateBilltranXml(
      ssopVisits, hcode, hname, sessNoStr, svidMap, dispIdMap, previouslyExportedVns,
    );
    const opservicesXml = generateOpServicesXml(
      ssopVisits, hcode, hname, sessNoStr, svidMap, careAccount,
    );

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
        v.billingItems.reduce((s, i) => s + i.quantity * resolveClaimUP(i), 0),
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

  /** Preview SSOP-formatted data for a single visit (read-only, no batch/session created) */
  async previewSsopData(visitId: number): Promise<{
    billtran: BilltranRecord;
    billItems: BillItemRecord[];
    opService: OpServiceRecord;
    opDx: OpDxRecord[];
    dispensing: DispensingRecord | null;
    dispensedItems: DispensedItemRecord[];
    validation: { valid: boolean; issues: string[] };
  }> {
    const [aipnRateMap, aipnDateMap, serviceDescIndex, aipnCodeSet] = await Promise.all([
      this.aipnCatalogService.getAipnRateMap(),
      this.aipnCatalogService.getAipnDateMap(),
      this.aipnCatalogService.getServiceDescriptionIndex(),
      this.aipnCatalogService.getAipnCodeSet(),
    ]);
    const visits = await this.loadVisitData(
      [visitId], aipnRateMap, undefined, serviceDescIndex, aipnCodeSet,
    );
    if (visits.length === 0) {
      throw new NotFoundException('ไม่พบข้อมูล visit');
    }

    const visitData = visits[0];
    const issues = this.validateVisit(visitData, aipnDateMap);

    const { hcode } = await this.getHospitalSettings();
    const careAccount = await this.getCareAccountSetting();

    // Build temporary SVID map for this single visit
    const svidMap = this.generateSvidMap([visitData]);

    // Convert to SsopVisitData
    const ssopVisit: SsopVisitData = {
      vn: visitData.vn,
      visitDate: visitData.visitDate,
      serviceStartTime: visitData.serviceStartTime,
      serviceEndTime: visitData.serviceEndTime,
      physicianLicenseNo: visitData.physicianLicenseNo,
      clinicCode: visitData.clinicCode,
      primaryDiagnosis: visitData.primaryDiagnosis,
      secondaryDiagnoses: visitData.secondaryDiagnoses,
      patientHn: visitData.patientHn,
      patientCitizenId: visitData.patientCitizenId,
      patientFullName: visitData.patientFullName,
      caseNumber: visitData.caseNumber,
      vcrCode: visitData.vcrCode,
      protocolCode: visitData.protocolCode,
      mainHospitalCode: visitData.mainHospitalCode,
      billNo: visitData.billNo,
      visitType: visitData.visitType,
      dischargeType: visitData.dischargeType,
      nextAppointmentDate: visitData.nextAppointmentDate,
      serviceClass: visitData.serviceClass,
      typeServ: visitData.typeServ,
      prescriptionTime: visitData.prescriptionTime,
      dayCover: visitData.dayCover,
      billingItems: visitData.billingItems,
    };

    // Build records — billdisp first to get dispIdMap
    const dispResult = buildBilldispRecords(ssopVisit, hcode, svidMap);
    const dispIdMap = new Map<string, string>();
    if (dispResult) {
      dispIdMap.set(ssopVisit.vn, dispResult.dispId);
    }

    const { tran, items } = buildBilltranRecords(
      ssopVisit, hcode, svidMap, dispIdMap,
    );
    const { service, dxRecords } = buildOpServiceRecords(
      ssopVisit, hcode, svidMap, careAccount,
    );

    return {
      billtran: tran,
      billItems: items,
      opService: service,
      opDx: dxRecords,
      dispensing: dispResult?.dispensing ?? null,
      dispensedItems: dispResult?.items ?? [],
      validation: { valid: issues.length === 0, issues },
    };
  }

  /** Preview or bulk-create VisitBillingClaims for all visits in a batch.
   *
   * dryRun=true  → return details only, no DB write
   * dryRun=false → create PENDING claims for eligible visits + return details
   *
   * Skip logic:
   *   latest claim = PENDING  → skip (already submitted, awaiting decision)
   *   latest claim = APPROVED → skip (already approved, no need to resubmit)
   *   no claim or latest = REJECTED → create new round (maxRound + 1)
   */
  async createBillingClaimsFromBatch(
    batchId: number,
    userId: number,
    dryRun = false,
  ): Promise<{
    created: number;
    skipped: number;
    details: Array<{
      visitId: number;
      vn: string;
      patientName: string;
      action: 'CREATED' | 'SKIPPED';
      skipReason?: 'ALREADY_PENDING' | 'ALREADY_APPROVED';
      roundNumber?: number;
    }>;
  }> {
    const batch = await this.prisma.billingExportBatch.findUnique({
      where: { id: batchId },
      select: { id: true, sessionNo: true, visitIds: true },
    });
    if (!batch) throw new NotFoundException('ไม่พบข้อมูล export batch');

    const visitIds = batch.visitIds as number[];

    // Load visits with their billing claims (latest round first)
    const visits = await this.prisma.patientVisit.findMany({
      where: { id: { in: visitIds }, visitType: '1' },
      select: {
        id: true,
        vn: true,
        patient: { select: { fullName: true } },
        billingClaims: {
          where: { isActive: true },
          orderBy: { roundNumber: 'desc' },
        },
      },
    });

    const toCreate: Array<{ visitId: number; roundNumber: number }> = [];
    const details: Array<{
      visitId: number;
      vn: string;
      patientName: string;
      action: 'CREATED' | 'SKIPPED';
      skipReason?: 'ALREADY_PENDING' | 'ALREADY_APPROVED';
      roundNumber?: number;
    }> = [];

    for (const visit of visits) {
      const patientName = visit.patient?.fullName || visit.vn;

      const latestClaim = visit.billingClaims[0] ?? null;
      const maxRound = latestClaim?.roundNumber ?? 0;

      if (latestClaim?.status === 'PENDING') {
        details.push({ visitId: visit.id, vn: visit.vn, patientName, action: 'SKIPPED', skipReason: 'ALREADY_PENDING' });
      } else if (latestClaim?.status === 'APPROVED') {
        details.push({ visitId: visit.id, vn: visit.vn, patientName, action: 'SKIPPED', skipReason: 'ALREADY_APPROVED' });
      } else {
        const nextRound = maxRound + 1;
        toCreate.push({ visitId: visit.id, roundNumber: nextRound });
        details.push({ visitId: visit.id, vn: visit.vn, patientName, action: 'CREATED', roundNumber: nextRound });
      }
    }

    if (!dryRun && toCreate.length > 0) {
      const now = new Date();
      const sessLabel = String(batch.sessionNo).padStart(4, '0');
      await this.prisma.visitBillingClaim.createMany({
        data: toCreate.map(({ visitId, roundNumber }) => ({
          visitId,
          roundNumber,
          status: 'PENDING',
          submittedAt: now,
          notes: `SSOP Session ${sessLabel}`,
          createdByUserId: userId,
        })),
      });
    }

    return { created: toCreate.length, skipped: details.length - toCreate.length, details };
  }

  /** List export batches with claim status summary */
  async listBatches(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [batches, total] = await Promise.all([
      this.prisma.billingExportBatch.findMany({
        where: { isActive: true, exportType: 'SSOP' },
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
      this.prisma.billingExportBatch.count({ where: { isActive: true, exportType: 'SSOP' } }),
    ]);

    // Enrich with claim status summary per batch
    const allVisitIds = [...new Set(batches.flatMap((b) => b.visitIds as number[]))];
    const claims =
      allVisitIds.length > 0
        ? await this.prisma.visitBillingClaim.findMany({
            where: { visitId: { in: allVisitIds }, isActive: true },
            select: { visitId: true, roundNumber: true, status: true },
            orderBy: { roundNumber: 'desc' },
          })
        : [];

    // Keep only the latest claim per visit (highest roundNumber)
    const latestClaimByVisit = new Map<number, string>();
    for (const c of claims) {
      if (!latestClaimByVisit.has(c.visitId)) {
        latestClaimByVisit.set(c.visitId, c.status);
      }
    }

    const data = batches.map((batch) => {
      const vids = batch.visitIds as number[];
      let pending = 0,
        approved = 0,
        rejected = 0,
        noClaim = 0;
      for (const vid of vids) {
        const st = latestClaimByVisit.get(vid);
        if (!st) noClaim++;
        else if (st === 'PENDING') pending++;
        else if (st === 'APPROVED') approved++;
        else if (st === 'REJECTED') rejected++;
        else noClaim++;
      }
      return { ...batch, claimSummary: { pending, approved, rejected, noClaim } };
    });

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

  /** List visits that are export-ready: have billing items, basic data, linked case,
   *  and NOT already claimed with PENDING or APPROVED status (rejected visits can re-export) */
  async listExportableVisits(query: {
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { from, to, search, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    // Use AND array to avoid key collision with search OR / patient filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andConditions: any[] = [
      // 0. OPD only — exclude IPD visits (visitType='2')
      { visitType: '1' },
      // 1. Must have billing items
      { visitBillingItems: { some: { isActive: true } } },
      // 2. Approximate "data completeness" checks
      { patient: { isNot: null } },
      { primaryDiagnosis: { not: null } },
      { hn: { not: null } },
      { vn: { not: null } },
      { visitDate: { not: null } },
      // 3. Must have a linked case (caseNumber, vcrCode, protocol needed for SSOP)
      { case: { isNot: null } },
      // 4. NOT exported with active PENDING or APPROVED claim
      {
        NOT: {
          billingClaims: {
            some: { isActive: true, status: { in: ['PENDING', 'APPROVED'] } },
          },
        },
      },
    ];

    if (from || to) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visitDateFilter: any = {};
      if (from) visitDateFilter.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        visitDateFilter.lte = toDate;
      }
      andConditions.push({ visitDate: visitDateFilter });
    }

    if (search) {
      andConditions.push({
        OR: [
          { vn: { contains: search } },
          { hn: { contains: search } },
          { patient: { fullName: { contains: search, mode: 'insensitive' } } },
          { patient: { citizenId: { contains: search } } },
        ],
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { AND: andConditions };

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
          billingClaims: {
            where: { isActive: true },
            orderBy: { roundNumber: 'desc' },
            take: 1,
            select: { id: true, status: true, roundNumber: true },
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

  /**
   * Resolve ClaimCat for a billing item at export time.
   *
   * OPR upgrade rules (only from default OP1 — don't override HIS-provided values):
   * - All paths require: confirmed case + protocol + cancer diagnosis (C* or D0*)
   * - Drug/supply items (BillMuad 3/5): cancer treatment drug category
   *   (chemotherapy, targeted therapy, immunotherapy, hormonal).
   *   Supportive drugs (filgrastim, ondansetron, etc.) remain OP1.
   * - Radiation items (BillMuad 8): no AIPN/category check (uses MoF standard codes)
   * - Cancer service items (e.g. chemo mixing fee): resolved AIPN standard code
   */
  private resolveClaimCategory(
    rawCategory: string | null,
    item: { stdGroup: string | null; billingGroup: string },
    visit: {
      primaryDiagnosis: string;
      case?: { caseNumber?: string; protocol?: { protocolCode?: string } | null } | null;
    },
    aipnRate: number | null,
    drugCategory: string | null,
    hasResolvedAipn: boolean = false,
  ): string {
    const category = rawCategory || 'OP1';
    if (category !== 'OP1') return category;

    const hasCancerCase =
      visit.case?.caseNumber &&
      visit.case?.protocol?.protocolCode &&
      isCancerDiagnosis(visit.primaryDiagnosis);

    if (!hasCancerCase) return category;

    // Drug/supply items: cancer treatment drug category is sufficient for OPR
    if (isDrugItem(item) && OPR_DRUG_CATEGORIES.has(drugCategory || '')) {
      return 'OPR';
    }
    // Radiation therapy items (BillMuad 8): no AIPN/category check needed
    if (isRadiationItem(item)) return 'OPR';
    // Cancer service items with resolved AIPN code (e.g. chemo mixing fee)
    if (hasResolvedAipn && !isDrugItem(item)) return 'OPR';

    return category;
  }

  /** Load enriched visit data with all relations needed for SSOP */
  private async loadVisitData(
    visitIds: number[],
    aipnRateMap?: Map<number, Array<{ rate: number; dateEffective: Date; dateExpiry: Date }>>,
    genericNameIndex?: Map<string, { code: number; dosage: string }[]>,
    serviceDescIndex?: Map<string, number>,
    aipnCodeSet?: Set<number>,
  ) {
    const visits = await this.prisma.patientVisit.findMany({
      where: { id: { in: visitIds }, visitType: '1' },
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
        medications: {
          where: { resolvedDrugId: { not: null } },
          select: {
            hospitalCode: true,
            resolvedDrug: { select: { drugCategory: true } },
          },
        },
      },
    });

    return visits.map((v) => {
      // Build hospitalCode → drugCategory map from resolved medications
      const drugCategoryMap = new Map<string, string>();
      for (const med of v.medications) {
        if (med.hospitalCode && med.resolvedDrug?.drugCategory) {
          drugCategoryMap.set(med.hospitalCode, med.resolvedDrug.drugCategory);
        }
      }

      return ({
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
      // SSOP 0.93 visit-level fields
      billNo: v.billNo ?? undefined,
      visitType: v.visitType ?? undefined,
      dischargeType: v.dischargeType ?? undefined,
      nextAppointmentDate: v.nextAppointmentDate,
      serviceClass: v.serviceClass ?? undefined,
      typeServ: v.serviceType ?? undefined,
      prescriptionTime: v.prescriptionTime,
      dayCover: v.dayCover ?? undefined,
      billingItems: v.visitBillingItems.map((item) => {
        // Resolve AIPN max-reimbursement rate effective on visit date
        // Tier 1: sksDrugCode (TMT TPU) → direct AIPN lookup
        // Tier 2: dfsText generic name → genericNameIndex → AIPN code → rate lookup
        let aipnRate: number | null = null;
        if (aipnRateMap) {
          // Tier 1: exact code match via sksDrugCode
          if (item.sksDrugCode) {
            const code = parseInt(item.sksDrugCode, 10);
            if (!isNaN(code)) {
              const versions = aipnRateMap.get(code);
              if (versions) {
                const effective = versions.find(
                  (ver) => ver.dateEffective <= v.visitDate && ver.dateExpiry >= v.visitDate,
                );
                if (effective) aipnRate = effective.rate;
              }
            }
          }
          // Tier 2: generic name text matching (fallback when sksDrugCode is null)
          if (aipnRate == null && genericNameIndex) {
            const textSource = item.sksDfsText || item.dfsText || item.description;
            const genericName = textSource ? extractGenericName(textSource) : null;
            if (genericName) {
              const entries = genericNameIndex.get(genericName);
              if (entries && entries.length > 0) {
                // Try each matching AIPN code until we find one effective on visit date
                for (const entry of entries) {
                  const versions = aipnRateMap.get(entry.code);
                  if (versions) {
                    const effective = versions.find(
                      (ver) => ver.dateEffective <= v.visitDate && ver.dateExpiry >= v.visitDate,
                    );
                    if (effective) {
                      aipnRate = effective.rate;
                      break;
                    }
                  }
                }
              }
            }
          }
        }
        // Resolve stdCode for non-drug items via AIPN description matching
        let resolvedStdCode = item.stdCode ?? null;
        let hasResolvedAipn = false;
        if (serviceDescIndex && aipnCodeSet) {
          const existingCode = parseInt(resolvedStdCode || item.aipnCode || '', 10);
          const isValidAipn = !isNaN(existingCode) && aipnCodeSet.has(existingCode);
          if (!isValidAipn && item.description) {
            const normalized = this.aipnCatalogService.normalizeDescription(item.description);
            if (normalized) {
              const resolvedCode = serviceDescIndex.get(normalized);
              if (resolvedCode) {
                resolvedStdCode = String(resolvedCode);
                hasResolvedAipn = true;
              }
            }
          } else if (isValidAipn) {
            hasResolvedAipn = true;
          }
        }

        return {
          hospitalCode: item.hospitalCode,
          aipnCode: item.aipnCode,
          tmtCode: item.tmtCode ?? null,
          stdCode: resolvedStdCode,
          billingGroup: item.billingGroup,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          claimUnitPrice: Number(item.claimUnitPrice ?? item.unitPrice),
          claimCategory: this.resolveClaimCategory(
            item.claimCategory, item, v, aipnRate,
            drugCategoryMap.get(item.hospitalCode) || null,
            hasResolvedAipn,
          ),
          // Drug/dispensing fields
          dfsText: item.dfsText ?? null,
          packsize: item.packsize ?? null,
          sigCode: item.sigCode ?? null,
          sigText: item.sigText ?? null,
          supplyDuration: item.supplyDuration ?? null,
          // SKS fields (TMT/SSO standard codes)
          sksDrugCode: item.sksDrugCode ?? null,
          stdGroup: item.stdGroup ?? null,
          sksDfsText: item.sksDfsText ?? null,
          sksReimbPrice: item.sksReimbPrice ? Number(item.sksReimbPrice) : null,
          aipnRate,
        };
      }),
    });
    });
  }

  /** Validate a single visit has all required data for SSOP */
  private validateVisit(
    visit: {
      patientCitizenId: string;
      patientFullName: string;
      vn: string;
      visitDate: Date;
      primaryDiagnosis: string;
      billingItems: {
        quantity: number;
        claimUnitPrice: number;
        aipnCode: string | null;
        claimCategory: string;
        billingGroup: string;
        stdGroup: string | null;
        description: string;
      }[];
      physicianLicenseNo: string | null;
      clinicCode: string | null;
      serviceStartTime: Date | null;
      serviceEndTime: Date | null;
      caseNumber: string;
      vcrCode: string;
      protocolCode: string;
      mainHospitalCode: string;
    },
    aipnDateMap?: Map<number, Array<{ dateEffective: Date; dateExpiry: Date }>>,
  ): string[] {
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
    if (!visit.protocolCode) issues.push('ไม่มีรหัส Protocol (ต้อง confirm protocol ก่อน)');
    if (!visit.mainHospitalCode) issues.push('ไม่มีรหัส รพ.ตามสิทธิ');

    // AIPN dateEffective validation (multi-version aware)
    if (aipnDateMap) {
      const visitDate = visit.visitDate;
      for (const item of visit.billingItems) {
        if (!item.aipnCode) continue;
        const code = parseInt(item.aipnCode, 10);
        if (isNaN(code)) continue;
        const versions = aipnDateMap.get(code);
        if (!versions) continue; // not in catalog — no date to validate
        const validVersion = versions.find(
          (v) => v.dateEffective <= visitDate && v.dateExpiry >= visitDate,
        );
        if (!validVersion) {
          const allFuture = versions.every((v) => v.dateEffective > visitDate);
          const allExpired = versions.every((v) => v.dateExpiry < visitDate);
          if (allFuture) {
            const earliest = versions[0].dateEffective;
            issues.push(
              `รหัส AIPN ${code} ยังไม่มีผลบังคับใช้ ณ วันที่เข้ารับบริการ` +
              ` (มีผล ${earliest.toISOString().split('T')[0]})`,
            );
          } else if (allExpired) {
            const latest = versions[versions.length - 1].dateExpiry;
            issues.push(
              `รหัส AIPN ${code} หมดอายุแล้ว ณ วันที่เข้ารับบริการ` +
              ` (หมดอายุ ${latest.toISOString().split('T')[0]})`,
            );
          } else {
            issues.push(
              `รหัส AIPN ${code} ไม่มี version ที่ครอบคลุมวันที่เข้ารับบริการ`,
            );
          }
        }
      }
    }

    // ClaimCat validation (T10/R20 spec)
    for (const item of visit.billingItems) {
      if (item.claimCategory && !VALID_CLAIM_CATEGORIES.has(item.claimCategory)) {
        issues.push(
          `ClaimCat "${item.claimCategory}" ไม่ถูกต้อง` +
          ` (${item.description || 'ไม่มีคำอธิบาย'})` +
          ` — ค่าที่อนุญาต: OP1, RRT, P01-P03, REF, EM1-EM2, OPF, OPR`,
        );
      }
    }

    return issues;
  }

  /**
   * Generate unique SVID for each visit.
   *
   * Format: Buddhist Era YYMMDDHHMMSS (matches Thai hospital convention).
   * Example: 681112191059 = BE 2568/11/12 19:10:59 = CE 2025-11-12 19:10:59
   *
   * Uses serviceStartTime if available; falls back to visitDate with a
   * sequential seconds offset to guarantee uniqueness within a batch.
   *
   * NOTE: Uses Bangkok timezone (UTC+7) explicitly — safe in UTC Docker containers.
   */
  private generateSvidMap(
    visits: { vn: string; visitDate: Date; serviceStartTime: Date | null }[],
  ): Map<string, string> {
    const map = new Map<string, string>();
    const usedSvids = new Set<string>();

    for (let i = 0; i < visits.length; i++) {
      const v = visits[i];
      const d = v.serviceStartTime || v.visitDate;
      // Use Bangkok timezone for consistent Thai local time
      const p = getBangkokDateParts(d);
      // Buddhist Era = CE + 543
      const beYear = p.year + 543;
      const yy = String(beYear).slice(-2);
      const mm = String(p.month).padStart(2, '0');
      const dd = String(p.day).padStart(2, '0');
      const hh = String(p.hours).padStart(2, '0');
      const min = String(p.minutes).padStart(2, '0');
      const ss = String(p.seconds).padStart(2, '0');

      let svid = `${yy}${mm}${dd}${hh}${min}${ss}`;

      // Ensure uniqueness — if collision, increment seconds
      let offset = 1;
      while (usedSvids.has(svid)) {
        const adjSec = String((p.seconds + offset) % 100).padStart(2, '0');
        svid = `${yy}${mm}${dd}${hh}${min}${adjSec}`;
        offset++;
      }

      usedSvids.add(svid);
      map.set(v.vn, svid);
    }

    return map;
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

    // Support both database ID and hcode5 — users naturally enter hcode5
    const numericId = parseInt(settingValue, 10);
    let hospital = await this.prisma.hospital.findUnique({
      where: { id: numericId },
      select: { hcode5: true, nameThai: true },
    });

    // If not found by ID, try as hcode5
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

  /** Get CareAccount setting from AppSetting (default "1") */
  private async getCareAccountSetting(): Promise<string> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { settingKey: 'ssop_care_account' },
    });
    return setting?.settingValue || '1';
  }

  /** Find VNs that were already exported in a previous batch (for tflag=E) */
  private async findPreviouslyExportedVns(vns: string[]): Promise<Set<string>> {
    if (vns.length === 0) return new Set();

    // Get all batches that contain any of these VNs via visitIds → PatientVisit.vn
    const batches = await this.prisma.billingExportBatch.findMany({
      where: { isActive: true },
      select: { visitIds: true },
    });

    // Collect all previously exported visit IDs
    const allExportedIds = new Set<number>();
    for (const batch of batches) {
      if (Array.isArray(batch.visitIds)) {
        for (const id of batch.visitIds) {
          allExportedIds.add(id as number);
        }
      }
    }

    if (allExportedIds.size === 0) return new Set();

    // Look up VNs for these visit IDs that match our target VN list
    const visits = await this.prisma.patientVisit.findMany({
      where: {
        vn: { in: vns },
        id: { in: Array.from(allExportedIds) },
        visitType: '1',
      },
      select: { vn: true },
    });

    return new Set(visits.map((v) => v.vn));
  }

  /** Reserve next session number scoped by hcode (atomic via transaction) */
  private async reserveSessionNo(hcode: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const [last, startSetting] = await Promise.all([
        tx.billingExportBatch.findFirst({
          where: { hcode },
          orderBy: { sessionNo: 'desc' },
          select: { sessionNo: true },
        }),
        tx.appSetting.findUnique({
          where: { settingKey: 'ssop_session_no_start' },
          select: { settingValue: true },
        }),
      ]);
      const startNo = Math.max(1, parseInt(startSetting?.settingValue || '1', 10) || 1);
      const nextFromLast = (last?.sessionNo || 0) + 1;
      return Math.max(startNo, nextFromLast);
    });
  }

  /** Return a map of visitId → export batches that include it */
  async getVisitExportStatus(
    visitIds: number[],
  ): Promise<Record<number, Array<{ batchId: number; sessionNo: number; createdAt: string }>>> {
    if (visitIds.length === 0) return {};

    const batches = await this.prisma.billingExportBatch.findMany({
      where: { isActive: true, visitIds: { hasSome: visitIds } },
      select: { id: true, sessionNo: true, createdAt: true, visitIds: true },
      orderBy: { createdAt: 'asc' },
    });

    const result: Record<number, Array<{ batchId: number; sessionNo: number; createdAt: string }>> =
      {};
    for (const batch of batches) {
      for (const vid of batch.visitIds as number[]) {
        if (visitIds.includes(vid)) {
          if (!result[vid]) result[vid] = [];
          result[vid].push({
            batchId: batch.id,
            sessionNo: batch.sessionNo,
            createdAt: batch.createdAt.toISOString(),
          });
        }
      }
    }
    return result;
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
