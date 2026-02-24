import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../prisma';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CreateBillingClaimDto } from './dto/create-billing-claim.dto';
import { UpdateBillingClaimDto } from './dto/update-billing-claim.dto';

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
      isActive,
    } = query;

    const where: Prisma.PatientWhereInput = {};

    if (search) {
      where.OR = [
        { hn: { contains: search, mode: 'insensitive' } },
        { citizenId: { contains: search } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (cancerSiteId) {
      where.cases = {
        some: { protocol: { cancerSiteId } },
      };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
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

    // Count visits by HN (natural key) instead of patientId FK
    const hns = patients.map((p) => p.hn);
    const visitCounts = hns.length
      ? await this.prisma.patientVisit.groupBy({
          by: ['hn'],
          where: { hn: { in: hns } },
          _count: true,
        })
      : [];
    const hnVisitMap = new Map(visitCounts.map((vc) => [vc.hn, vc._count]));

    const data = patients.map((p) => ({
      ...p,
      _count: { ...p._count, visits: hnVisitMap.get(p.hn) ?? 0 },
    }));

    return { data, total, page, limit };
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
    const data: Prisma.PatientCaseUpdateInput = { ...dto };
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
