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
import { DrugTradeNamesService } from './drug-trade-names.service';
import { QueryDrugTradeNamesDto } from './dto/query-drug-trade-names.dto';
import { CreateDrugTradeNameDto } from './dto/create-drug-trade-name.dto';
import { UpdateDrugTradeNameDto } from './dto/update-drug-trade-name.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Drug Trade Names')
@ApiBearerAuth()
@Controller('drug-trade-names')
export class DrugTradeNamesController {
  constructor(private readonly drugTradeNamesService: DrugTradeNamesService) {}

  @Get()
  @ApiOperation({ summary: 'List drug trade names with filters' })
  async findAll(@Query() query: QueryDrugTradeNamesDto) {
    const result = await this.drugTradeNamesService.findAll(query);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get drug trade name detail' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const tradeName = await this.drugTradeNamesService.findById(id);
    if (!tradeName) throw new NotFoundException('DRUG_TRADE_NAME_NOT_FOUND');
    return tradeName;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create drug trade name' })
  async create(@Body() dto: CreateDrugTradeNameDto) {
    return this.drugTradeNamesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update drug trade name' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDrugTradeNameDto,
  ) {
    return this.drugTradeNamesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate drug trade name' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.drugTradeNamesService.deactivate(id);
  }
}
