import { IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryProtocolsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cancerSiteId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  protocolType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatmentIntent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
