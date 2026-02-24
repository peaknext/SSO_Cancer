import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegimenDrugDto {
  @ApiProperty({ description: 'Drug ID' })
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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateRegimenDto {
  @ApiProperty({ example: 'CARBO_TAX' })
  @IsString()
  @MaxLength(200)
  regimenCode: string;

  @ApiProperty({ example: 'Carboplatin + Paclitaxel' })
  @IsString()
  @MaxLength(200)
  regimenName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
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
  @MaxLength(50)
  regimenType?: string;

  @ApiPropertyOptional({
    description: 'Drugs to add to this regimen',
    type: [CreateRegimenDrugDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRegimenDrugDto)
  drugs?: CreateRegimenDrugDto[];
}
