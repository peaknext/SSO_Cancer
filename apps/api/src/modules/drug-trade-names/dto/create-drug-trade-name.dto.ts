import { IsString, IsOptional, IsInt, IsNumber, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDrugTradeNameDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  drugId: number;

  @ApiProperty({ example: 'C0199' })
  @IsString()
  @MaxLength(10)
  drugCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tradeName?: string;

  @ApiProperty({ example: 'Injection' })
  @IsString()
  @MaxLength(200)
  dosageForm: string;

  @ApiProperty({ example: '150 mg' })
  @IsString()
  @MaxLength(200)
  strength: string;

  @ApiPropertyOptional({ example: 'vial' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ example: 1500.00 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitPrice?: number;
}
