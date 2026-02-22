import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkStageDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  stageId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
