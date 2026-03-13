import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService, Prisma } from '../../prisma';
import { ImportService } from '../protocol-analysis/services/import.service';
import { HisApiClient } from './his-api.client';
import {
  HisPatientSearchResult,
  HisPatientData,
  HisVisit,
  HisAdmission,
  isCancerRelatedIcd10,
  isCancerRelatedAdmission,
  extractDiagnosesFromArray,
  proceduresToSecondaryDiagCodes,
  analyzeVisitCompleteness,
  HisSearchPreviewResult,
} from './types/his-api.types';
import { AdvancedSearchDto } from './dto/advanced-search.dto';
import { normalizeHn } from '../../common/utils/normalize-hn';

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
    const hisData = await this.hisClient.fetchPatientWithVisits(hn, 'hn', from, to);

    // Check if patient already exists (search both normalized and raw HN)
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { hn: normalizeHn(hisData.patient.hn) },
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
    options?: { skipVisitsWithoutMedications?: boolean },
  ): Promise<ImportResult> {
    const hisData = await this.hisClient.fetchPatientWithVisits(hn, 'hn', from, to);

    // 1. Filter cancer-related visits
    const cancerVisits = hisData.visits.filter((v) =>
      isCancerRelatedIcd10(v.primaryDiagnosis),
    );
    const skippedNonCancer = hisData.visits.length - cancerVisits.length;

    // Filter visits with medications if configured
    let visitsToProcess = cancerVisits;
    if (options?.skipVisitsWithoutMedications) {
      visitsToProcess = cancerVisits.filter((v) => {
        const hasMeds = (v.medications?.length ?? 0) > 0;
        const hasDrugBilling = (v.billingItems ?? []).some(
          (b) => String(b.billingGroup) === '3' || String(b.billingGroup) === '03',
        );
        return hasMeds || hasDrugBilling;
      });
    }

    // 2. Find already-imported VNs (skip duplicates)
    const allVns = visitsToProcess.map((v) => v.vn);
    const existingVisits = allVns.length > 0
      ? await this.prisma.patientVisit.findMany({
          where: { vn: { in: allVns } },
          select: { vn: true },
        })
      : [];
    const existingVnSet = new Set(existingVisits.map((v) => v.vn));
    const newVisits = visitsToProcess.filter((v) => !existingVnSet.has(v.vn));
    const skippedDuplicate = visitsToProcess.length - newVisits.length;

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
      where: { hn: normalizeHn(hn) },
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
        OR: [
          { hn: normalizeHn(p.hn) },
          { hn: p.hn }, // also match raw HN for previously imported data
          ...(p.citizenId ? [{ citizenId: p.citizenId }] : []),
        ],
      },
      select: { id: true },
    });

    // M-06 fix: Sanitize HIS patient data before saving
    const normalizedHn = normalizeHn(p.hn);
    const data = {
      hn: normalizedHn,
      citizenId: p.citizenId,
      fullName: sanitizePatientName(p.fullName),
      titleName: sanitizePatientName(p.titleName) || null,
      gender: p.gender || null,
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
      address: p.address ? String(p.address).trim().slice(0, 500) : null,
      phoneNumber: p.phoneNumber || null,
      mainHospitalCode: p.mainHospitalCode || null,
      // CIPN demographic fields
      idType: p.idType?.slice(0, 2) || null,
      maritalStatus: p.maritalStatus?.slice(0, 2) || null,
      nationality: p.nationality?.slice(0, 5) || null,
      province: p.province?.slice(0, 5) || null,
      district: p.district?.slice(0, 10) || null,
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
    // Normalize HN: strip leading zeros to match CSV format
    const normalizedHn = normalizeHn(hn);

    // M-06 fix: Sanitize ICD-10 codes from HIS before processing
    const sanitizedPrimaryDx = sanitizeIcd10(visit.primaryDiagnosis);

    // Resolve ICD-10 → CancerSite (read-only lookup, OK outside tx)
    const resolvedSiteId = await this.importService.resolveIcd10(sanitizedPrimaryDx);

    // Normalize diagnosis codes
    const primaryDx = sanitizedPrimaryDx.replace(/\./g, '').toUpperCase();
    // Secondary diagnoses are comma-separated — sanitize each code individually
    const secondaryDx = visit.secondaryDiagnoses
      ? visit.secondaryDiagnoses
          .split(',')
          .map((c) => sanitizeIcd10(c.trim()).replace(/\./g, '').toUpperCase())
          .filter(Boolean)
          .join(',')
      : null;

    // Build medicationsRaw from structured array (for protocol matching compatibility)
    const meds = visit.medications ?? [];
    // Fallback: extract drug info from billingItems (billingGroup=3/03) when medications array is empty
    const drugBillingItems = (visit.billingItems ?? []).filter(
      (b) => b.billingGroup === '3' || b.billingGroup === '03',
    );
    let medicationsRaw: string | null = null;
    if (meds.length > 0) {
      medicationsRaw = meds
        .map((m) => `${m.hospitalCode || ''} - ${m.medicationName} ${m.quantity || ''} ${m.unit || ''}`.trim())
        .join('\n');
    } else if (drugBillingItems.length > 0) {
      medicationsRaw = drugBillingItems
        .map((b) => `${b.hospitalCode || ''} - ${b.dfsText || b.description}`.trim())
        .join('\n');
    }

    // Create visit record
    const createdVisit = await tx.patientVisit.create({
      data: {
        importId,
        hn: normalizedHn,
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
        // SSOP 0.93 fields (receiptNo fallback for billNo — HIS may send either)
        billNo: visit.billNo || visit.receiptNo || null,
        visitType: visit.visitType || '1',
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
    const allBillingItems = visit.billingItems ?? [];
    const medCount = await this.createVisitMedications(tx, createdVisit.id, meds, allBillingItems);
    await this.createVisitBillingItems(tx, createdVisit.id, allBillingItems);

    // Fallback: create VisitMedication from drug billing items if medications array was empty
    if (medCount === 0 && drugBillingItems.length > 0) {
      await this.createMedicationsFromBillingItems(tx, createdVisit.id, drugBillingItems);
    }
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

    // Check if patient already exists in our DB (search both raw and normalized HN)
    const normalizedHn = normalizeHn(hisData.patient.hn);
    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { hn: normalizedHn },
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

    // Enrich each visit (normalize billing items for preview display)
    const enrichedVisits = hisData.visits.map((visit) => {
      const meds = visit.medications ?? [];
      const hasProtocolDrugs = meds.some((med) => {
        const medName = (med.medicationName || '').toLowerCase();
        return protocolDrugNames.some(
          (drugName) => medName.includes(drugName) || drugName.includes(medName),
        );
      });
      // Normalize billing items so preview shows corrected fields
      const normalizedVisit = visit.billingItems
        ? {
            ...visit,
            billingItems: visit.billingItems.map((item) => {
              const n = this.normalizeBillingItem(item);
              return {
                ...item,
                description: n.description,
                claimUnitPrice: n.claimUnitPrice,
                aipnCode: n.aipnCode ?? undefined,
                stdCode: n.stdCode ?? undefined,
                tmtCode: n.tmtCode ?? undefined,
              };
            }),
          }
        : visit;
      return {
        visit: normalizedVisit,
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
    billingItems?: NonNullable<HisVisit['billingItems']>,
  ): Promise<number> {
    let count = 0;
    for (const med of medications) {
      // Find matching billing item by hospitalCode to get sksDrugCode for AIPN resolution
      const matchingItem = billingItems?.find(
        (b) => (b.billingGroup === '3' || b.billingGroup === '03') && b.hospitalCode === med.hospitalCode,
      );
      const sksDrugCode = matchingItem?.sksDrugCode || null;
      const dfsText = matchingItem?.sksDfsText || matchingItem?.dfsText || null;

      const resolved = med.medicationName
        ? await this.importService.resolveDrug(med.medicationName, sksDrugCode, dfsText)
        : { drugId: null, aipnCode: sksDrugCode ? await this.importService.resolveAipnCode(sksDrugCode) : null };

      await tx.visitMedication.create({
        data: {
          visitId,
          rawLine: `${med.hospitalCode || ''} - ${med.medicationName}`.trim(),
          hospitalCode: med.hospitalCode || null,
          medicationName: med.medicationName || null,
          quantity: med.quantity || null,
          unit: med.unit || null,
          resolvedDrugId: resolved.drugId,
          resolvedAipnCode: resolved.aipnCode,
        },
      });
      count++;
    }
    return count;
  }

  /** Fallback: create VisitMedication records from drug billing items (billingGroup=3) */
  private async createMedicationsFromBillingItems(
    tx: TxClient,
    visitId: number,
    drugItems: NonNullable<HisVisit['billingItems']>,
  ): Promise<number> {
    let count = 0;
    for (const item of drugItems) {
      const dfsText = item.sksDfsText || item.dfsText || null;
      const drugName = dfsText || item.description;
      const resolved = drugName
        ? await this.importService.resolveDrug(drugName, item.sksDrugCode, dfsText)
        : { drugId: null, aipnCode: item.sksDrugCode ? await this.importService.resolveAipnCode(item.sksDrugCode) : null };

      await tx.visitMedication.create({
        data: {
          visitId,
          rawLine: `${item.hospitalCode || ''} - ${drugName}`.trim(),
          hospitalCode: item.hospitalCode || null,
          medicationName: drugName || null,
          quantity: item.quantity != null ? String(item.quantity) : null,
          unit: item.packsize || null,
          resolvedDrugId: resolved.drugId,
          resolvedAipnCode: resolved.aipnCode,
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
      const normalized = this.normalizeBillingItem(item);
      await tx.visitBillingItem.create({
        data: {
          visitId,
          hospitalCode: normalized.hospitalCode,
          aipnCode: normalized.aipnCode,
          tmtCode: normalized.tmtCode,
          stdCode: normalized.stdCode,
          billingGroup: normalized.billingGroup,
          description: normalized.description,
          quantity: normalized.quantity,
          unitPrice: normalized.unitPrice,
          claimUnitPrice: normalized.claimUnitPrice,
          claimCategory: normalized.claimCategory || 'OP1',
          dfsText: normalized.dfsText || null,
          packsize: normalized.packsize || null,
          sigCode: normalized.sigCode || null,
          sigText: normalized.sigText || null,
          supplyDuration: normalized.supplyDuration || null,
          sksDrugCode: normalized.sksDrugCode,
          stdGroup: normalized.stdGroup,
          sksDfsText: normalized.sksDfsText,
          sksReimbPrice: normalized.sksReimbPrice,
          serviceDate: normalized.serviceDate,
          discount: normalized.discount,
        },
      });
      count++;
    }
    return count;
  }

  /**
   * Normalize HIS billing item to handle known field swaps:
   * 1. description empty but dfsText has drug name → use dfsText as description
   * 2. claimUnitPrice is pre-multiplied total (qty × unitPrice) → divide by qty
   *
   * Note: sksDrugCode is the real TMT TPU code = sso_aipn_items.code (AIPN code)
   *        aipnCode field from HIS may be unreliable — always prefer sksDrugCode for drug matching
   */
  private normalizeBillingItem(item: NonNullable<HisVisit['billingItems']>[number]) {
    // Fallback description chain: description → sksDfsText → dfsText
    const description = item.description || item.sksDfsText || item.dfsText || '';

    // Fallback dfsText chain: sksDfsText → dfsText (prefer SKS description if available)
    const dfsText = item.sksDfsText || item.dfsText || null;

    // HIS sometimes sends claimUnitPrice as a pre-multiplied total instead of per-unit.
    // Detect both cases: qty×unitPrice OR qty×sksReimbPrice, and divide back to per-unit.
    let claimUnitPrice = item.claimUnitPrice ?? item.unitPrice;
    if (item.quantity > 0 && claimUnitPrice !== item.unitPrice) {
      if (claimUnitPrice === item.quantity * item.unitPrice) {
        // Case 1: total of sell price (qty × unitPrice)
        claimUnitPrice = claimUnitPrice / item.quantity;
      } else if (
        item.sksReimbPrice != null &&
        item.sksReimbPrice !== item.unitPrice &&
        claimUnitPrice === item.quantity * item.sksReimbPrice
      ) {
        // Case 2: total of reimb price (qty × sksReimbPrice)
        claimUnitPrice = claimUnitPrice / item.quantity;
      }
    }

    return {
      hospitalCode: item.hospitalCode?.slice(0, 20),
      aipnCode: item.aipnCode ? String(item.aipnCode).slice(0, 20) : null,
      tmtCode: item.tmtCode ? String(item.tmtCode).slice(0, 30) : null,
      stdCode: item.stdCode ? String(item.stdCode).slice(0, 20) : null,
      billingGroup: item.billingGroup?.slice(0, 5),
      description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      claimUnitPrice,
      claimCategory: item.claimCategory?.slice(0, 5),
      dfsText,
      packsize: item.packsize?.slice(0, 20),
      sigCode: item.sigCode?.slice(0, 20),
      sigText: item.sigText,
      supplyDuration: item.supplyDuration?.slice(0, 10),
      // SKS fields (TMT/SSO standard codes from HOSxP)
      sksDrugCode: item.sksDrugCode ? String(item.sksDrugCode).slice(0, 30) : null,
      stdGroup: item.stdGroup ? String(item.stdGroup).slice(0, 10) : null,
      sksDfsText: item.sksDfsText || null,
      sksReimbPrice: item.sksReimbPrice ?? null,
      // CIPN fields
      serviceDate: item.serviceDate ? new Date(item.serviceDate) : null,
      discount: item.discount ?? 0,
    };
  }

  /** Create structured VisitDiagnosis records from HIS diagnoses array (for CIPN IPDx) */
  private async createVisitDiagnoses(
    tx: TxClient,
    visitId: number,
    diagnoses: import('./types/his-api.types').HisDiagnosis[],
  ): Promise<number> {
    let count = 0;
    for (let i = 0; i < diagnoses.length; i++) {
      const dx = diagnoses[i];
      const code = dx.diagCode?.trim();
      if (!code) continue;
      await tx.visitDiagnosis.create({
        data: {
          visitId,
          sequence: i + 1,
          diagCode: code.replace(/\./g, '').toUpperCase().slice(0, 10),
          diagType: (dx.diagType?.trim() || '4').slice(0, 2),
          codeSys: 'ICD-10',
          diagTerm: dx.diagTerm?.slice(0, 500) || null,
          doctorLicense: dx.doctorLicense?.slice(0, 20) || null,
          diagDate: dx.diagDate ? new Date(dx.diagDate) : null,
        },
      });
      count++;
    }
    return count;
  }

  /** Create structured VisitProcedure records from HIS procedures array (for CIPN IPOp) */
  private async createVisitProcedures(
    tx: TxClient,
    visitId: number,
    procedures: import('./types/his-api.types').HisProcedure[],
  ): Promise<number> {
    let count = 0;
    for (let i = 0; i < procedures.length; i++) {
      const proc = procedures[i];
      const code = proc.procedureCode?.trim();
      if (!code) continue;
      await tx.visitProcedure.create({
        data: {
          visitId,
          sequence: i + 1,
          procedureCode: code.slice(0, 10),
          codeSys: proc.codeSys?.slice(0, 15) || 'ICD9CM',
          procedureTerm: proc.procedureTerm?.slice(0, 500) || null,
          doctorLicense: proc.doctorLicense?.slice(0, 20) || null,
          startDate: proc.startDate ? new Date(proc.startDate) : null,
          startTime: proc.startTime?.slice(0, 8) || null,
          endDate: proc.endDate ? new Date(proc.endDate) : null,
          endTime: proc.endTime?.slice(0, 8) || null,
          location: proc.location?.slice(0, 100) || null,
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
      ? freshVisit.secondaryDiagnoses
          .split(',')
          .map((c) => sanitizeIcd10(c.trim()).replace(/\./g, '').toUpperCase())
          .filter(Boolean)
          .join(',')
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
          billNo: freshVisit.billNo || freshVisit.receiptNo || null,
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
        const freshBillingItems = freshVisit.billingItems ?? [];
        const medsCount = await this.createVisitMedications(tx, existing.id, meds, freshBillingItems);
        const itemsCount = await this.createVisitBillingItems(tx, existing.id, freshBillingItems);

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

  /** Batch sync multiple already-imported visits with fresh data from HIS */
  async batchSyncVisits(
    hn: string,
    vns: string[],
    query: string,
    queryType: 'hn' | 'citizen_id',
    userId: number,
  ): Promise<{
    synced: number;
    failed: number;
    results: { vn: string; success: boolean; updatedFields?: string[]; error?: string }[];
  }> {
    const results: { vn: string; success: boolean; updatedFields?: string[]; error?: string }[] = [];
    let synced = 0;
    let failed = 0;

    for (const vn of vns) {
      try {
        const result = await this.syncVisit(vn, query, queryType, userId);
        results.push({ vn, success: true, updatedFields: result.updatedFields });
        synced++;
      } catch (err: any) {
        const message = err?.message || err?.response?.message || 'Unknown error';
        results.push({ vn, success: false, error: message });
        failed++;
        this.logger.warn(`Batch sync failed for VN ${vn}: ${message}`);
      }
    }

    return { synced, failed, results };
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

    // 4. Cross-check which HNs already exist in our Patient table (normalize to strip leading zeros)
    const normalizedHns = [...new Set(results.map((p) => normalizeHn(p.hn)))];
    const existingPatients = normalizedHns.length > 0
      ? await this.prisma.patient.findMany({
          where: { hn: { in: normalizedHns }, isActive: true },
          select: { hn: true, id: true },
        })
      : [];
    const existingHnMap = new Map(existingPatients.map((p) => [p.hn, p.id]));

    // Map matchingVisitCount → totalVisitCount for frontend compatibility
    return results.map((p) => ({
      ...p,
      totalVisitCount: p.matchingVisitCount ?? p.totalVisitCount,
      existsInSystem: existingHnMap.has(normalizeHn(p.hn)),
      existingPatientId: existingHnMap.get(normalizeHn(p.hn)) ?? null,
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

  /** Backfill resolvedAipnCode on existing VisitMedication records using VisitBillingItem.sksDrugCode */
  async backfillAipnCodes(): Promise<{
    processed: number;
    updatedAipn: number;
    updatedDrug: number;
  }> {
    // Find medications without resolvedAipnCode that have billing items with sksDrugCode
    const medications = await this.prisma.visitMedication.findMany({
      where: { resolvedAipnCode: null },
      select: { id: true, visitId: true, hospitalCode: true, resolvedDrugId: true, medicationName: true },
    });

    let updatedAipn = 0;
    let updatedDrug = 0;

    for (const med of medications) {
      // Find matching billing item by visitId + hospitalCode
      const billingItem = med.hospitalCode
        ? await this.prisma.visitBillingItem.findFirst({
            where: {
              visitId: med.visitId,
              hospitalCode: med.hospitalCode,
              billingGroup: '3',
              sksDrugCode: { not: null },
            },
            select: { sksDrugCode: true },
          })
        : null;

      if (!billingItem?.sksDrugCode) continue;

      let aipnCode = await this.importService.resolveAipnCode(billingItem.sksDrugCode);

      // Tier 0.5 fallback: text-based resolution from dfsText
      if (!aipnCode) {
        const billItemText = await this.prisma.visitBillingItem.findFirst({
          where: {
            visitId: med.visitId,
            hospitalCode: med.hospitalCode || undefined,
            billingGroup: '3',
          },
          select: { sksDfsText: true, dfsText: true },
        });
        const textDfs = billItemText?.sksDfsText || billItemText?.dfsText || null;
        aipnCode = await this.importService.resolveAipnByText(textDfs);
      }

      if (!aipnCode) continue;

      const updateData: { resolvedAipnCode: number; resolvedDrugId?: number } = {
        resolvedAipnCode: aipnCode,
      };
      updatedAipn++;

      // Also try to resolve drugId if missing
      if (!med.resolvedDrugId) {
        const drugId = await this.importService.resolveDrugByAipnCode(aipnCode);
        if (drugId) {
          updateData.resolvedDrugId = drugId;
          updatedDrug++;
        }
      }

      await this.prisma.visitMedication.update({
        where: { id: med.id },
        data: updateData,
      });
    }

    this.logger.log(`Backfill complete: ${medications.length} processed, ${updatedAipn} AIPN codes set, ${updatedDrug} drugs resolved`);

    return { processed: medications.length, updatedAipn, updatedDrug };
  }

  /** Purge all visit data (XLSX + HIS imports) — keeps Patients and PatientCases intact */
  async purgeAllVisits(): Promise<{
    deletedVisits: number;
    deletedImports: number;
    deletedBatches: number;
  }> {
    const [visitCount, importCount, batchCount] = await Promise.all([
      this.prisma.patientVisit.count(),
      this.prisma.patientImport.count(),
      this.prisma.billingExportBatch.count(),
    ]);

    if (visitCount === 0 && importCount === 0 && batchCount === 0) {
      return { deletedVisits: 0, deletedImports: 0, deletedBatches: 0 };
    }

    await this.prisma.$transaction(async (tx) => {
      // Unlink visits from patient cases (SetNull — PatientVisit.caseId)
      await tx.patientVisit.updateMany({
        where: { caseId: { not: null } },
        data: { caseId: null },
      });

      // Delete all visits — cascades: VisitMedication, VisitBillingItem, VisitBillingClaim, AiSuggestion
      await tx.patientVisit.deleteMany({});

      // Delete import records
      await tx.patientImport.deleteMany({});

      // Delete stale export batches (visitIds become invalid)
      await tx.billingExportBatch.deleteMany({});
    });

    this.logger.warn(
      `Purged all visits: ${visitCount} visits, ${importCount} imports, ${batchCount} batches deleted`,
    );

    return {
      deletedVisits: visitCount,
      deletedImports: importCount,
      deletedBatches: batchCount,
    };
  }

  // ─── IPD (Inpatient) Import ───────────────────────────────────────────────

  /** Preview IPD import — fetch admissions from HIS and compute what will be imported */
  async previewAdmissions(
    hn: string,
    from?: string,
    to?: string,
  ): Promise<{
    patient: HisPatientSearchResult;
    existingPatientId: number | null;
    totalAdmissions: number;
    cancerRelatedAdmissions: number;
    alreadyImportedAns: string[];
    newAdmissionsToImport: number;
  }> {
    const hisData = await this.hisClient.fetchPatientWithAdmissions(hn, 'hn', from, to);

    const existingPatient = await this.prisma.patient.findFirst({
      where: {
        OR: [
          { hn: normalizeHn(hisData.patient.hn) },
          { hn: hisData.patient.hn },
          ...(hisData.patient.citizenId ? [{ citizenId: hisData.patient.citizenId }] : []),
        ],
      },
      select: { id: true },
    });

    const cancerAdmissions = hisData.admissions.filter(isCancerRelatedAdmission);

    // Check already-imported ANs
    const allAns = cancerAdmissions.map((a) => a.an);
    const existingAdmissions = allAns.length > 0
      ? await this.prisma.patientVisit.findMany({
          where: { an: { in: allAns } },
          select: { an: true },
        })
      : [];
    const existingAnSet = new Set(existingAdmissions.map((v) => v.an).filter((a): a is string => !!a));
    const newAdmissions = cancerAdmissions.filter((a) => !existingAnSet.has(a.an));

    return {
      patient: hisData.patient,
      existingPatientId: existingPatient?.id ?? null,
      totalAdmissions: hisData.admissions.length,
      cancerRelatedAdmissions: cancerAdmissions.length,
      alreadyImportedAns: [...existingAnSet],
      newAdmissionsToImport: newAdmissions.length,
    };
  }

  /** Import IPD admissions from HIS into database */
  async importAdmissions(
    hn: string,
    userId: number | null,
    from?: string,
    to?: string,
  ): Promise<ImportResult> {
    const hisData = await this.hisClient.fetchPatientWithAdmissions(hn, 'hn', from, to);

    // 1. Filter cancer-related admissions
    const cancerAdmissions = hisData.admissions.filter(isCancerRelatedAdmission);
    const skippedNonCancer = hisData.admissions.length - cancerAdmissions.length;

    // 2. Find already-imported ANs
    const allAns = cancerAdmissions.map((a) => a.an);
    const existingAdmissions = allAns.length > 0
      ? await this.prisma.patientVisit.findMany({
          where: { an: { in: allAns } },
          select: { an: true },
        })
      : [];
    const existingAnSet = new Set(existingAdmissions.map((v) => v.an).filter((a): a is string => !!a));
    const newAdmissions = cancerAdmissions.filter((a) => !existingAnSet.has(a.an));
    const skippedDuplicate = cancerAdmissions.length - newAdmissions.length;

    if (newAdmissions.length === 0) {
      throw new BadRequestException(
        skippedDuplicate > 0
          ? `มี ${skippedDuplicate} admission ที่นำเข้าแล้ว ไม่มี admission ใหม่`
          : 'ไม่พบ admission ที่เกี่ยวข้องกับมะเร็งใน HIS',
      );
    }

    // 3. Import within transaction
    const result = await this.prisma.$transaction(
      async (tx) => {
        const patientId = await this.upsertPatient(tx, hisData.patient);

        const importRecord = await tx.patientImport.create({
          data: {
            filename: `HIS_API_IPD_${normalizeHn(hn)}_${new Date().toISOString().slice(0, 10)}`,
            totalRows: hisData.admissions.length,
            importedRows: 0,
            skippedRows: 0,
            source: 'HIS_API_IPD',
            ...(userId ? { importedById: userId } : {}),
            status: 'PROCESSING',
          },
        });

        let importedCount = 0;
        const errors: string[] = [];

        for (const admission of newAdmissions) {
          try {
            await this.importAdmission(tx, admission, importRecord.id, patientId, hn);
            importedCount++;
          } catch (err: any) {
            this.logger.error(`Failed to import admission AN=${admission.an}: ${err.message}`);
            errors.push(`AN ${admission.an}: ${err.message}`);
          }
        }

        await tx.patientImport.update({
          where: { id: importRecord.id },
          data: {
            importedRows: importedCount,
            skippedRows: skippedNonCancer + skippedDuplicate + (newAdmissions.length - importedCount),
            status: 'COMPLETED',
            ...(errors.length > 0 ? { errorLog: JSON.stringify(errors) } : {}),
          },
        });

        return { patientId, importId: importRecord.id, importedCount };
      },
      { timeout: 60_000 },
    );

    // Count total linked visits for patient
    const linkedVisitCount = await this.prisma.patientVisit.count({
      where: { patientId: result.patientId },
    });

    return {
      patientId: result.patientId,
      importId: result.importId,
      totalVisitsFromHis: hisData.admissions.length,
      cancerRelatedVisits: cancerAdmissions.length,
      importedVisits: result.importedCount,
      skippedDuplicate,
      skippedNonCancer,
      linkedVisitCount,
    };
  }

  /**
   * Import a single IPD admission → 1 PatientVisit record (Option A: per-admission matching).
   * Flattens diagnoses + procedures + billing items into a PatientVisit-compatible shape.
   */
  private async importAdmission(
    tx: TxClient,
    admission: HisAdmission,
    importId: number,
    patientId: number,
    hn: string,
  ): Promise<void> {
    // Use the HN from the admission record itself (authoritative), not the input query parameter
    const normalizedHn = normalizeHn(admission.hn);

    // Guard against synthetic VN exceeding VarChar(30): "IPD-" (4) + AN must fit
    if (admission.an.length > 26) {
      throw new Error(
        `Admission AN=${admission.an} exceeds 26 chars — synthetic VN would overflow VarChar(30)`,
      );
    }

    // 1. Extract primary + secondary diagnoses from structured array
    const { primaryDiagnosis: rawPrimary, secondaryDiagnoses: rawSecondary } =
      extractDiagnosesFromArray(admission.diagnoses);

    const primaryDx = sanitizeIcd10(rawPrimary).replace(/\./g, '').toUpperCase();
    if (!primaryDx) {
      throw new Error(`Admission AN=${admission.an} has no valid primary diagnosis`);
    }

    // 2. Append procedure-derived modality codes to secondary diagnoses
    //    9925 → Z5111 (chemo), 9224 → 9224 (radiation) — recognized by inferStage()
    const procedureCodes = proceduresToSecondaryDiagCodes(admission.procedures || []);
    const secondaryCodes = rawSecondary
      ? rawSecondary.split(',').map((c) => sanitizeIcd10(c.trim()).replace(/\./g, '').toUpperCase()).filter(Boolean)
      : [];
    // Append procedure codes only if not already present in diagnosis codes
    for (const pc of procedureCodes) {
      if (!secondaryCodes.includes(pc)) {
        secondaryCodes.push(pc);
      }
    }
    const secondaryDx = secondaryCodes.length > 0 ? secondaryCodes.join(',') : null;

    // 3. Resolve ICD-10 → CancerSite
    const resolvedSiteId = await this.importService.resolveIcd10(primaryDx);

    // 4. Build medicationsRaw from drug billing items (IPD has no separate medications array)
    const allBillingItems = admission.billingItems ?? [];
    const drugBillingItems = allBillingItems.filter(
      (b) => (b.billingGroup === '3' || b.billingGroup === '03') && b.sksDrugCode,
    );
    let medicationsRaw: string | null = null;
    if (drugBillingItems.length > 0) {
      medicationsRaw = drugBillingItems
        .map((b) => `${b.hospitalCode || ''} - ${b.dfsText || b.sksDfsText || b.description}`.trim())
        .join('\n');
    }

    // 5. Create PatientVisit record — synthetic VN to avoid collision with OPD
    const createdVisit = await tx.patientVisit.create({
      data: {
        importId,
        hn: normalizedHn,
        vn: `IPD-${admission.an}`,
        an: admission.an,
        visitType: '2',
        visitDate: new Date(admission.admitDate),
        dischargeDate: admission.dischargeDate ? new Date(admission.dischargeDate) : null,
        dischargeType: admission.dischargeType || null,
        primaryDiagnosis: primaryDx,
        secondaryDiagnoses: secondaryDx,
        medicationsRaw,
        physicianLicenseNo: admission.attendingDoctorLicense || null,
        resolvedSiteId,
        patientId,
        // CIPN admission fields
        admitTime: admission.admitTime || null,
        dischargeTime: admission.dischargeTime || null,
        admissionType: admission.admissionType || null,
        admissionSource: admission.admissionSource || null,
        dischargeStatus: admission.dischargeStatus || null,
        ward: admission.ward || null,
        department: admission.department || null,
        lengthOfStay: admission.lengthOfStay ?? null,
        leaveDay: admission.leaveDay ?? 0,
        birthWeight: admission.birthWeight ?? null,
        drg: admission.drg || null,
        drgVersion: admission.drgVersion || null,
        rw: admission.rw ?? null,
        adjRw: admission.adjRw ?? null,
        authCode: admission.authCode || null,
        authDate: admission.authDate ? new Date(admission.authDate) : null,
      },
    });

    // 6. Create VisitBillingItem records (reuse OPD method)
    await this.createVisitBillingItems(tx, createdVisit.id, allBillingItems);

    // 7. Create VisitMedication from drug billing items (IPD uses billing items, not medications array)
    if (drugBillingItems.length > 0) {
      await this.createMedicationsFromBillingItems(tx, createdVisit.id, drugBillingItems);
    }

    // 8. Create structured VisitDiagnosis records (for CIPN IPDx)
    if (admission.diagnoses?.length > 0) {
      await this.createVisitDiagnoses(tx, createdVisit.id, admission.diagnoses);
    }

    // 9. Create structured VisitProcedure records (for CIPN IPOp)
    if (admission.procedures?.length > 0) {
      await this.createVisitProcedures(tx, createdVisit.id, admission.procedures);
    }
  }

  /** Health check for HIS API connectivity */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return this.hisClient.healthCheck();
  }
}
