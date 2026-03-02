import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPatientDto {
  @ApiProperty({ description: 'คำค้นหา (HN หรือ เลขบัตรประชาชน 13 หลัก)' })
  @IsString()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    description: 'ประเภทการค้นหา (auto-detect ถ้าไม่ระบุ)',
    enum: ['hn', 'citizen_id'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['hn', 'citizen_id'])
  type?: 'hn' | 'citizen_id';
}
