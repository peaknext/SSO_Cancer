import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HisIntegrationService } from './his-integration.service';
import { SearchPatientDto } from './dto/search-patient.dto';
import { ImportPatientDto } from './dto/import-patient.dto';
import { AdvancedSearchDto } from './dto/advanced-search.dto';

@ApiTags('HIS Integration')
@ApiBearerAuth()
@Controller('his-integration')
export class HisIntegrationController {
  constructor(private readonly hisService: HisIntegrationService) {}

  @Get('search')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ค้นหาผู้ป่วยจาก HIS' })
  search(@Query() dto: SearchPatientDto) {
    return this.hisService.searchPatient(dto.q, dto.type);
  }

  @Get('preview/:hn')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Preview ข้อมูลก่อน import จาก HIS' })
  preview(
    @Param('hn') hn: string,
    @Query() dto: ImportPatientDto,
  ) {
    return this.hisService.preview(hn, dto.from, dto.to);
  }

  @Post('import/:hn')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'นำเข้าข้อมูลผู้ป่วยจาก HIS' })
  importPatient(
    @Param('hn') hn: string,
    @Query() dto: ImportPatientDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.hisService.importPatient(hn, userId, dto.from, dto.to);
  }

  @Post('search/advanced')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ค้นหาผู้ป่วยขั้นสูงจาก HIS (ตามเกณฑ์ทางคลินิก)' })
  advancedSearch(@Body() dto: AdvancedSearchDto) {
    return this.hisService.advancedSearch(dto);
  }

  @Get('protocol-drug-names')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'รายชื่อยาที่ใช้ในโปรโตคอล (สำหรับ filter ค้นหาขั้นสูง)' })
  getProtocolDrugNames() {
    return this.hisService.getProtocolDrugNames();
  }

  @Get('health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'ทดสอบการเชื่อมต่อ HIS API' })
  healthCheck() {
    return this.hisService.healthCheck();
  }
}
