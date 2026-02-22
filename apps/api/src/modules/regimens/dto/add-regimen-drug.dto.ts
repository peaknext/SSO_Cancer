import { IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddRegimenDrugDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  drugId: number;

  @ApiPropertyOptional({ example: '175 mg/m²' })
  @IsOptional()
  @IsString()
  dosePerCycle?: string;

  @ApiPropertyOptional({ example: 'IV' })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ example: 'D1' })
  @IsOptional()
  @IsString()
  daySchedule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
