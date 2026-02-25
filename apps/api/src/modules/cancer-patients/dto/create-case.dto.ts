import { IsString, MaxLength, IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCaseDto {
  @ApiProperty({
    example: 'C2024-001',
    description: 'เลขที่เคส (เจ้าหน้าที่กำหนดเอง)',
  })
  @IsString()
  @MaxLength(50)
  caseNumber: string;

  @ApiPropertyOptional({ description: 'Protocol ID' })
  @IsOptional()
  @IsInt()
  protocolId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'วันที่ลงทะเบียนส่งต่อ', example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  referralDate?: string;

  @ApiPropertyOptional({ description: 'วันที่ลงทะเบียนรับเข้า', example: '2025-01-20' })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiPropertyOptional({ description: 'รหัสสถานพยาบาลต้นทาง (Hospital ID)' })
  @IsOptional()
  @IsInt()
  sourceHospitalId?: number;
}
