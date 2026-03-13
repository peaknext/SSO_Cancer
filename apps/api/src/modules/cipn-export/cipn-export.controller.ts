import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { CipnExportService } from './cipn-export.service';
import { CreateCipnExportDto } from './dto/create-cipn-export.dto';

@ApiTags('CIPN Export')
@ApiBearerAuth()
@Controller('cipn-export')
export class CipnExportController {
  constructor(
    private readonly exportService: CipnExportService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('admissions')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'รายการ IPD admissions ที่สามารถ export CIPN ได้' })
  listExportableAdmissions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.exportService.listExportableAdmissions({
      from,
      to,
      search,
      page: page || 1,
      limit: Math.min(limit || 50, 100),
    });
  }

  @Post('preview')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Preview ข้อมูลก่อน export CIPN' })
  preview(@Body() dto: CreateCipnExportDto) {
    return this.exportService.preview(dto.visitIds);
  }

  @Post('generate')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'สร้างไฟล์ ZIP CIPN' })
  async generate(
    @Body() dto: CreateCipnExportDto,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, fileName, batchId } = await this.exportService.generateExport(
      dto.visitIds,
      userId,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
      'X-Batch-Id': String(batchId),
    });

    res.end(buffer);

    // Manual audit log (fire-and-forget) — @Res() bypasses AuditLogInterceptor
    this.prisma.auditLog
      .create({
        data: {
          userId,
          action: 'EXPORT',
          entityType: 'BillingExportBatch',
          entityId: batchId,
          newValues: JSON.stringify({ visitIds: dto.visitIds, fileName, exportType: 'CIPN' }),
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent']?.substring(0, 500) || null,
        },
      })
      .catch(() => {});
  }

  @Get('batches')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'รายการ CIPN export batches' })
  listBatches(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.exportService.listBatches(page || 1, Math.min(limit || 20, 100));
  }

  @Get('batches/:id/download')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ดาวน์โหลด ZIP ซ้ำจาก CIPN batch' })
  async downloadBatch(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.exportService.downloadBatch(id);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);

    // Manual audit log
    this.prisma.auditLog
      .create({
        data: {
          userId,
          action: 'DOWNLOAD',
          entityType: 'BillingExportBatch',
          entityId: id,
          newValues: JSON.stringify({ fileName, exportType: 'CIPN' }),
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent']?.substring(0, 500) || null,
        },
      })
      .catch(() => {});
  }
}
