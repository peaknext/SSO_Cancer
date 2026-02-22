import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullNameThai?: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'EDITOR', 'VIEWER'] })
  @IsOptional()
  @IsIn(['ADMIN', 'EDITOR', 'VIEWER'])
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
