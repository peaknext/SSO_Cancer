import { IsOptional, IsString, IsInt, IsBoolean, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryVisitsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by VN or diagnosis' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by resolved cancer site ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cancerSiteId?: number;

  @ApiPropertyOptional({ description: 'Filter to visits that have medications' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasMedications?: boolean;

  @ApiPropertyOptional({ description: 'Filter to visits with Z51x in secondary diagnoses' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasZ51?: boolean;
}
