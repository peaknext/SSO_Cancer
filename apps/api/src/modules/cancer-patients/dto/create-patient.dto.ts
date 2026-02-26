import { IsString, MaxLength, Length, Matches, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ example: '1234567', description: 'Hospital Number' })
  @IsString()
  @MaxLength(20)
  hn: string;

  @ApiProperty({
    example: '1100100123456',
    description: 'เลขบัตรประชาชน 13 หลัก',
  })
  @IsString()
  @Length(13, 13, { message: 'เลขบัตรประชาชนต้องมี 13 หลัก' })
  @Matches(/^\d{13}$/, { message: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' })
  citizenId: string;

  @ApiProperty({
    example: 'นายสมชาย ใจดี',
    description: 'คำนำหน้า+ชื่อ+สกุล (ภาษาไทย)',
  })
  @IsString()
  @MaxLength(200)
  fullName: string;

  @ApiPropertyOptional({ example: 'นาย', description: 'คำนำหน้า' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  titleName?: string;

  @ApiPropertyOptional({ example: 'M', description: 'เพศ (M/F)' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @ApiPropertyOptional({ example: '1980-05-15', description: 'วันเกิด (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'ที่อยู่' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '0891234567', description: 'เบอร์โทร' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '10711', description: 'รหัส รพ.หลักตามสิทธิ (hcode5)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  mainHospitalCode?: string;
}
