import {
  IsString,
  MaxLength,
  Length,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePatientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  hn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(13, 13, { message: 'เลขบัตรประชาชนต้องมี 13 หลัก' })
  @Matches(/^\d{13}$/, { message: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' })
  citizenId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
