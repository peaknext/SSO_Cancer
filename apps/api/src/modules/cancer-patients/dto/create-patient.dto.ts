import { IsString, MaxLength, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
