import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCancerStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameThai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEnglish?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stageGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
