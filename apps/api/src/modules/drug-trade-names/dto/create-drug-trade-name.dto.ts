import { IsString, IsOptional, IsInt, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDrugTradeNameDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  drugId: number;

  @ApiProperty({ example: 'C0199' })
  @IsString()
  drugCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiProperty({ example: 'Injection' })
  @IsString()
  dosageForm: string;

  @ApiProperty({ example: '150 mg' })
  @IsString()
  strength: string;

  @ApiPropertyOptional({ example: 'vial' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 1500.00 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitPrice?: number;
}
