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
import { ProtocolsService } from './protocols.service';
import { QueryProtocolsDto } from './dto/query-protocols.dto';
import { CreateProtocolDto } from './dto/create-protocol.dto';
import { UpdateProtocolDto } from './dto/update-protocol.dto';
import { LinkRegimenDto } from './dto/link-regimen.dto';
import { UpdateProtocolRegimenDto } from './dto/update-protocol-regimen.dto';
import { LinkStageDto } from './dto/link-stage.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Protocols')
@ApiBearerAuth()
@Controller('protocols')
export class ProtocolsController {
  constructor(private readonly protocolsService: ProtocolsService) {}

  @Get()
  @ApiOperation({ summary: 'List protocols with filters' })
  async findAll(@Query() query: QueryProtocolsDto) {
    const result = await this.protocolsService.findAll(query);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get protocol deep view (site, stages, regimens, drugs, trade names)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const protocol = await this.protocolsService.findById(id);
    if (!protocol) throw new NotFoundException('PROTOCOL_NOT_FOUND');
    return protocol;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create protocol with optional stage associations' })
  async create(@Body() dto: CreateProtocolDto) {
    return this.protocolsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update protocol metadata' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProtocolDto,
  ) {
    return this.protocolsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate protocol' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.protocolsService.deactivate(id);
  }

  @Post(':id/regimens')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Link regimen to protocol' })
  async linkRegimen(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkRegimenDto,
  ) {
    return this.protocolsService.linkRegimen(id, dto);
  }

  @Patch(':id/regimens/:regimenId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update protocol-regimen link (notes, line, preferred)' })
  async updateProtocolRegimen(
    @Param('id', ParseIntPipe) id: number,
    @Param('regimenId', ParseIntPipe) regimenId: number,
    @Body() dto: UpdateProtocolRegimenDto,
  ) {
    return this.protocolsService.updateProtocolRegimen(id, regimenId, dto);
  }

  @Delete(':id/regimens/:regimenId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Unlink regimen from protocol' })
  async unlinkRegimen(
    @Param('id', ParseIntPipe) id: number,
    @Param('regimenId', ParseIntPipe) regimenId: number,
  ) {
    await this.protocolsService.unlinkRegimen(id, regimenId);
    return { message: 'Regimen unlinked' };
  }

  @Post(':id/stages')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Link stage to protocol' })
  async linkStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkStageDto,
  ) {
    return this.protocolsService.linkStage(id, dto);
  }

  @Delete(':id/stages/:stageId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Unlink stage from protocol' })
  async unlinkStage(
    @Param('id', ParseIntPipe) id: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    await this.protocolsService.unlinkStage(id, stageId);
    return { message: 'Stage unlinked' };
  }
}
