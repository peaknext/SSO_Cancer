import { IsOptional, IsString, IsInt, IsBoolean, IsDateString, IsIn, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryPatientsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by HN' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by resolved cancer site ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cancerSiteId?: number;

  @ApiPropertyOptional({ description: 'Filter to patients with at least one visit that has medications' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasMedications?: boolean;

  @ApiPropertyOptional({ description: 'Filter to patients with Z510 (radiation) in diagnoses' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasZ510?: boolean;

  @ApiPropertyOptional({ description: 'Filter to patients with Z511 (chemotherapy) in diagnoses' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasZ511?: boolean;

  @ApiPropertyOptional({ description: 'Filter visits from this date (YYYY-MM-DD)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  visitDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter visits up to this date (YYYY-MM-DD)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  visitDateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by visit type: 1=OPD, 2=IPD' })
  @IsOptional()
  @IsIn(['1', '2'])
  visitType?: string;
}
