import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List audit logs with filters' })
  async findAll(@Query() query: QueryAuditLogsDto) {
    const result = await this.auditLogsService.findAll(query);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportCsv(
    @Query() query: QueryAuditLogsDto,
    @Res() res: Response,
  ) {
    const csv = await this.auditLogsService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit log detail with old/new values' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const log = await this.auditLogsService.findById(id);
    if (!log) throw new NotFoundException('AUDIT_LOG_NOT_FOUND');
    return log;
  }
}
