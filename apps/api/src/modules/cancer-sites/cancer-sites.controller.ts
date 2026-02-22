import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CancerSitesService } from './cancer-sites.service';
import { QueryCancerSitesDto } from './dto/query-cancer-sites.dto';
import { CreateCancerSiteDto } from './dto/create-cancer-site.dto';
import { UpdateCancerSiteDto } from './dto/update-cancer-site.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Cancer Sites')
@ApiBearerAuth()
@Controller('cancer-sites')
export class CancerSitesController {
  constructor(private readonly cancerSitesService: CancerSitesService) {}

  @Get()
  @ApiOperation({ summary: 'List cancer sites' })
  async findAll(@Query() query: QueryCancerSitesDto) {
    const result = await this.cancerSitesService.findAll(query);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cancer site detail with stages' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const site = await this.cancerSitesService.findById(id);
    if (!site) throw new NotFoundException('CANCER_SITE_NOT_FOUND');
    return site;
  }

  @Get(':id/protocols')
  @ApiOperation({ summary: 'Get protocols for a cancer site' })
  async getProtocols(@Param('id', ParseIntPipe) id: number) {
    return this.cancerSitesService.getProtocols(id);
  }

  @Get(':id/stages')
  @ApiOperation({ summary: 'Get valid stages for a cancer site' })
  async getStages(@Param('id', ParseIntPipe) id: number) {
    return this.cancerSitesService.getStages(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create cancer site' })
  async create(@Body() dto: CreateCancerSiteDto) {
    return this.cancerSitesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update cancer site' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCancerSiteDto,
  ) {
    return this.cancerSitesService.update(id, dto);
  }
}
