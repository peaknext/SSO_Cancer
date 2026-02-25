import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { ExportPatientsDto } from './dto/export-patients.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CreateBillingClaimDto } from './dto/create-billing-claim.dto';
import { UpdateBillingClaimDto } from './dto/update-billing-claim.dto';

interface ExportRow {
  citizenId: string;
  hn: string;
  fullName: string;
  caseNumber: string | null;
  referralDate: Date | null;
  admissionDate: Date | null;
  sourceHospitalName: string | null;
  protocolName: string | null;
}

function formatThaiDate(d: Date | null): string {
  if (!d) return '';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

@Injectable()
export class CancerPatientsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Patient CRUD ──────────────────────────────────────────────────────────

  async findAll(query: QueryPatientsDto) {
    const {
      page = 1,
      limit = 25,
      sortBy = 'hn',
      sortOrder = 'asc',
      search,
      cancerSiteId,
      sourceHospitalId,
      isActive,
      drugName,
    } = query;

    const where: Prisma.PatientWhereInput = {};

    if (search) {
      where.OR = [
        { hn: { contains: search, mode: 'insensitive' } },
        { citizenId: { contains: search } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build combined case filter (cancerSite + sourceHospital)
    const caseFilter: Prisma.PatientCaseWhereInput = {};
    if (cancerSiteId) caseFilter.protocol = { cancerSiteId };
    if (sourceHospitalId) caseFilter.sourceHospitalId = sourceHospitalId;
    if (Object.keys(caseFilter).length > 0) {
      where.cases = { some: caseFilter };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Filter by drug name: find HNs that have visits with matching resolved drug
    if (drugName) {
      const pattern = `%${drugName}%`;
      const rows = await this.prisma.$queryRaw<{ hn: string }[]>`
        SELECT DISTINCT pv.hn
        FROM patient_visits pv
        JOIN visit_medications vm ON vm.visit_id = pv.id
        JOIN drugs d ON d.id = vm.resolved_drug_id
        WHERE d.generic_name ILIKE ${pattern}
          AND d.is_active = true
      `;
      if (rows.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      where.hn = { in: rows.map((r) => r.hn) };
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        include: {
          cases: {
            where: { status: 'ACTIVE', isActive: true },
            include: {
              protocol: {
                select: {
                  id: true,
                  protocolCode: true,
                  nameThai: true,
                  nameEnglish: true,
                  cancerSite: {
                    select: {
                      id: true,
                      siteCode: true,
                      nameThai: true,
                    },
                  },
                },
              },
            },
            orderBy: { openedAt: 'desc' },
          },
          _count: { select: { cases: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.patient.count({ where }),
    ]);

    // Aggregate visit stats by HN (natural key)
    const hns = patients.map((p) => p.hn);

    const [visitCounts, z51Counts, billingStatusRows] = hns.length
      ? await Promise.all([
          // 1. Total visit counts per HN
          this.prisma.patientVisit.groupBy({
            by: ['hn'],
            where: { hn: { in: hns } },
            _count: true,
          }),
          // 2. Z51x visit counts per HN (chemo/immunotherapy encounters)
          this.prisma.patientVisit.groupBy({
            by: ['hn'],
            where: {
              hn: { in: hns },
              secondaryDiagnoses: { contains: 'Z51', mode: 'insensitive' },
            },
            _count: true,
          }),
          // 3. Billing status counts — latest claim per visit
          this.prisma.$queryRawUnsafe<
            { hn: string; status: string; count: number }[]
          >(
            `WITH latest_claims AS (
              SELECT DISTINCT ON (vbc.visit_id)
                pv.hn, vbc.status
              FROM visit_billing_claims vbc
              JOIN patient_visits pv ON pv.id = vbc.visit_id
              WHERE vbc.is_active = true AND pv.hn = ANY($1)
              ORDER BY vbc.visit_id, vbc.round_number DESC
            )
            SELECT hn, status, COUNT(*)::int AS count
            FROM latest_claims
            GROUP BY hn, status`,
            hns,
          ),
        ])
      : [[], [], []];

    const hnVisitMap = new Map(visitCounts.map((vc) => [vc.hn, vc._count]));
    const hnZ51Map = new Map(z51Counts.map((vc) => [vc.hn, vc._count]));

    // Build billing status map: HN → { PENDING, APPROVED, REJECTED }
    const billingMap = new Map<string, Record<string, number>>();
    for (const row of billingStatusRows) {
      if (!billingMap.has(row.hn)) billingMap.set(row.hn, {});
      billingMap.get(row.hn)![row.status] = row.count;
    }

    const data = patients.map((p) => {
      const bc = billingMap.get(p.hn);
      return {
        ...p,
        _count: {
          ...p._count,
          visits: hnVisitMap.get(p.hn) ?? 0,
          z51Visits: hnZ51Map.get(p.hn) ?? 0,
        },
        _billingCounts: {
          pending: bc?.PENDING ?? 0,
          approved: bc?.APPROVED ?? 0,
          rejected: bc?.REJECTED ?? 0,
        },
      };
    });

    return { data, total, page, limit };
  }

  async findCaseHospitals() {
    const rows = await this.prisma.patientCase.findMany({
      where: { sourceHospitalId: { not: null }, isActive: true },
      select: { sourceHospitalId: true },
      distinct: ['sourceHospitalId'],
    });
    const ids = rows.map((r) => r.sourceHospitalId!);
    if (ids.length === 0) return [];
    return this.prisma.hospital.findMany({
      where: { id: { in: ids } },
      select: { id: true, hcode5: true, nameThai: true, province: true },
      orderBy: { nameThai: 'asc' },
    });
  }

  // ─── Export Excel ───────────────────────────────────────────────────────────

  private static readonly EXPORT_FIELD_MAP: Record<
    string,
    { header: string; value: (p: ExportRow) => string }
  > = {
    citizenId: {
      header: 'เลขบัตรประชาชน',
      value: (p) => p.citizenId,
    },
    hn: {
      header: 'HN',
      value: (p) => p.hn,
    },
    caseNumber: {
      header: 'เลขที่เคส',
      value: (p) => p.caseNumber ?? '',
    },
    fullName: {
      header: 'ชื่อ-สกุล',
      value: (p) => p.fullName,
    },
    referralDate: {
      header: 'วันที่ลงทะเบียนส่งต่อ',
      value: (p) => formatThaiDate(p.referralDate),
    },
    admissionDate: {
      header: 'วันที่ลงทะเบียนรับเข้า',
      value: (p) => formatThaiDate(p.admissionDate),
    },
    sourceHospital: {
      header: 'รพ.ต้นทาง',
      value: (p) => p.sourceHospitalName ?? '',
    },
    protocol: {
      header: 'โปรโตคอล',
      value: (p) => p.protocolName ?? '',
    },
  };

  async exportExcel(query: ExportPatientsDto): Promise<Buffer> {
    const { search, cancerSiteId, sourceHospitalId, fields } = query;

    // Parse requested fields (default: all)
    const allKeys = Object.keys(CancerPatientsService.EXPORT_FIELD_MAP);
    const requestedFields = fields
      ? fields.split(',').filter((f) => allKeys.includes(f.trim()))
      : allKeys;
    if (requestedFields.length === 0) {
      requestedFields.push(...allKeys);
    }

    // Build WHERE (same logic as findAll)
    const where: Prisma.PatientWhereInput = {};
    if (search) {
      where.OR = [
        { hn: { contains: search, mode: 'insensitive' } },
        { citizenId: { contains: search } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const caseFilter: Prisma.PatientCaseWhereInput = {};
    if (cancerSiteId) caseFilter.protocol = { cancerSiteId };
    if (sourceHospitalId) caseFilter.sourceHospitalId = sourceHospitalId;
    if (Object.keys(caseFilter).length > 0) {
      where.cases = { some: caseFilter };
    }

    const patients = await this.prisma.patient.findMany({
      where,
      include: {
        cases: {
          where: { status: 'ACTIVE', isActive: true },
          include: {
            protocol: { select: { nameThai: true } },
            sourceHospital: { select: { nameThai: true } },
          },
          orderBy: { openedAt: 'desc' },
        },
      },
      orderBy: { hn: 'asc' },
      take: 5000,
    });

    // Map to flat export rows
    const fieldMap = CancerPatientsService.EXPORT_FIELD_MAP;
    const rows = patients.map((p, idx) => {
      const activeCase = p.cases[0] ?? null;
      const exportRow: ExportRow = {
        citizenId: p.citizenId,
        hn: p.hn,
        fullName: p.fullName,
        caseNumber: activeCase?.caseNumber ?? null,
        referralDate: activeCase?.referralDate ?? null,
        admissionDate: activeCase?.admissionDate ?? null,
        sourceHospitalName: activeCase?.sourceHospital?.nameThai ?? null,
        protocolName: activeCase?.protocol?.nameThai ?? null,
      };

      const row: Record<string, string | number> = { 'ลำดับที่': idx + 1 };
      for (const key of requestedFields) {
        const def = fieldMap[key];
        if (def) row[def.header] = def.value(exportRow);
      }
      return row;
    });

    // Build Excel workbook
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patients');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  async findById(id: number) {
    // Fetch patient with cases (visits queried separately by HN)
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        cases: {
          where: { isActive: true },
          include: {
            protocol: {
              select: {
                id: true,
                protocolCode: true,
                nameThai: true,
                nameEnglish: true,
                cancerSite: {
                  select: {
                    id: true,
                    siteCode: true,
                    nameThai: true,
                    nameEnglish: true,
                  },
                },
              },
            },
            sourceHospital: {
              select: {
                id: true,
                hcode5: true,
                hcode9: true,
                nameThai: true,
                province: true,
              },
            },
            _count: { select: { visits: true } },
          },
          orderBy: { openedAt: 'desc' },
        },
      },
    });

    if (!patient) return null;

    // Re-link any visits whose patientId is null or stale
    await this.prisma.patientVisit.updateMany({
      where: {
        hn: patient.hn,
        OR: [{ patientId: null }, { patientId: { not: patient.id } }],
      },
      data: { patientId: patient.id },
    });

    // Query visits by HN (natural key) — not by patientId FK
    const [visits, visitCount] = await Promise.all([
      this.prisma.patientVisit.findMany({
        where: { hn: patient.hn },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              status: true,
              protocol: {
                select: {
                  id: true,
                  protocolCode: true,
                  nameThai: true,
                },
              },
            },
          },
          confirmedProtocol: {
            select: {
              id: true,
              protocolCode: true,
              nameThai: true,
              nameEnglish: true,
            },
          },
          confirmedRegimen: {
            select: {
              id: true,
              regimenCode: true,
              regimenName: true,
            },
          },
          resolvedSite: {
            select: { id: true, siteCode: true, nameThai: true },
          },
          billingClaims: {
            where: { isActive: true },
            orderBy: { roundNumber: 'asc' },
          },
        },
        orderBy: { visitDate: 'desc' },
      }),
      this.prisma.patientVisit.count({ where: { hn: patient.hn } }),
    ]);

    return {
      ...patient,
      visits,
      _count: { visits: visitCount, cases: patient.cases.length },
    };
  }

  async create(dto: CreatePatientDto) {
    // Check HN uniqueness
    const existingHn = await this.prisma.patient.findUnique({
      where: { hn: dto.hn },
    });
    if (existingHn) {
      throw new ConflictException(
        'HN นี้มีในระบบแล้ว — This HN already exists',
      );
    }

    // Check citizenId uniqueness
    const existingCid = await this.prisma.patient.findUnique({
      where: { citizenId: dto.citizenId },
    });
    if (existingCid) {
      throw new ConflictException(
        'เลขบัตรประชาชนนี้มีในระบบแล้ว — This Citizen ID already exists',
      );
    }

    const patient = await this.prisma.patient.create({ data: dto });

    // Auto-link existing visits by HN
    const linked = await this.prisma.patientVisit.updateMany({
      where: { hn: dto.hn, patientId: null },
      data: { patientId: patient.id },
    });

    return { ...patient, linkedVisitCount: linked.count };
  }

  async update(id: number, dto: UpdatePatientDto) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      throw new NotFoundException(
        'ไม่พบผู้ป่วย — Patient not found',
      );
    }

    // Check uniqueness if changing HN or citizenId
    if (dto.hn && dto.hn !== patient.hn) {
      const existing = await this.prisma.patient.findUnique({
        where: { hn: dto.hn },
      });
      if (existing) {
        throw new ConflictException('HN นี้มีในระบบแล้ว — This HN already exists');
      }
    }

    if (dto.citizenId && dto.citizenId !== patient.citizenId) {
      const existing = await this.prisma.patient.findUnique({
        where: { citizenId: dto.citizenId },
      });
      if (existing) {
        throw new ConflictException(
          'เลขบัตรประชาชนนี้มีในระบบแล้ว — This Citizen ID already exists',
        );
      }
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data: dto,
    });

    // Re-link visits if HN changed
    if (dto.hn && dto.hn !== patient.hn) {
      await this.prisma.patientVisit.updateMany({
        where: { hn: dto.hn, patientId: null },
        data: { patientId: id },
      });
    }

    return updated;
  }

  async deactivate(id: number) {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      throw new NotFoundException('ไม่พบผู้ป่วย — Patient not found');
    }
    return this.prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Case Management ──────────────────────────────────────────────────────

  async createCase(patientId: number, dto: CreateCaseDto, userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException('ไม่พบผู้ป่วย — Patient not found');
    }

    // Check case number uniqueness
    const existingCase = await this.prisma.patientCase.findUnique({
      where: { caseNumber: dto.caseNumber },
    });
    if (existingCase) {
      throw new ConflictException(
        'เลขที่เคสซ้ำ — Case number already exists',
      );
    }

    // Validate protocol if provided
    if (dto.protocolId) {
      const protocol = await this.prisma.protocolName.findUnique({
        where: { id: dto.protocolId },
      });
      if (!protocol || !protocol.isActive) {
        throw new BadRequestException(
          'โปรโตคอลไม่ถูกต้อง — Invalid protocol',
        );
      }
    }

    return this.prisma.patientCase.create({
      data: {
        caseNumber: dto.caseNumber,
        patientId,
        protocolId: dto.protocolId ?? null,
        notes: dto.notes ?? null,
        referralDate: dto.referralDate ? new Date(dto.referralDate) : null,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
        sourceHospitalId: dto.sourceHospitalId ?? null,
        createdByUserId: userId,
      },
      include: {
        protocol: {
          select: {
            id: true,
            protocolCode: true,
            nameThai: true,
            nameEnglish: true,
          },
        },
        sourceHospital: {
          select: {
            id: true,
            hcode5: true,
            hcode9: true,
            nameThai: true,
            province: true,
          },
        },
      },
    });
  }

  async updateCase(patientId: number, caseId: number, dto: UpdateCaseDto) {
    const patientCase = await this.prisma.patientCase.findFirst({
      where: { id: caseId, patientId },
    });
    if (!patientCase) {
      throw new NotFoundException('ไม่พบเคส — Case not found');
    }

    // Check case number uniqueness if changing
    if (dto.caseNumber && dto.caseNumber !== patientCase.caseNumber) {
      const existing = await this.prisma.patientCase.findUnique({
        where: { caseNumber: dto.caseNumber },
      });
      if (existing) {
        throw new ConflictException('เลขที่เคสซ้ำ — Case number already exists');
      }
    }

    // Validate protocol if changing
    if (dto.protocolId) {
      const protocol = await this.prisma.protocolName.findUnique({
        where: { id: dto.protocolId },
      });
      if (!protocol || !protocol.isActive) {
        throw new BadRequestException(
          'โปรโตคอลไม่ถูกต้อง — Invalid protocol',
        );
      }
    }

    // Auto-set closedAt when completing
    const { referralDate, admissionDate, sourceHospitalId, ...rest } = dto;
    const data: Prisma.PatientCaseUncheckedUpdateInput = { ...rest };
    if (referralDate !== undefined) {
      data.referralDate = referralDate ? new Date(referralDate) : null;
    }
    if (admissionDate !== undefined) {
      data.admissionDate = admissionDate ? new Date(admissionDate) : null;
    }
    if (sourceHospitalId !== undefined) {
      data.sourceHospitalId = sourceHospitalId;
    }
    if (dto.status === 'COMPLETED' && !patientCase.closedAt) {
      data.closedAt = new Date();
    }

    return this.prisma.patientCase.update({
      where: { id: caseId },
      data,
      include: {
        protocol: {
          select: {
            id: true,
            protocolCode: true,
            nameThai: true,
            nameEnglish: true,
          },
        },
        sourceHospital: {
          select: {
            id: true,
            hcode5: true,
            hcode9: true,
            nameThai: true,
            province: true,
          },
        },
        _count: { select: { visits: true } },
      },
    });
  }

  // ─── Visit-Case Assignment ─────────────────────────────────────────────────

  async assignVisitToCase(vn: string, caseId: number) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { vn } });
    if (!visit) {
      throw new NotFoundException('ไม่พบ visit — Visit not found');
    }

    const patientCase = await this.prisma.patientCase.findUnique({
      where: { id: caseId },
    });
    if (!patientCase) {
      throw new NotFoundException('ไม่พบเคส — Case not found');
    }

    // Verify visit belongs to same patient as case
    if (visit.patientId && visit.patientId !== patientCase.patientId) {
      throw new BadRequestException(
        'Visit ไม่ได้อยู่ในผู้ป่วยเดียวกับเคส — Visit does not belong to this patient',
      );
    }

    return this.prisma.patientVisit.update({
      where: { vn },
      data: {
        caseId,
        patientId: patientCase.patientId,
      },
      include: {
        case: {
          select: { id: true, caseNumber: true, status: true },
        },
      },
    });
  }

  async removeVisitFromCase(vn: string) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { vn } });
    if (!visit) {
      throw new NotFoundException('ไม่พบ visit — Visit not found');
    }

    return this.prisma.patientVisit.update({
      where: { vn },
      data: { caseId: null },
    });
  }

  // ─── Billing Claims ───────────────────────────────────────────────────────

  async createBillingClaim(
    vn: string,
    dto: CreateBillingClaimDto,
    userId: number,
  ) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { vn } });
    if (!visit) {
      throw new NotFoundException('ไม่พบ visit — Visit not found');
    }

    // Check unique [visitId, roundNumber]
    const existing = await this.prisma.visitBillingClaim.findUnique({
      where: {
        visitId_roundNumber: {
          visitId: visit.id,
          roundNumber: dto.roundNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `เรียกเก็บครั้งที่ ${dto.roundNumber} มีอยู่แล้ว — Round ${dto.roundNumber} already exists`,
      );
    }

    return this.prisma.visitBillingClaim.create({
      data: {
        visitId: visit.id,
        roundNumber: dto.roundNumber,
        status: dto.status ?? 'PENDING',
        rejectionReason: dto.rejectionReason ?? null,
        submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : null,
        decidedAt: dto.decidedAt ? new Date(dto.decidedAt) : null,
        notes: dto.notes ?? null,
        createdByUserId: userId,
      },
    });
  }

  async updateBillingClaim(claimId: number, dto: UpdateBillingClaimDto) {
    const claim = await this.prisma.visitBillingClaim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException(
        'ไม่พบข้อมูลเรียกเก็บ — Billing claim not found',
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.roundNumber !== undefined) data.roundNumber = dto.roundNumber;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.rejectionReason !== undefined)
      data.rejectionReason = dto.rejectionReason;
    if (dto.submittedAt !== undefined)
      data.submittedAt = dto.submittedAt ? new Date(dto.submittedAt) : null;
    if (dto.decidedAt !== undefined)
      data.decidedAt = dto.decidedAt ? new Date(dto.decidedAt) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.visitBillingClaim.update({
      where: { id: claimId },
      data,
    });
  }

  async deleteBillingClaim(claimId: number) {
    const claim = await this.prisma.visitBillingClaim.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      throw new NotFoundException(
        'ไม่พบข้อมูลเรียกเก็บ — Billing claim not found',
      );
    }

    return this.prisma.visitBillingClaim.delete({
      where: { id: claimId },
    });
  }
}
