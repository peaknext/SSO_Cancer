import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportPatientDto {
  @ApiPropertyOptional({ description: 'วันเริ่มต้น (YYYY-MM-DD)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'วันสิ้นสุด (YYYY-MM-DD)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
