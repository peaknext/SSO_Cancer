import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CancerPatientsService } from './cancer-patients.service';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { ExportPatientsDto } from './dto/export-patients.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { AssignVisitCaseDto } from './dto/assign-visit-case.dto';
import { CreateBillingClaimDto } from './dto/create-billing-claim.dto';
import { UpdateBillingClaimDto } from './dto/update-billing-claim.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Cancer Patients')
@ApiBearerAuth()
@Controller('cancer-patients')
export class CancerPatientsController {
  constructor(private readonly service: CancerPatientsService) {}

  // ─── Patient CRUD ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List patients with search/filter/pagination' })
  async findAll(@Query() query: QueryPatientsDto) {
    const result = await this.service.findAll(query);
    return createPaginatedResponse(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('case-hospitals')
  @ApiOperation({ summary: 'Distinct hospitals referenced in patient cases' })
  async findCaseHospitals() {
    return this.service.findCaseHospitals();
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Export filtered patients as Excel (.xlsx)' })
  async exportExcel(@Query() query: ExportPatientsDto, @Res() res: Response) {
    const buffer = await this.service.exportExcel(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=cancer-patients-${Date.now()}.xlsx`,
    );
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient detail with cases and visit timeline' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const patient = await this.service.findById(id);
    if (!patient) throw new NotFoundException('ไม่พบผู้ป่วย — Patient not found');
    return patient;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Register new patient (auto-links existing visits by HN)' })
  async create(@Body() dto: CreatePatientDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update patient info' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete patient' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }

  // ─── Case Management ──────────────────────────────────────────────────────

  @Post(':id/cases')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new case for patient' })
  async createCase(
    @Param('id', ParseIntPipe) patientId: number,
    @Body() dto: CreateCaseDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.createCase(patientId, dto, userId);
  }

  @Patch(':id/cases/:caseId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update case (status, protocol, notes)' })
  async updateCase(
    @Param('id', ParseIntPipe) patientId: number,
    @Param('caseId', ParseIntPipe) caseId: number,
    @Body() dto: UpdateCaseDto,
  ) {
    return this.service.updateCase(patientId, caseId, dto);
  }

  // ─── Visit-Case Assignment ─────────────────────────────────────────────────

  @Patch('visits/:vn/assign-case')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Assign visit to a case' })
  async assignVisitToCase(
    @Param('vn') vn: string,
    @Body() dto: AssignVisitCaseDto,
  ) {
    return this.service.assignVisitToCase(vn, dto.caseId);
  }

  @Delete('visits/:vn/assign-case')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Remove visit from case' })
  async removeVisitFromCase(@Param('vn') vn: string) {
    return this.service.removeVisitFromCase(vn);
  }

  // ─── Billing Claims ───────────────────────────────────────────────────────

  @Post('visits/:vn/billing-claims')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Add billing claim round to visit' })
  async createBillingClaim(
    @Param('vn') vn: string,
    @Body() dto: CreateBillingClaimDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.createBillingClaim(vn, dto, userId);
  }

  @Patch('visits/:vn/billing-claims/:claimId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update billing claim result' })
  async updateBillingClaim(
    @Param('claimId', ParseIntPipe) claimId: number,
    @Body() dto: UpdateBillingClaimDto,
  ) {
    return this.service.updateBillingClaim(claimId, dto);
  }

  @Delete('visits/:vn/billing-claims/:claimId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete billing claim' })
  async deleteBillingClaim(
    @Param('claimId', ParseIntPipe) claimId: number,
  ) {
    return this.service.deleteBillingClaim(claimId);
  }
}
