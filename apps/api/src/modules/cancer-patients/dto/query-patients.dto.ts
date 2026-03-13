import { IsOptional, IsString, MaxLength, IsBoolean, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryPatientsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'กรองตามประเภท visit: 1=OPD, 2=IPD' })
  @IsOptional()
  @IsIn(['1', '2'])
  visitType?: string;
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

  @ApiPropertyOptional({ description: 'กรองตามชื่อยา generic (partial match)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  drugName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'กรองเฉพาะผู้ป่วยที่ยังไม่มี case' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  noCases?: boolean;
}
