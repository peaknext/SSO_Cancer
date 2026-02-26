import { IsDateString, IsArray, IsOptional, IsString, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdvancedSearchDto {
  @ApiProperty({ description: 'วันเริ่มต้น (YYYY-MM-DD)', example: '2026-02-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ description: 'วันสิ้นสุด (YYYY-MM-DD)', example: '2026-02-27' })
  @IsDateString()
  to: string;

  @ApiPropertyOptional({
    description: 'Cancer site IDs — แต่ละ ID แปลงเป็น ICD-10 prefixes แล้วรวมกัน',
    example: ['1', '2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(25)
  cancerSiteIds?: string[];

  @ApiPropertyOptional({
    description: 'Secondary diagnosis ICD-10 codes',
    example: ['Z510', 'Z511'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  secondaryDiagCodes?: string[];

  @ApiPropertyOptional({
    description: 'Drug generic name keywords',
    example: ['paclitaxel', 'cisplatin'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(150)
  drugNames?: string[];
}
