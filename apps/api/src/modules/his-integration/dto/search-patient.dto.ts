import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchPatientDto {
  @ApiProperty({ description: 'คำค้นหา (HN, Citizen ID 13 หลัก, หรือ ชื่อ-สกุล)' })
  @IsString()
  @MinLength(1)
  q: string;

  @ApiPropertyOptional({
    description: 'ประเภทการค้นหา',
    enum: ['hn', 'citizen_id', 'name'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['hn', 'citizen_id', 'name'])
  type?: 'hn' | 'citizen_id' | 'name';
}
