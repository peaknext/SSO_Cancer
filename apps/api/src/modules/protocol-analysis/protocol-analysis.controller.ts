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
        confirmedProtocol: { select: { id: true, protocolCode: true, nameEnglish: true, nameThai: true } },
        confirmedRegimen: { select: { id: true, regimenCode: true, regimenName: true } },
        confirmedByUser: { select: { id: true, fullName: true, fullNameThai: true } },
      },
    });

    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');

    // Enrich medications with AIPN pricing
    const hospitalCodes = visit.medications
      .map((m) => m.hospitalCode)
      .filter(Boolean)
      .map((c) => parseInt(c!, 10))
      .filter((c) => !isNaN(c));

    let aipnPriceMap = new Map<
      number,
      { rate: number; unit: string; description: string }
    >();
    if (hospitalCodes.length > 0) {
      const uniqueCodes = [...new Set(hospitalCodes)];
      const aipnItems = await this.prisma.ssoAipnItem.findMany({
        where: { code: { in: uniqueCodes } },
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
    let formularyMap = new Map<
      number,
      { rate: number; unit: string; category: string }
    >();
    if (visit.confirmedProtocolId && hospitalCodes.length > 0) {
      const confirmedProtocol = await this.prisma.protocolName.findUnique({
        where: { id: visit.confirmedProtocolId },
        select: { protocolCode: true },
      });
      if (confirmedProtocol) {
        const uniqueCodes = [...new Set(hospitalCodes)];
        const formularyItems = await this.prisma.ssoProtocolDrug.findMany({
          where: {
            protocolCode: confirmedProtocol.protocolCode,
            aipnCode: { in: uniqueCodes },
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

    // Map medications with pricing
    const enrichedMedications = visit.medications.map((med) => {
      const code = med.hospitalCode
        ? parseInt(med.hospitalCode, 10)
        : null;
      const aipnPrice =
        code && !isNaN(code) ? aipnPriceMap.get(code) : null;
      const formularyEntry =
        code && !isNaN(code) ? formularyMap.get(code) : null;

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
          : code && !isNaN(code)
            ? { inFormulary: false }
            : null,
      };
    });

    return {
      ...visit,
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
        protocolCode: string;
        protocolName: string;
        score: number;
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
              protocolCode: top.protocolCode,
              protocolName: top.protocolName,
              score: top.score,
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
        medications: true,
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

    const aipnCodes = visit.medications
      .map((m) =>
        m.hospitalCode ? parseInt(m.hospitalCode, 10) : null,
      )
      .filter((c): c is number => c !== null && !isNaN(c));

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
