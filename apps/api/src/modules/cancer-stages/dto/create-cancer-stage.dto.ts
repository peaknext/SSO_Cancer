import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCancerStageDto {
  @ApiProperty({ example: 'STAGE_IIIC' })
  @IsString()
  @MaxLength(30)
  stageCode: string;

  @ApiProperty({ example: 'ระยะที่ 3C' })
  @IsString()
  @MaxLength(200)
  nameThai: string;

  @ApiProperty({ example: 'Stage IIIC' })
  @IsString()
  @MaxLength(200)
  nameEnglish: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  stageGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
