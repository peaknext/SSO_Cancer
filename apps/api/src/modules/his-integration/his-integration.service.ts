import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService, Prisma } from '../../prisma';
import { ImportService } from '../protocol-analysis/services/import.service';
import { HisApiClient } from './his-api.client';
import {
  HisPatientSearchResult,
  HisPatientData,
  HisVisit,
  isCancerRelatedIcd10,
} from './types/his-api.types';
import { AdvancedSearchDto } from './dto/advanced-search.dto';

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
    if (!type) {
      const trimmed = query.trim();
      if (/^\d{13}$/.test(trimmed)) {
        type = 'citizen_id';
      } else if (/^\d+$/.test(trimmed)) {
        type = 'hn';
      } else {
        type = 'name';
      }
    }

    return this.hisClient.searchPatient(query, type);
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

    const data = {
      hn: p.hn,
      citizenId: p.citizenId,
      fullName: p.fullName,
      titleName: p.titleName || null,
      gender: p.gender || null,
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
      address: p.address || null,
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
    // Resolve ICD-10 → CancerSite (read-only lookup, OK outside tx)
    const resolvedSiteId = await this.importService.resolveIcd10(visit.primaryDiagnosis);

    // Normalize diagnosis codes
    const primaryDx = visit.primaryDiagnosis.replace(/\./g, '').toUpperCase();
    const secondaryDx = visit.secondaryDiagnoses
      ? visit.secondaryDiagnoses.replace(/\./g, '').toUpperCase()
      : null;

    // Build medicationsRaw from structured array (for protocol matching compatibility)
    const medicationsRaw = visit.medications.length > 0
      ? visit.medications
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
        hpi: visit.hpi || null,
        doctorNotes: visit.doctorNotes || null,
        medicationsRaw,
        serviceStartTime: visit.serviceStartTime ? new Date(visit.serviceStartTime) : null,
        serviceEndTime: visit.serviceEndTime ? new Date(visit.serviceEndTime) : null,
        physicianLicenseNo: visit.physicianLicenseNo || null,
        clinicCode: visit.clinicCode || null,
        resolvedSiteId,
        patientId,
      },
    });

    // Create VisitMedication records (for protocol analysis)
    for (const med of visit.medications) {
      // resolveDrug is a read-only lookup, OK outside tx
      const resolvedDrugId = med.medicationName
        ? await this.importService.resolveDrug(med.medicationName)
        : null;

      await tx.visitMedication.create({
        data: {
          visitId: createdVisit.id,
          rawLine: `${med.hospitalCode || ''} - ${med.medicationName}`.trim(),
          hospitalCode: med.hospitalCode || null,
          medicationName: med.medicationName || null,
          quantity: med.quantity || null,
          unit: med.unit || null,
          resolvedDrugId,
        },
      });
    }

    // Create VisitBillingItem records (for SSOP export)
    for (const item of visit.billingItems) {
      await tx.visitBillingItem.create({
        data: {
          visitId: createdVisit.id,
          hospitalCode: item.hospitalCode,
          aipnCode: item.aipnCode ? String(item.aipnCode) : null,
          billingGroup: item.billingGroup,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          claimUnitPrice: item.claimUnitPrice ?? item.unitPrice,
          claimCategory: item.claimCategory || 'OP1',
        },
      });
    }
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
