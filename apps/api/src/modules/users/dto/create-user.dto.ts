import {
  IsEmail,
  IsString,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@sso-cancer.local' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Dr. John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName: string;

  @ApiPropertyOptional({ example: 'นพ. จอห์น โด' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullNameThai?: string;

  @ApiProperty({ enum: ['ADMIN', 'EDITOR', 'VIEWER'], example: 'EDITOR' })
  @IsIn(['ADMIN', 'EDITOR', 'VIEWER'])
  role: string;

  @ApiPropertyOptional({ example: 'Oncology' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional({ example: 'Oncologist' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  position?: string;

  @ApiPropertyOptional({ example: '0812345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}
