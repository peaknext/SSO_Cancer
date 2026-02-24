import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SsoProtocolDrugsService } from './sso-protocol-drugs.service';
import { QuerySsoProtocolDrugsDto } from './dto/query-sso-protocol-drugs.dto';
import { ValidateFormularyDto } from './dto/validate-formulary.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('SSO Protocol Drugs')
@ApiBearerAuth()
@Controller('sso-protocol-drugs')
export class SsoProtocolDrugsController {
  constructor(private readonly service: SsoProtocolDrugsService) {}

  @Get()
  @ApiOperation({
    summary: 'List SSO protocol drug formulary with search/filters',
  })
  async findAll(@Query() query: QuerySsoProtocolDrugsDto) {
    const result = await this.service.findAll(query);
    return createPaginatedResponse(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get formulary statistics' })
  async getStats() {
    return this.service.getStats();
  }

  @Get('by-protocol/:protocolCode')
  @ApiOperation({ summary: 'Get all formulary drugs for a specific protocol' })
  async findByProtocol(@Param('protocolCode') protocolCode: string) {
    return this.service.findByProtocol(protocolCode);
  }

  @Get('by-aipn/:code')
  @ApiOperation({ summary: 'Get all protocols that include this AIPN code' })
  async findByAipnCode(@Param('code', ParseIntPipe) code: number) {
    return this.service.findByAipnCode(code);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Check formulary compliance for drugs against a protocol',
  })
  async validateCompliance(@Body() dto: ValidateFormularyDto) {
    return this.service.checkFormularyCompliance(
      dto.protocolCode,
      dto.aipnCodes,
    );
  }
}
