import { IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BulkDeleteVisitsDto {
  @ApiPropertyOptional({ description: 'Delete visits from this date (YYYY-MM-DD)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Delete visits up to this date (YYYY-MM-DD)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Only non-cancer visits (primaryDiagnosis not C/D0)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  nonCancerOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only visits with no medications AND no billing items' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  noMedsOrBilling?: boolean;
}
