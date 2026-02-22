import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCancerStageDto {
  @ApiProperty({ example: 'STAGE_IIIC' })
  @IsString()
  stageCode: string;

  @ApiProperty({ example: 'ระยะที่ 3C' })
  @IsString()
  nameThai: string;

  @ApiProperty({ example: 'Stage IIIC' })
  @IsString()
  nameEnglish: string;

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
}
