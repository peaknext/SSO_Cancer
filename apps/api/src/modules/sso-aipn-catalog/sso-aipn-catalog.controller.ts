import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SsoAipnCatalogService } from './sso-aipn-catalog.service';
import { QuerySsoAipnDto } from './dto/query-sso-aipn.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04

@ApiTags('SSO AIPN Catalog')
@ApiBearerAuth()
@Controller('sso-aipn-catalog')
export class SsoAipnCatalogController {
  constructor(private readonly service: SsoAipnCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List AIPN catalog items with search/filters' })
  async findAll(@Query() query: QuerySsoAipnDto) {
    const result = await this.service.findAll(query);
    return createPaginatedResponse(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get AIPN catalog statistics' })
  async getStats() {
    return this.service.getStats();
  }

  // ─── Import endpoints (ADMIN+) ──────────────────────────────────────────

  @Post('import/preview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Upload EquipdevAIPN xlsx and preview diff' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    this.validateUpload(file);
    return this.service.parseAndDiff(file.buffer);
  }

  @Post('import/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Re-parse xlsx and apply changes to database' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async importConfirm(@UploadedFile() file: Express.Multer.File) {
    this.validateUpload(file);
    return this.service.applyImport(file.buffer);
  }

  // ─── Read endpoints ─────────────────────────────────────────────────────

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Lookup AIPN item versions by SSO code' })
  async findByCode(@Param('code', ParseIntPipe) code: number) {
    const items = await this.service.findByCode(code);
    if (!items || items.length === 0)
      throw new NotFoundException('AIPN_ITEM_NOT_FOUND');
    return items;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AIPN item by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const item = await this.service.findById(id);
    if (!item) throw new NotFoundException('AIPN_ITEM_NOT_FOUND');
    return item;
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private validateUpload(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'กรุณาอัปโหลดไฟล์ — Please upload a file',
      );
    }
    if (!file.buffer.subarray(0, 4).equals(XLSX_MAGIC)) {
      throw new BadRequestException(
        'ไฟล์ไม่ใช่ Excel (.xlsx) ที่ถูกต้อง — Invalid file format',
      );
    }
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      throw new BadRequestException(
        'รองรับเฉพาะไฟล์ .xlsx — Only .xlsx files are supported',
      );
    }
  }
}
