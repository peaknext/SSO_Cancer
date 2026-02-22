import { IsInt, IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
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
  @MaxLength(100)
  dosePerCycle?: string;

  @ApiPropertyOptional({ example: 'IV' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  route?: string;

  @ApiPropertyOptional({ example: 'D1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  daySchedule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
