import { Controller, Get, Post, Patch, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';
import { HisIntegrationService } from './his-integration.service';
import { ScanLogService } from './scan-log.service';
import { SearchPatientDto } from './dto/search-patient.dto';
import { ImportPatientDto } from './dto/import-patient.dto';
import { AdvancedSearchDto } from './dto/advanced-search.dto';
import { ImportSingleVisitDto } from './dto/import-single-visit.dto';
import { SyncVisitDto } from './dto/sync-visit.dto';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { QueryScanLogsDto } from './dto/query-scan-logs.dto';

@ApiTags('HIS Integration')
@ApiBearerAuth()
@Controller('his-integration')
export class HisIntegrationController {
  constructor(
    private readonly hisService: HisIntegrationService,
    private readonly scanLogService: ScanLogService,
  ) {}

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

  @Get('search-preview')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ค้นหาผู้ป่วย + preview visits พร้อมตรวจสอบความสมบูรณ์' })
  searchAndPreview(@Query() dto: SearchPatientDto) {
    return this.hisService.searchAndPreview(dto.q, dto.type);
  }

  @Post('import-visit')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'นำเข้า visit เดียวจาก HIS' })
  importSingleVisit(
    @Body() dto: ImportSingleVisitDto,
    @Query() searchDto: SearchPatientDto,
    @CurrentUser('id') userId: number,
  ) {
    const type = searchDto.type || (/^\d{13}$/.test(searchDto.q?.trim()) ? 'citizen_id' : 'hn');
    return this.hisService.importSingleVisit(
      dto.vn,
      searchDto.q,
      type as 'hn' | 'citizen_id',
      userId,
      dto.forceIncomplete,
    );
  }

  @Patch('sync-visit')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ซิงค์ข้อมูล visit ที่นำเข้าแล้วกับข้อมูลล่าสุดจาก HIS' })
  syncVisit(
    @Body() dto: SyncVisitDto,
    @Query() searchDto: SearchPatientDto,
    @CurrentUser('id') userId: number,
  ) {
    const type = searchDto.type || (/^\d{13}$/.test(searchDto.q?.trim()) ? 'citizen_id' : 'hn');
    return this.hisService.syncVisit(
      dto.vn,
      searchDto.q,
      type as 'hn' | 'citizen_id',
      userId,
    );
  }

  @Post('batch-sync')
  @Roles(UserRole.EDITOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ซิงค์ข้อมูลหลาย visit พร้อมกันกับข้อมูลล่าสุดจาก HIS' })
  batchSync(
    @Body() dto: BatchSyncDto,
    @Query() searchDto: SearchPatientDto,
    @CurrentUser('id') userId: number,
  ) {
    const type = searchDto.type || (/^\d{13}$/.test(searchDto.q?.trim()) ? 'citizen_id' : 'hn');
    return this.hisService.batchSyncVisits(
      dto.hn,
      dto.vns,
      searchDto.q,
      type as 'hn' | 'citizen_id',
      userId,
    );
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

  @Post('backfill-aipn')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Backfill AIPN codes สำหรับ VisitMedication ที่มีอยู่ (one-time)' })
  backfillAipnCodes() {
    return this.hisService.backfillAipnCodes();
  }

  @Post('purge-visits')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ล้างข้อมูล visit ทั้งหมด (SUPER_ADMIN only)' })
  purgeVisits() {
    return this.hisService.purgeAllVisits();
  }

  @Get('health')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'ทดสอบการเชื่อมต่อ HIS API' })
  healthCheck() {
    return this.hisService.healthCheck();
  }

  // ─── Scan Logs ────────────────────────────────────────────────

  @Get('scan-logs')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'ประวัติการสแกน HIS อัตโนมัติ (paginated)' })
  getScanLogs(@Query() query: QueryScanLogsDto) {
    return this.scanLogService.findAll(query).then((result) =>
      createPaginatedResponse(result.data, result.total, result.page, result.limit),
    );
  }

  @Get('scan-logs/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'รายละเอียดการสแกนครั้งเดียว พร้อมรายชื่อผู้ป่วย' })
  async getScanLogById(@Param('id') id: string) {
    const scanLog = await this.scanLogService.findById(+id);
    if (!scanLog) throw new NotFoundException('Scan log not found');
    return scanLog;
  }
}
