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
import { DrugsService } from './drugs.service';
import { QueryDrugsDto } from './dto/query-drugs.dto';
import { CreateDrugDto } from './dto/create-drug.dto';
import { UpdateDrugDto } from './dto/update-drug.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Drugs')
@ApiBearerAuth()
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Get()
  @ApiOperation({ summary: 'List drugs with filters' })
  async findAll(@Query() query: QueryDrugsDto) {
    const result = await this.drugsService.findAll(query);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get drug detail with trade names and regimen usage' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const drug = await this.drugsService.findById(id);
    if (!drug) throw new NotFoundException('DRUG_NOT_FOUND');
    return drug;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create drug' })
  async create(@Body() dto: CreateDrugDto) {
    return this.drugsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update drug' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDrugDto,
  ) {
    return this.drugsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate drug' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.drugsService.deactivate(id);
  }
}
