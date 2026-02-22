import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegimensService } from './regimens.service';
import { QueryRegimensDto } from './dto/query-regimens.dto';
import { CreateRegimenDto } from './dto/create-regimen.dto';
import { UpdateRegimenDto } from './dto/update-regimen.dto';
import { AddRegimenDrugDto } from './dto/add-regimen-drug.dto';
import { UpdateRegimenDrugDto } from './dto/update-regimen-drug.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Regimens')
@ApiBearerAuth()
@Controller('regimens')
export class RegimensController {
  constructor(private readonly regimensService: RegimensService) {}

  @Get()
  @ApiOperation({ summary: 'List regimens with filters' })
  async findAll(@Query() query: QueryRegimensDto) {
    const result = await this.regimensService.findAll(query);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get regimen detail with drugs and linked protocols' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const regimen = await this.regimensService.findById(id);
    if (!regimen) throw new NotFoundException('REGIMEN_NOT_FOUND');
    return regimen;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create regimen' })
  async create(@Body() dto: CreateRegimenDto) {
    return this.regimensService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update regimen' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRegimenDto,
  ) {
    return this.regimensService.update(id, dto);
  }

  @Post(':id/drugs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Add drug to regimen with dosing info' })
  async addDrug(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddRegimenDrugDto,
  ) {
    return this.regimensService.addDrug(id, dto);
  }

  @Patch(':id/drugs/:drugId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update drug dosing in regimen' })
  async updateDrug(
    @Param('id', ParseIntPipe) id: number,
    @Param('drugId', ParseIntPipe) drugId: number,
    @Body() dto: UpdateRegimenDrugDto,
  ) {
    return this.regimensService.updateDrug(id, drugId, dto);
  }

  @Delete(':id/drugs/:drugId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Remove drug from regimen' })
  async removeDrug(
    @Param('id', ParseIntPipe) id: number,
    @Param('drugId', ParseIntPipe) drugId: number,
  ) {
    await this.regimensService.removeDrug(id, drugId);
    return { message: 'Drug removed from regimen' };
  }
}
