import {
  IsEmail,
  IsString,
  IsOptional,
  IsIn,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@sso-cancer.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Dr. John Doe' })
  @IsString()
  @MinLength(1)
  fullName: string;

  @ApiPropertyOptional({ example: 'นพ. จอห์น โด' })
  @IsOptional()
  @IsString()
  fullNameThai?: string;

  @ApiProperty({ enum: ['ADMIN', 'EDITOR', 'VIEWER'], example: 'EDITOR' })
  @IsIn(['ADMIN', 'EDITOR', 'VIEWER'])
  role: string;

  @ApiPropertyOptional({ example: 'Oncology' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'Oncologist' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: '0812345678' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
