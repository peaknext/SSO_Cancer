import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryHospitalsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by name, hcode5, or hcode9' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;
}
