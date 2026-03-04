import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService, Prisma } from '../../prisma';
import { ImportService } from '../protocol-analysis/services/import.service';
import { HisApiClient } from './his-api.client';
import {
  HisPatientSearchResult,
  HisPatientData,
  HisVisit,
  isCancerRelatedIcd10,
  analyzeVisitCompleteness,
  HisSearchPreviewResult,
} from './types/his-api.types';
import { AdvancedSearchDto } from './dto/advanced-search.dto';

/** M-06 fix: Validate and sanitize ICD-10 code format */
function sanitizeIcd10(code: string | null | undefined): string {
  if (!code) return '';
  const trimmed = String(code).trim().toUpperCase();
  // Valid ICD-10: letter + 2 digits + optional (dot + 1-4 digits) OR letter + 2-5 digits (dot-less)
  if (!/^[A-Z]\d{2}(\.\d{1,4})?$/.test(trimmed) && !/^[A-Z]\d{2,6}$/.test(trimmed)) {
    return trimmed.replace(/[^A-Z0-9.]/g, '').slice(0, 10);
  }
  return trimmed;
}

/** M-06 fix: Sanitize patient name — trim and limit length */
function sanitizePatientName(name: string | null | undefined): string {
  if (!name) return '';
  return String(name).trim().slice(0, 200);
}

type TxClient = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

export interface PreviewResult {
  patient: HisPatientSearchResult;
  existingPatientId: number | null;
  totalVisits: number;
  cancerRelatedVisits: number;
  alreadyImportedVns: string[];
  newVisitsToImport: number;
}

export interface ImportResult {
  patientId: number;
  importId: number;
  totalVisitsFromHis: number;
  cancerRelatedVisits: number;
  importedVisits: number;
  skippedDuplicate: number;
  skippedNonCancer: number;
  linkedVisitCount: number;
}

@Injectable()
export class HisIntegrationService {
  private readonly logger = new Logger(HisIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hisClient: HisApiClient,
    private readonly importService: ImportService,
  ) {}

  /** Search patients from HIS */
  async searchPatient(query: string, type?: string): Promise<HisPatientSearchResult[]> {
    // Auto-detect search type
    const trimmed = query.trim();
    if (!type) {
      if (/^\d{13}$/.test(trimmed)) {
        type = 'citizen_id';
      } else if (/^\d+$/.test(trimmed)) {
        type = 'hn';
      } else {
        // HIS API does not support name search
        throw new BadRequestException(
          'HIS API รองรับค้นหาด้วย HN หรือเลขบัตรประชาชนเท่านั้น — ไม่รองรับค้นหาด้วยชื่อ',
        );
      }
    }

    // HIS system uses 9-digit HN — pad with leading zeros
    let searchQuery = trimmed;
    if (type === 'hn') {
      searchQuery = trimmed.padStart(9, '0');
    }

    return this.hisClient.searchPatient(searchQuery, type);
  }

  /** Preview import — fetch data from HIS and compute what will be imported */
  async preview(hn: string, from?: string, to?: string): Promise<PreviewResult> {
    const hisData = await this.hisClient.fetchVisitData(hn, from, to);

    // Check if patient already exists
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { hn: hisData.patient.hn },
          ...(hisData.patient.citizenId ? [{ citizenId: hisData.patient.citizenId }] : []),
        ],
      },
      select: { id: true },
    });

    // Filter cancer-related visits
    const cancerVisits = hisData.visits.filter((v) =>
      isCancerRelatedIcd10(v.primaryDiagnosis),
    );

    // Find already-imported VNs
    const allVns = cancerVisits.map((v) => v.vn);
    const existingVisits = allVns.length > 0
      ? await this.prisma.patientVisit.findMany({
          where: { vn: { in: allVns } },
          select: { vn: true },
        })
      : [];
    const existingVnSet = new Set(existingVisits.map((v) => v.vn));
    const newVisits = cancerVisits.filter((v) => !existingVnSet.has(v.vn));

    return {
      patient: hisData.patient,
      existingPatientId: existingPatient?.id ?? null,
      totalVisits: hisData.visits.length,
      cancerRelatedVisits: cancerVisits.length,
      alreadyImportedVns: [...existingVnSet],
      newVisitsToImport: newVisits.length,
    };
  }

  /** Import patient data from HIS into our database */
  async importPatient(
    hn: string,
    userId: number | null,
    from?: string,
    to?: string,
  ): Promise<ImportResult> {
    const hisData = await this.hisClient.fetchVisitData(hn, from, to);

    // 1. Filter cancer-related visits
    const cancerVisits = hisData.visits.filter((v) =>
      isCancerRelatedIcd10(v.primaryDiagnosis),
    );
    const skippedNonCancer = hisData.visits.length - cancerVisits.length;

    // 2. Find already-imported VNs (skip duplicates)
    const allVns = cancerVisits.map((v) => v.vn);
    const existingVisits = allVns.length > 0
      ? await this.prisma.patientVisit.findMany({
          where: { vn: { in: allVns } },
          select: { vn: true },
        })
      : [];
    const existingVnSet = new Set(existingVisits.map((v) => v.vn));
    const newVisits = cancerVisits.filter((v) => !existingVnSet.has(v.vn));
    const skippedDuplicate = cancerVisits.length - newVisits.length;

    if (newVisits.length === 0) {
      throw new BadRequestException(
        'ไม่มี visit ใหม่ที่ต้อง import — อาจ import ไปแล้วทั้งหมด หรือไม่พบ visit ที่เกี่ยวกับมะเร็ง',
      );
    }

    // Wrap all DB writes in a transaction to prevent partial data on failure
    const result = await this.prisma.$transaction(async (tx) => {
      // 3. Create/update Patient
      const patientId = await this.upsertPatient(tx, hisData.patient);

      // 4. Create PatientImport batch
      const importRecord = await tx.patientImport.create({
        data: {
          filename: `HIS_API_${hn}_${new Date().toISOString().slice(0, 10)}`,
          source: 'HIS_API',
          totalRows: hisData.visits.length,
          importedRows: 0,
          skippedRows: 0,
          importedById: userId,
          status: 'PROCESSING',
        },
      });

      // 5. Import each new visit
      let importedCount = 0;
      const errors: { vn: string; message: string }[] = [];

      for (const visit of newVisits) {
        try {
          await this.importVisit(tx, visit, importRecord.id, patientId, hn);
          importedCount++;
        } catch (err: any) {
          this.logger.warn(`Failed to import VN ${visit.vn}: ${err.message}`);
          errors.push({ vn: visit.vn, message: err.message?.substring(0, 200) });
        }
      }

      // 6. Update import record
      await tx.patientImport.update({
        where: { id: importRecord.id },
        data: {
          importedRows: importedCount,
          skippedRows: skippedNonCancer + skippedDuplicate + (newVisits.length - importedCount),
          status: 'COMPLETED',
          errorLog: errors.length > 0 ? JSON.stringify(errors) : null,
        },
      });

      return { patientId, importId: importRecord.id, importedCount, errors };
    }, { timeout: 60000 }); // 60s timeout for large imports

    // 7. Count total linked visits for this patient (outside transaction, read-only)
    const linkedVisitCount = await this.prisma.patientVisit.count({
      where: { hn },
    });

    return {
      patientId: result.patientId,
      importId: result.importId,
      totalVisitsFromHis: hisData.visits.length,
      cancerRelatedVisits: cancerVisits.length,
      importedVisits: result.importedCount,
      skippedDuplicate,
      skippedNonCancer,
      linkedVisitCount,
    };
  }

  /** Create or update Patient from HIS data */
  private async upsertPatient(tx: TxClient, p: HisPatientSearchResult): Promise<number> {
    const existing = await tx.patient.findFirst({
      where: {
        OR: [{ hn: p.hn }, ...(p.citizenId ? [{ citizenId: p.citizenId }] : [])],
      },
      select: { id: true },
    });

    // M-06 fix: Sanitize HIS patient data before saving
    const data = {
      hn: p.hn,
      citizenId: p.citizenId,
      fullName: sanitizePatientName(p.fullName),
      titleName: sanitizePatientName(p.titleName) || null,
      gender: p.gender || null,
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
      address: p.address ? String(p.address).trim().slice(0, 500) : null,
      phoneNumber: p.phoneNumber || null,
      mainHospitalCode: p.mainHospitalCode || null,
    };

    if (existing) {
      await tx.patient.update({
        where: { id: existing.id },
        data,
      });
      return existing.id;
    }

    const created = await tx.patient.create({ data });
    return created.id;
  }

  /** Import a single visit with medications and billing items */
  private async importVisit(
    tx: TxClient,
    visit: HisVisit,
    importId: number,
    patientId: number,
    hn: string,
  ): Promise<void> {
    // M-06 fix: Sanitize ICD-10 codes from HIS before processing
    const sanitizedPrimaryDx = sanitizeIcd10(visit.primaryDiagnosis);

    // Resolve ICD-10 → CancerSite (read-only lookup, OK outside tx)
    const resolvedSiteId = await this.importService.resolveIcd10(sanitizedPrimaryDx);

    // Normalize diagnosis codes
    const primaryDx = sanitizedPrimaryDx.replace(/\./g, '').toUpperCase();
    const secondaryDx = visit.secondaryDiagnoses
      ? sanitizeIcd10(visit.secondaryDiagnoses).replace(/\./g, '').toUpperCase()
      : null;

    // Build medicationsRaw from structured array (for protocol matching compatibility)
    const meds = visit.medications ?? [];
    const medicationsRaw = meds.length > 0
      ? meds
          .map((m) => `${m.hospitalCode || ''} - ${m.medicationName} ${m.quantity || ''} ${m.unit || ''}`.trim())
          .join('\n')
      : null;

    // Create visit record
    const createdVisit = await tx.patientVisit.create({
      data: {
        importId,
        hn,
        vn: visit.vn,
        visitDate: new Date(visit.visitDate),
        primaryDiagnosis: primaryDx,
        secondaryDiagnoses: secondaryDx,
        hpi: visit.hpi ? String(visit.hpi).trim().slice(0, 2000) : null,
        doctorNotes: visit.doctorNotes ? String(visit.doctorNotes).trim().slice(0, 2000) : null,
        medicationsRaw,
        serviceStartTime: visit.serviceStartTime ? new Date(visit.serviceStartTime) : null,
        serviceEndTime: visit.serviceEndTime ? new Date(visit.serviceEndTime) : null,
        physicianLicenseNo: visit.physicianLicenseNo || null,
        clinicCode: visit.clinicCode || null,
        // SSOP 0.93 fields
        billNo: visit.billNo || null,
        visitType: visit.visitType || null,
        dischargeType: visit.dischargeType || null,
        nextAppointmentDate: visit.nextAppointmentDate ? new Date(visit.nextAppointmentDate) : null,
        serviceClass: visit.serviceClass || null,
        serviceType: visit.serviceType || null,
        prescriptionTime: visit.prescriptionTime ? new Date(visit.prescriptionTime) : null,
        dayCover: visit.dayCover || null,
        resolvedSiteId,
        patientId,
      },
    });

    // Create VisitMedication + VisitBillingItem records
    await this.createVisitMedications(tx, createdVisit.id, meds);
    await this.createVisitBillingItems(tx, createdVisit.id, visit.billingItems ?? []);
  }

  /** Search + preview: single call returns patient + enriched visits with completeness */
  async searchAndPreview(query: string, type?: string): Promise<HisSearchPreviewResult> {
    // Auto-detect search type
    const trimmed = query.trim();
    if (!type) {
      if (/^\d{13}$/.test(trimmed)) {
        type = 'citizen_id';
      } else if (/^\d+$/.test(trimmed)) {
        type = 'hn';
      } else {
        throw new BadRequestException(
          'HIS API รองรับค้นหาด้วย HN หรือเลขบัตรประชาชนเท่านั้น — ไม่รองรับค้นหาด้วยชื่อ',
        );
      }
    }

    const hisData = await this.hisClient.fetchPatientWithVisits(
      trimmed,
      type as 'hn' | 'citizen_id',
    );

    // Check if patient already exists in our DB
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { hn: hisData.patient.hn },
          ...(hisData.patient.citizenId ? [{ citizenId: hisData.patient.citizenId }] : []),
        ],
      },
      select: { id: true },
    });

    // Find already-imported VNs
    const allVns = hisData.visits.map((v) => v.vn);
    const existingVisits =
      allVns.length > 0
        ? await this.prisma.patientVisit.findMany({
            where: { vn: { in: allVns } },
            select: { vn: true },
          })
        : [];
    const existingVnSet = new Set(existingVisits.map((v) => v.vn));

    // Fetch non-supportive drug names for protocol drug detection (one query)
    const protocolDrugs = await this.prisma.drug.findMany({
      where: { isActive: true, drugCategory: { not: 'supportive' } },
      select: { genericName: true },
    });
    const protocolDrugNames = protocolDrugs.map((d) => d.genericName.toLowerCase());

    // Enrich each visit
    const enrichedVisits = hisData.visits.map((visit) => {
      const meds = visit.medications ?? [];
      const hasProtocolDrugs = meds.some((med) => {
        const medName = (med.medicationName || '').toLowerCase();
        return protocolDrugNames.some(
          (drugName) => medName.includes(drugName) || drugName.includes(medName),
        );
      });
      return {
        visit,
        isCancerRelated: isCancerRelatedIcd10(visit.primaryDiagnosis),
        isAlreadyImported: existingVnSet.has(visit.vn),
        completeness: analyzeVisitCompleteness(visit),
        hasProtocolDrugs,
      };
    });

    // Compute summary
    const cancerVisits = enrichedVisits.filter((v) => v.isCancerRelated);
    const alreadyImported = enrichedVisits.filter((v) => v.isAlreadyImported);
    const newImportable = cancerVisits.filter((v) => !v.isAlreadyImported);
    const completeVisits = newImportable.filter((v) => v.completeness.level === 'complete');
    const incompleteVisits = newImportable.filter((v) => v.completeness.level !== 'complete');

    return {
      patient: hisData.patient,
      existingPatientId: existingPatient?.id ?? null,
      visits: enrichedVisits,
      summary: {
        totalVisits: hisData.visits.length,
        cancerRelatedVisits: cancerVisits.length,
        alreadyImported: alreadyImported.length,
        newImportable: newImportable.length,
        completeVisits: completeVisits.length,
        incompleteVisits: incompleteVisits.length,
      },
    };
  }

  /** Import a single visit by VN — fetches from HIS, validates, and writes to DB */
  async importSingleVisit(
    vn: string,
    query: string,
    queryType: 'hn' | 'citizen_id',
    userId: number | null,
    forceIncomplete = false,
  ): Promise<{ patientId: number; importId: number }> {
    // 1. Check if VN already imported
    const existingVisit = await this.prisma.patientVisit.findFirst({
      where: { vn },
      select: { id: true },
    });
    if (existingVisit) {
      throw new BadRequestException(`VN ${vn} ถูกนำเข้าแล้ว`);
    }

    // 2. Fetch patient + visits from HIS
    const hisData = await this.hisClient.fetchPatientWithVisits(query, queryType);

    // 3. Find the target visit
    const targetVisit = hisData.visits.find((v) => v.vn === vn);
    if (!targetVisit) {
      throw new BadRequestException(`ไม่พบ VN ${vn} ในข้อมูลจาก HIS`);
    }

    // 4. Check completeness
    const completeness = analyzeVisitCompleteness(targetVisit);
    if (completeness.level === 'minimal' && !forceIncomplete) {
      const missingLabels = completeness.missingFields
        .filter((f) => f.priority === 'critical')
        .map((f) => f.label)
        .join(', ');
      throw new BadRequestException(
        `ข้อมูล visit ไม่สมบูรณ์ — ขาดข้อมูลสำคัญ: ${missingLabels} ` +
          `(ส่ง forceIncomplete=true เพื่อบังคับนำเข้า)`,
      );
    }

    // 5. Transaction: upsert patient + import single visit
    const result = await this.prisma.$transaction(
      async (tx) => {
        const patientId = await this.upsertPatient(tx, hisData.patient);

        const importRecord = await tx.patientImport.create({
          data: {
            filename: `HIS_SINGLE_${vn}_${new Date().toISOString().slice(0, 10)}`,
            source: 'HIS_API',
            totalRows: 1,
            importedRows: 1,
            skippedRows: 0,
            importedById: userId,
            status: 'COMPLETED',
          },
        });

        await this.importVisit(tx, targetVisit, importRecord.id, patientId, hisData.patient.hn);

        return { patientId, importId: importRecord.id };
      },
      { timeout: 30000 },
    );

    return result;
  }

  /** Create VisitMedication records (extracted helper for reuse) */
  private async createVisitMedications(
    tx: TxClient,
    visitId: number,
    medications: HisVisit['medications'] extends (infer T)[] | undefined ? NonNullable<HisVisit['medications']>[number][] : never[],
  ): Promise<number> {
    let count = 0;
    for (const med of medications) {
      const resolvedDrugId = med.medicationName
        ? await this.importService.resolveDrug(med.medicationName)
        : null;
      await tx.visitMedication.create({
        data: {
          visitId,
          rawLine: `${med.hospitalCode || ''} - ${med.medicationName}`.trim(),
          hospitalCode: med.hospitalCode || null,
          medicationName: med.medicationName || null,
          quantity: med.quantity || null,
          unit: med.unit || null,
          resolvedDrugId,
        },
      });
      count++;
    }
    return count;
  }

  /** Create VisitBillingItem records (extracted helper for reuse) */
  private async createVisitBillingItems(
    tx: TxClient,
    visitId: number,
    billingItems: NonNullable<HisVisit['billingItems']>,
  ): Promise<number> {
    let count = 0;
    for (const item of billingItems) {
      await tx.visitBillingItem.create({
        data: {
          visitId,
          hospitalCode: item.hospitalCode,
          aipnCode: item.aipnCode ? String(item.aipnCode) : null,
          tmtCode: item.tmtCode ? String(item.tmtCode) : null,
          stdCode: item.stdCode ? String(item.stdCode) : null,
          billingGroup: item.billingGroup,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          claimUnitPrice: item.claimUnitPrice ?? item.unitPrice,
          claimCategory: item.claimCategory || 'OP1',
          dfsText: item.dfsText || null,
          packsize: item.packsize || null,
          sigCode: item.sigCode || null,
          sigText: item.sigText || null,
          supplyDuration: item.supplyDuration || null,
        },
      });
      count++;
    }
    return count;
  }

  /** Sync an already-imported visit with latest data from HIS */
  async syncVisit(
    vn: string,
    query: string,
    queryType: 'hn' | 'citizen_id',
    userId: number,
  ): Promise<{
    patientId: number;
    visitId: number;
    updatedFields: string[];
    medicationsCount: number;
    billingItemsCount: number;
  }> {
    // 1. Find existing visit
    const existing = await this.prisma.patientVisit.findFirst({
      where: { vn },
      select: { id: true, patientId: true, hn: true },
    });
    if (!existing) {
      throw new BadRequestException(`ไม่พบ VN ${vn} ในระบบ — ต้อง import ก่อนจึงจะซิงค์ได้`);
    }

    // 2. Fetch fresh data from HIS
    const hisData = await this.hisClient.fetchPatientWithVisits(query, queryType);
    const freshVisit = hisData.visits.find((v) => v.vn === vn);
    if (!freshVisit) {
      throw new BadRequestException(`ไม่พบ VN ${vn} ในข้อมูลจาก HIS แล้ว`);
    }

    // 3. Prepare updated fields
    const sanitizedPrimaryDx = sanitizeIcd10(freshVisit.primaryDiagnosis);
    const resolvedSiteId = await this.importService.resolveIcd10(sanitizedPrimaryDx);
    const primaryDx = sanitizedPrimaryDx.replace(/\./g, '').toUpperCase();
    const secondaryDx = freshVisit.secondaryDiagnoses
      ? sanitizeIcd10(freshVisit.secondaryDiagnoses).replace(/\./g, '').toUpperCase()
      : null;
    const meds = freshVisit.medications ?? [];
    const medicationsRaw = meds.length > 0
      ? meds
          .map((m) => `${m.hospitalCode || ''} - ${m.medicationName} ${m.quantity || ''} ${m.unit || ''}`.trim())
          .join('\n')
      : null;

    // Track which fields changed
    const updatedFields: string[] = [];

    // 4. Transaction: delete children → update visit → re-create children
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Delete old medications and billing items
        const deletedMeds = await tx.visitMedication.deleteMany({ where: { visitId: existing.id } });
        const deletedItems = await tx.visitBillingItem.deleteMany({ where: { visitId: existing.id } });
        if (deletedMeds.count > 0) updatedFields.push('medications');
        if (deletedItems.count > 0) updatedFields.push('billingItems');

        // Update visit fields (preserve: confirmedProtocolId, confirmedRegimenId, confirmedAt,
        // confirmedByUserId, caseId, patientId, importId)
        const updateData = {
          visitDate: new Date(freshVisit.visitDate),
          primaryDiagnosis: primaryDx,
          secondaryDiagnoses: secondaryDx,
          hpi: freshVisit.hpi ? String(freshVisit.hpi).trim().slice(0, 2000) : null,
          doctorNotes: freshVisit.doctorNotes ? String(freshVisit.doctorNotes).trim().slice(0, 2000) : null,
          medicationsRaw,
          serviceStartTime: freshVisit.serviceStartTime ? new Date(freshVisit.serviceStartTime) : null,
          serviceEndTime: freshVisit.serviceEndTime ? new Date(freshVisit.serviceEndTime) : null,
          physicianLicenseNo: freshVisit.physicianLicenseNo || null,
          clinicCode: freshVisit.clinicCode || null,
          billNo: freshVisit.billNo || null,
          visitType: freshVisit.visitType || null,
          dischargeType: freshVisit.dischargeType || null,
          nextAppointmentDate: freshVisit.nextAppointmentDate ? new Date(freshVisit.nextAppointmentDate) : null,
          serviceClass: freshVisit.serviceClass || null,
          serviceType: freshVisit.serviceType || null,
          prescriptionTime: freshVisit.prescriptionTime ? new Date(freshVisit.prescriptionTime) : null,
          dayCover: freshVisit.dayCover || null,
          resolvedSiteId,
        };

        await tx.patientVisit.update({
          where: { id: existing.id },
          data: updateData,
        });
        updatedFields.push('visitFields');

        // Also update patient info
        await this.upsertPatient(tx, hisData.patient);

        // Re-create medications and billing items
        const medsCount = await this.createVisitMedications(tx, existing.id, meds);
        const itemsCount = await this.createVisitBillingItems(tx, existing.id, freshVisit.billingItems ?? []);

        return { medsCount, itemsCount };
      },
      { timeout: 30000 },
    );

    this.logger.log(
      `Synced VN ${vn}: ${result.medsCount} meds, ${result.itemsCount} billing items`,
    );

    return {
      patientId: existing.patientId!,
      visitId: existing.id,
      updatedFields,
      medicationsCount: result.medsCount,
      billingItemsCount: result.itemsCount,
    };
  }

  /** Advanced search — search patients from HIS by clinical criteria */
  async advancedSearch(dto: AdvancedSearchDto): Promise<HisPatientSearchResult[]> {
    // 1. Validate date range
    const fromDate = new Date(dto.from);
    const toDate = new Date(dto.to);
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) {
      throw new BadRequestException('วันเริ่มต้นต้องก่อนวันสิ้นสุด');
    }
    if (diffDays > 31) {
      throw new BadRequestException('ช่วงวันที่ต้องไม่เกิน 31 วัน');
    }

    // 2. Map cancerSiteIds → ICD-10 prefixes (flatten + deduplicate)
    let icdPrefixes: string[] | undefined;
    if (dto.cancerSiteIds && dto.cancerSiteIds.length > 0) {
      const siteIds = dto.cancerSiteIds.map((id) => {
        const num = parseInt(id, 10);
        if (isNaN(num)) throw new BadRequestException('cancerSiteIds แต่ละค่าต้องเป็นตัวเลข');
        return num;
      });
      const mappings = await this.prisma.icd10CancerSiteMap.findMany({
        where: { cancerSiteId: { in: siteIds }, isActive: true },
        select: { icdPrefix: true },
      });
      if (mappings.length === 0) {
        throw new BadRequestException('ไม่พบ ICD-10 mapping สำหรับตำแหน่งมะเร็งที่เลือก');
      }
      icdPrefixes = [...new Set(mappings.map((m) => m.icdPrefix))];
    }

    // 3. Call HIS API
    const results = await this.hisClient.advancedSearchPatients({
      from: dto.from,
      to: dto.to,
      icdPrefixes,
      secondaryDiagnosisCodes: dto.secondaryDiagCodes,
      drugKeywords: dto.drugNames,
    });

    // Map matchingVisitCount → totalVisitCount for frontend compatibility
    return results.map((p) => ({
      ...p,
      totalVisitCount: p.matchingVisitCount ?? p.totalVisitCount,
    }));
  }

  /** Get drug generic names used in protocols — for advanced search filter dropdown */
  async getProtocolDrugNames(): Promise<
    { id: number; genericName: string; drugCategory: string | null }[]
  > {
    return this.prisma.drug.findMany({
      where: {
        isActive: true,
        regimenDrugs: {
          some: {
            regimen: {
              protocolRegimens: { some: {} },
            },
          },
        },
      },
      select: {
        id: true,
        genericName: true,
        drugCategory: true,
      },
      orderBy: { genericName: 'asc' },
    });
  }

  /** Health check for HIS API connectivity */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return this.hisClient.healthCheck();
  }
}
