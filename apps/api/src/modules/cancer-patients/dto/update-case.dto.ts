import { IsString, MaxLength, IsOptional, IsInt, IsIn, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCaseDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  protocolId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  caseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'รหัส Protocol QR Code จากระบบ SSO Cancer Care' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vcrCode?: string;

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
