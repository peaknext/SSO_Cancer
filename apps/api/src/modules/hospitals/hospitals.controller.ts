import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { QueryHospitalsDto } from './dto/query-hospitals.dto';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Hospitals')
@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Get()
  @ApiOperation({ summary: 'List hospitals with search and pagination' })
  async findAll(@Query() query: QueryHospitalsDto) {
    const { data, total, page, limit } = await this.hospitalsService.findAll(query);
    return createPaginatedResponse(data, total, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hospital by ID' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.hospitalsService.findById(id);
  }
}
