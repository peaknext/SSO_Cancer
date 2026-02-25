import { IsOptional, IsString, MaxLength, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryPatientsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'ค้นหา HN / เลขบัตร / ชื่อ' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'กรองตามตำแหน่งมะเร็ง (via case protocol)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cancerSiteId?: number;

  @ApiPropertyOptional({ description: 'กรองตาม รพ.ต้นทาง (via case sourceHospitalId)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceHospitalId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
