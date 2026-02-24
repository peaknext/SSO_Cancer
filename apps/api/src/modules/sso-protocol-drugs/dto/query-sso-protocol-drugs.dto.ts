import { IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QuerySsoProtocolDrugsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by AIPN code or description' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by protocol code (e.g., C0111)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  protocolCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by formula category',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  formulaCategory?: string;

  @ApiPropertyOptional({ description: 'Minimum rate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRate?: number;

  @ApiPropertyOptional({ description: 'Maximum rate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxRate?: number;
}
