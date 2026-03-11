import { IsOptional, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateScanConfigDto {
  @ApiPropertyOptional({ description: 'เปิด/ปิด การสแกนอัตโนมัติ' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'นำเข้า visit ที่วินิจฉัยมะเร็ง (C, D0)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  cancerDiag?: boolean;

  @ApiPropertyOptional({ description: 'นำเข้า visit Z510 (ฉายรังสี)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  z510?: boolean;

  @ApiPropertyOptional({ description: 'นำเข้า visit Z511 (เคมีบำบัด)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  z511?: boolean;

  @ApiPropertyOptional({ description: 'รายการ cancer site IDs', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  cancerSiteIds?: number[];

  @ApiPropertyOptional({ description: 'เฉพาะ visit ที่มีรายการยา' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasMedications?: boolean;
}
