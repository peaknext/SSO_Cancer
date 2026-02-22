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
import { CancerStagesService } from './cancer-stages.service';
import { QueryCancerStagesDto } from './dto/query-cancer-stages.dto';
import { CreateCancerStageDto } from './dto/create-cancer-stage.dto';
import { UpdateCancerStageDto } from './dto/update-cancer-stage.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Cancer Stages')
@ApiBearerAuth()
@Controller('cancer-stages')
export class CancerStagesController {
  constructor(private readonly cancerStagesService: CancerStagesService) {}

  @Get()
  @ApiOperation({ summary: 'List cancer stages' })
  async findAll(@Query() query: QueryCancerStagesDto) {
    const result = await this.cancerStagesService.findAll(query);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cancer stage detail' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const stage = await this.cancerStagesService.findById(id);
    if (!stage) throw new NotFoundException('CANCER_STAGE_NOT_FOUND');
    return stage;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create cancer stage' })
  async create(@Body() dto: CreateCancerStageDto) {
    return this.cancerStagesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update cancer stage' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCancerStageDto,
  ) {
    return this.cancerStagesService.update(id, dto);
  }
}
