import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SsoAipnCatalogService } from './sso-aipn-catalog.service';
import { QuerySsoAipnDto } from './dto/query-sso-aipn.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

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

  @Get('by-code/:code')
  @ApiOperation({ summary: 'Lookup AIPN item by SSO code' })
  async findByCode(@Param('code', ParseIntPipe) code: number) {
    const item = await this.service.findByCode(code);
    if (!item) throw new NotFoundException('AIPN_ITEM_NOT_FOUND');
    return item;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AIPN item by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    const item = await this.service.findById(id);
    if (!item) throw new NotFoundException('AIPN_ITEM_NOT_FOUND');
    return item;
  }
}
