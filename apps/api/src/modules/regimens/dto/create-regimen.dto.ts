import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegimenDto {
  @ApiProperty({ example: 'CARBO_TAX' })
  @IsString()
  regimenCode: string;

  @ApiProperty({ example: 'Carboplatin + Paclitaxel' })
  @IsString()
  regimenName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cycleDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxCycles?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regimenType?: string;
}
