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
import { QueryPatientsDto } from './dto/query-patients.dto';
import { QueryVisitsDto } from './dto/query-visits.dto';
import { QueryImportsDto } from './dto/query-imports.dto';
import { ConfirmProtocolDto } from './dto/confirm-protocol.dto';
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
    const { page = 1, limit = 25, search, cancerSiteId, hasMedications, hasZ51 } = query;

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
    const { page = 1, limit = 50, sortOrder = 'desc', cancerSiteId, hasMedications, hasZ51 } = query;

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
    return visit;
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
}
