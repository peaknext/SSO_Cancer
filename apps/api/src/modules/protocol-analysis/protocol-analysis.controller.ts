import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { ImportService } from './services/import.service';
import { MatchingService } from './services/matching.service';
import { SsoProtocolDrugsService } from '../sso-protocol-drugs/sso-protocol-drugs.service';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { QueryVisitsDto } from './dto/query-visits.dto';
import { QueryImportsDto } from './dto/query-imports.dto';
import { ConfirmProtocolDto } from './dto/confirm-protocol.dto';
import { BatchTopMatchDto } from './dto/batch-top-match.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../prisma';

@ApiTags('Protocol Analysis')
@ApiBearerAuth()
@Controller('protocol-analysis')
export class ProtocolAnalysisController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importService: ImportService,
    private readonly matchingService: MatchingService,
    private readonly formularyService: SsoProtocolDrugsService,
  ) {}

  // ─── Import ────────────────────────────────────────────────

  @Post('import/preview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload xlsx and preview parsed data (no DB write)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('กรุณาอัปโหลดไฟล์ — Please upload a file');
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      throw new BadRequestException('รองรับเฉพาะไฟล์ .xlsx — Only .xlsx files are supported');
    }

    return this.importService.parseXlsx(file.buffer, file.originalname);
  }

  @Post('import/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Re-parse xlsx and write to database' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async confirmImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาอัปโหลดไฟล์ — Please upload a file');
    }

    const allRows = this.importService.parseAllRows(file.buffer);
    return this.importService.confirmImport(allRows, file.originalname, userId);
  }

  @Get('imports')
  @ApiOperation({ summary: 'List import history' })
  async listImports(@Query() query: QueryImportsDto) {
    const { page = 1, limit = 25, sortBy = 'id', sortOrder = 'desc' } = query;

    const [data, total] = await Promise.all([
      this.prisma.patientImport.findMany({
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          importedBy: { select: { id: true, fullName: true } },
          _count: { select: { visits: true } },
        },
      }),
      this.prisma.patientImport.count(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  @Get('imports/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get import/visit/medication/AI suggestion counts' })
  async getImportStats() {
    const [imports, visits, medications, aiSuggestions] = await Promise.all([
      this.prisma.patientImport.count(),
      this.prisma.patientVisit.count(),
      this.prisma.visitMedication.count(),
      this.prisma.aiSuggestion.count(),
    ]);
    return { imports, visits, medications, aiSuggestions };
  }

  @Delete('imports/all')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete ALL import batches, visits, medications, and AI suggestions' })
  async clearAllVisitData(@CurrentUser('id') userId: number) {
    const [imports, visits, medications, aiSuggestions] = await Promise.all([
      this.prisma.patientImport.count(),
      this.prisma.patientVisit.count(),
      this.prisma.visitMedication.count(),
      this.prisma.aiSuggestion.count(),
    ]);

    if (imports === 0) {
      throw new BadRequestException('ไม่มีข้อมูลให้ลบ — No data to delete');
    }

    await this.prisma.patientImport.deleteMany({});

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'PatientImport',
        entityId: 0,
        metadata: JSON.stringify({
          operation: 'CLEAR_ALL_VISIT_DATA',
          deletedImports: imports,
          deletedVisits: visits,
          deletedMedications: medications,
          deletedAiSuggestions: aiSuggestions,
        }),
      },
    });

    return { deletedImports: imports, deletedVisits: visits, deletedMedications: medications, deletedAiSuggestions: aiSuggestions };
  }

  @Delete('imports/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete import batch and all related visits' })
  async deleteImport(@Param('id', ParseIntPipe) id: number) {
    const imp = await this.prisma.patientImport.findUnique({ where: { id } });
    if (!imp) throw new NotFoundException('IMPORT_NOT_FOUND');

    await this.prisma.patientImport.delete({ where: { id } });
    return { message: 'ลบสำเร็จ — Import deleted' };
  }

  // ─── Browse ────────────────────────────────────────────────

  @Get('patients')
  @ApiOperation({ summary: 'List unique HNs with visit count' })
  async listPatients(@Query() query: QueryPatientsDto) {
    const { page = 1, limit = 25, search, cancerSiteId, hasMedications, hasZ51, visitDateFrom, visitDateTo } = query;

    const where: Prisma.PatientVisitWhereInput = {};
    if (search) {
      where.hn = { contains: search, mode: 'insensitive' };
    }
    if (cancerSiteId) {
      where.resolvedSiteId = cancerSiteId;
    }
    if (hasMedications === true) {
      where.AND = [
        { medicationsRaw: { not: null } },
        { medicationsRaw: { not: 'ไม่มีรายการยา' } },
      ];
    }
    if (hasZ51 === true) {
      where.secondaryDiagnoses = { contains: 'Z51', mode: 'insensitive' };
    }
    if (visitDateFrom || visitDateTo) {
      where.visitDate = {};
      if (visitDateFrom) where.visitDate.gte = new Date(visitDateFrom);
      if (visitDateTo) where.visitDate.lte = new Date(visitDateTo);
    }

    // Group by HN to get unique patients
    const grouped = await this.prisma.patientVisit.groupBy({
      by: ['hn'],
      where,
      _count: { _all: true },
      _max: { visitDate: true },
      orderBy: { hn: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Count total unique HNs
    const totalResult = await this.prisma.patientVisit.groupBy({
      by: ['hn'],
      where,
    });
    const total = totalResult.length;

    const data = grouped.map((g) => ({
      hn: g.hn,
      visitCount: g._count._all,
      lastVisitDate: g._max.visitDate,
    }));

    return createPaginatedResponse(data, total, page, limit);
  }

  @Get('patients/:hn/visits')
  @ApiOperation({ summary: 'List visits for a given HN' })
  async listVisits(
    @Param('hn') hn: string,
    @Query() query: QueryVisitsDto,
  ) {
    const { page = 1, limit = 50, sortOrder = 'desc', cancerSiteId, hasMedications, hasZ51, visitDateFrom, visitDateTo } = query;

    const where: Prisma.PatientVisitWhereInput = { hn };
    if (cancerSiteId) {
      where.resolvedSiteId = cancerSiteId;
    }
    if (hasMedications === true) {
      where.AND = [
        { medicationsRaw: { not: null } },
        { medicationsRaw: { not: 'ไม่มีรายการยา' } },
      ];
    }
    if (hasZ51 === true) {
      where.secondaryDiagnoses = { contains: 'Z51', mode: 'insensitive' };
    }
    if (visitDateFrom || visitDateTo) {
      where.visitDate = {};
      if (visitDateFrom) where.visitDate.gte = new Date(visitDateFrom);
      if (visitDateTo) where.visitDate.lte = new Date(visitDateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.patientVisit.findMany({
        where,
        orderBy: { visitDate: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          vn: true,
          visitDate: true,
          primaryDiagnosis: true,
          resolvedSite: { select: { id: true, nameThai: true, siteCode: true } },
          _count: { select: { medications: true } },
          confirmedProtocolId: true,
          confirmedAt: true,
        },
      }),
      this.prisma.patientVisit.count({ where }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  @Get('visits/:vn')
  @ApiOperation({ summary: 'Get full visit detail with medications' })
  async getVisit(@Param('vn') vn: string) {
    const visit = await this.prisma.patientVisit.findUnique({
      where: { vn },
      include: {
        resolvedSite: { select: { id: true, siteCode: true, nameThai: true, nameEnglish: true } },
        medications: {
          include: {
            resolvedDrug: {
              select: {
                id: true,
                genericName: true,
                drugCategory: true,
                tradeNames: {
                  select: { tradeName: true, drugCode: true },
                  take: 3,
                },
              },
            },
          },
        },
        import: {
          select: { id: true, filename: true, createdAt: true },
        },
        patient: { select: { id: true, fullName: true, titleName: true } },
        case: {
          select: {
            id: true,
            caseNumber: true,
            sourceHospital: { select: { id: true, hcode5: true, nameThai: true } },
          },
        },
        confirmedProtocol: { select: { id: true, protocolCode: true, nameEnglish: true, nameThai: true } },
        confirmedRegimen: { select: { id: true, regimenCode: true, regimenName: true } },
        confirmedByUser: { select: { id: true, fullName: true, fullNameThai: true } },
        visitBillingItems: {
          where: { isActive: true },
          select: { hospitalCode: true, aipnCode: true },
        },
      },
    });

    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');

    // ── Resolve AIPN codes for each medication ──────────────────────
    // Two strategies in priority order:
    //  1. Billing items: hospitalCode → aipnCode (HIS import)
    //  2. Name match: resolvedDrug.genericName → SsoAipnItem.description ILIKE
    // Note: hospitalCode (hospital internal, 1500000+) ≠ AIPN code (national, 55825–1353186)

    const medAipnCodes = new Map<number, number>(); // med.id → aipnCode

    // Strategy 1: billing items (HIS import provides explicit aipnCode per hospitalCode)
    const hospToAipn = new Map<string, number>();
    for (const item of visit.visitBillingItems) {
      if (item.hospitalCode && item.aipnCode) {
        const parsed = parseInt(item.aipnCode, 10);
        if (!isNaN(parsed)) hospToAipn.set(item.hospitalCode, parsed);
      }
    }
    for (const med of visit.medications) {
      if (med.hospitalCode && hospToAipn.has(med.hospitalCode)) {
        medAipnCodes.set(med.id, hospToAipn.get(med.hospitalCode)!);
      }
    }

    // Strategy 2: match resolved drug generic name → SsoAipnItem description
    const needsNameLookup: { medId: number; genericName: string }[] = [];
    for (const med of visit.medications) {
      if (medAipnCodes.has(med.id)) continue;
      if (med.resolvedDrug?.genericName) {
        needsNameLookup.push({ medId: med.id, genericName: med.resolvedDrug.genericName });
      }
    }
    if (needsNameLookup.length > 0) {
      const uniqueNames = [...new Set(needsNameLookup.map((m) => m.genericName))];
      const nameToAipn = new Map<string, number>();
      for (const name of uniqueNames) {
        const match = await this.prisma.ssoAipnItem.findFirst({
          where: { description: { contains: name, mode: 'insensitive' } },
          select: { code: true },
        });
        if (match) nameToAipn.set(name, match.code);
      }
      for (const { medId, genericName } of needsNameLookup) {
        const code = nameToAipn.get(genericName);
        if (code) medAipnCodes.set(medId, code);
      }
    }

    // ── Batch query AIPN items + formulary ────────────────────────
    const aipnCodes = [...new Set(medAipnCodes.values())];

    const aipnPriceMap = new Map<
      number,
      { rate: number; unit: string; description: string }
    >();
    if (aipnCodes.length > 0) {
      const aipnItems = await this.prisma.ssoAipnItem.findMany({
        where: { code: { in: aipnCodes } },
        select: { code: true, rate: true, unit: true, description: true },
      });
      for (const item of aipnItems) {
        aipnPriceMap.set(item.code, {
          rate: Number(item.rate),
          unit: item.unit,
          description: item.description,
        });
      }
    }

    // Enrich with formulary data if visit has a confirmed protocol
    const formularyMap = new Map<
      number,
      { rate: number; unit: string; category: string }
    >();
    if (visit.confirmedProtocolId && aipnCodes.length > 0) {
      const confirmedProtocol = await this.prisma.protocolName.findUnique({
        where: { id: visit.confirmedProtocolId },
        select: { protocolCode: true },
      });
      if (confirmedProtocol) {
        const formularyItems = await this.prisma.ssoProtocolDrug.findMany({
          where: {
            protocolCode: confirmedProtocol.protocolCode,
            aipnCode: { in: aipnCodes },
            isActive: true,
          },
          select: {
            aipnCode: true,
            rate: true,
            unit: true,
            formulaCategory: true,
          },
        });
        for (const item of formularyItems) {
          formularyMap.set(item.aipnCode, {
            rate: Number(item.rate),
            unit: item.unit,
            category: item.formulaCategory || 'standard',
          });
        }
      }
    }

    // ── Map medications with pricing ──────────────────────────────
    const enrichedMedications = visit.medications.map((med) => {
      const aipnCode = medAipnCodes.get(med.id) ?? null;
      const aipnPrice = aipnCode ? aipnPriceMap.get(aipnCode) : null;
      const formularyEntry = aipnCode ? formularyMap.get(aipnCode) : null;

      return {
        ...med,
        aipnPricing: aipnPrice
          ? {
              rate: aipnPrice.rate,
              unit: aipnPrice.unit,
              aipnDescription: aipnPrice.description,
            }
          : null,
        formularyStatus: formularyEntry
          ? {
              inFormulary: true,
              formularyRate: formularyEntry.rate,
              category: formularyEntry.category,
            }
          : aipnCode
            ? { inFormulary: false }
            : null,
      };
    });

    // Fallback: if visit has no direct case link, look up patient's first case for sourceHospital
    let caseData = visit.case;
    if (!caseData && visit.patient) {
      const firstCase = await this.prisma.patientCase.findFirst({
        where: { patientId: visit.patient.id, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          caseNumber: true,
          sourceHospital: { select: { id: true, hcode5: true, nameThai: true } },
        },
      });
      if (firstCase) caseData = firstCase;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visitBillingItems: _billing, ...visitData } = visit;
    return {
      ...visitData,
      case: caseData,
      medications: enrichedMedications,
    };
  }

  // ─── Analysis / Matching ───────────────────────────────────

  @Get('visits/:vn/match')
  @ApiOperation({ summary: 'Run protocol matching and return ranked results' })
  async matchVisit(@Param('vn') vn: string) {
    const visit = await this.prisma.patientVisit.findUnique({
      where: { vn },
      select: { id: true },
    });
    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');

    return this.matchingService.matchVisit(vn);
  }

  @Post('visits/batch-top-match')
  @ApiOperation({ summary: 'Batch get top matching protocol for multiple visits' })
  async batchTopMatch(@Body() dto: BatchTopMatchDto) {
    const results: Record<
      string,
      {
        protocolId: number;
        protocolCode: string;
        protocolName: string;
        score: number;
        regimenId: number | null;
        regimenCode: string | null;
        regimenName: string | null;
      } | null
    > = {};

    const settled = await Promise.allSettled(
      dto.vns.map(async (vn) => {
        const match = await this.matchingService.matchVisit(vn);
        return { vn, match };
      }),
    );

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const { vn, match } = result.value;
        const top = match.results[0];
        results[vn] = top
          ? {
              protocolId: top.protocolId,
              protocolCode: top.protocolCode,
              protocolName: top.protocolName,
              score: top.score,
              regimenId: top.matchedRegimen?.regimenId || null,
              regimenCode: top.matchedRegimen?.regimenCode || null,
              regimenName: top.matchedRegimen?.regimenName || null,
            }
          : null;
      } else {
        // Extract VN from the rejected promise — mark as null
        const vnIndex = settled.indexOf(result);
        results[dto.vns[vnIndex]] = null;
      }
    }

    return results;
  }

  // ─── Confirmation ──────────────────────────────────────────

  @Patch('visits/:vn/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Confirm a protocol match for a visit' })
  async confirmProtocol(
    @Param('vn') vn: string,
    @Body() dto: ConfirmProtocolDto,
    @CurrentUser('id') userId: number,
  ) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { vn } });
    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');

    const protocol = await this.prisma.protocolName.findUnique({
      where: { id: dto.protocolId },
    });
    if (!protocol || !protocol.isActive) {
      throw new BadRequestException('โปรโตคอลไม่ถูกต้อง — Invalid protocol');
    }

    if (dto.regimenId) {
      const link = await this.prisma.protocolRegimen.findFirst({
        where: { protocolId: dto.protocolId, regimenId: dto.regimenId },
      });
      if (!link) {
        throw new BadRequestException('สูตรยาไม่อยู่ในโปรโตคอลนี้ — Regimen not linked to this protocol');
      }
    }

    const updated = await this.prisma.patientVisit.update({
      where: { vn },
      data: {
        confirmedProtocolId: dto.protocolId,
        confirmedRegimenId: dto.regimenId ?? null,
        confirmedByUserId: userId,
        confirmedAt: new Date(),
      },
      include: {
        confirmedProtocol: { select: { id: true, protocolCode: true, nameEnglish: true, nameThai: true } },
        confirmedRegimen: { select: { id: true, regimenCode: true, regimenName: true } },
        confirmedByUser: { select: { id: true, fullName: true, fullNameThai: true } },
      },
    });

    return {
      confirmedProtocolId: updated.confirmedProtocolId,
      confirmedRegimenId: updated.confirmedRegimenId,
      confirmedAt: updated.confirmedAt,
      confirmedProtocol: updated.confirmedProtocol,
      confirmedRegimen: updated.confirmedRegimen,
      confirmedByUser: updated.confirmedByUser,
    };
  }

  @Delete('visits/:vn/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Remove protocol confirmation from a visit' })
  async removeConfirmation(@Param('vn') vn: string) {
    const visit = await this.prisma.patientVisit.findUnique({ where: { vn } });
    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');

    await this.prisma.patientVisit.update({
      where: { vn },
      data: {
        confirmedProtocolId: null,
        confirmedRegimenId: null,
        confirmedByUserId: null,
        confirmedAt: null,
      },
    });

    return { message: 'ยกเลิกการยืนยันสำเร็จ — Confirmation removed' };
  }

  // ─── Formulary Compliance ────────────────────────────────────

  @Get('visits/:vn/formulary-check')
  @ApiOperation({
    summary: 'Check visit drugs against confirmed protocol formulary',
  })
  async checkFormulary(@Param('vn') vn: string) {
    const visit = await this.prisma.patientVisit.findUnique({
      where: { vn },
      include: {
        medications: {
          include: { resolvedDrug: { select: { genericName: true } } },
        },
        visitBillingItems: {
          where: { isActive: true },
          select: { hospitalCode: true, aipnCode: true },
        },
        confirmedProtocol: {
          select: { protocolCode: true, nameEnglish: true },
        },
      },
    });

    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');
    if (!visit.confirmedProtocol) {
      throw new BadRequestException(
        'ยังไม่ได้ยืนยันโปรโตคอล — Protocol not yet confirmed',
      );
    }

    // Resolve AIPN codes: billing items first, then name-based fallback
    const billingAipnMap = new Map<string, number>();
    for (const item of visit.visitBillingItems) {
      if (item.hospitalCode && item.aipnCode) {
        const parsed = parseInt(item.aipnCode, 10);
        if (!isNaN(parsed)) billingAipnMap.set(item.hospitalCode, parsed);
      }
    }
    const seen = new Set<number>();
    const aipnCodes: number[] = [];
    const needsNameLookup: string[] = [];
    for (const med of visit.medications) {
      // Strategy 1: billing items
      if (med.hospitalCode && billingAipnMap.has(med.hospitalCode)) {
        const code = billingAipnMap.get(med.hospitalCode)!;
        if (!seen.has(code)) { seen.add(code); aipnCodes.push(code); }
        continue;
      }
      // Collect for name-based matching
      if (med.resolvedDrug?.genericName) {
        needsNameLookup.push(med.resolvedDrug.genericName);
      }
    }
    // Strategy 2: name-based matching
    if (needsNameLookup.length > 0) {
      const uniqueNames = [...new Set(needsNameLookup)];
      for (const name of uniqueNames) {
        const match = await this.prisma.ssoAipnItem.findFirst({
          where: { description: { contains: name, mode: 'insensitive' } },
          select: { code: true },
        });
        if (match && !seen.has(match.code)) {
          seen.add(match.code);
          aipnCodes.push(match.code);
        }
      }
    }

    const compliance = await this.formularyService.checkFormularyCompliance(
      visit.confirmedProtocol.protocolCode,
      aipnCodes,
    );

    return {
      protocolCode: visit.confirmedProtocol.protocolCode,
      protocolName: visit.confirmedProtocol.nameEnglish,
      ...compliance,
      totalMedications: visit.medications.length,
      medicationsWithCode: aipnCodes.length,
    };
  }
}
