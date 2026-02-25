import { IsOptional, IsString, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportPatientsDto {
  @ApiPropertyOptional({ description: 'ค้นหา HN / เลขบัตร / ชื่อ' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'กรองตามตำแหน่งมะเร็ง' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cancerSiteId?: number;

  @ApiPropertyOptional({ description: 'กรองตาม รพ.ต้นทาง' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceHospitalId?: number;

  @ApiPropertyOptional({ description: 'Comma-separated field keys to include' })
  @IsOptional()
  @IsString()
  fields?: string;
}
