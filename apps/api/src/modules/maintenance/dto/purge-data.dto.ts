import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Allowlist of valid table names for VACUUM/REINDEX (same as backup-restore)
export const VALID_TABLE_NAMES = new Set([
  'drugs',
  'cancer_sites',
  'cancer_stages',
  'hospitals',
  'users',
  'drug_trade_names',
  'protocol_names',
  'regimens',
  'icd10_cancer_site_map',
  'protocol_regimens',
  'regimen_drugs',
  'protocol_stages',
  'cancer_site_stages',
  'sso_aipn_items',
  'sso_protocol_drugs',
  'app_settings',
  'patients',
  'patient_imports',
  'patient_cases',
  'patient_visits',
  'visit_medications',
  'visit_billing_items',
  'ai_suggestions',
  'visit_billing_claims',
  'billing_export_batches',
  'password_history',
  'audit_logs',
  'sessions',
  'nightly_scan_logs',
  'nightly_scan_details',
]);

export class PurgeDto {
  @ApiProperty({ description: 'Retention period in days', minimum: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3650)
  retentionDays: number;
}

export class PurgeExportFilesDto {
  @ApiProperty({ description: 'Retention period in days', minimum: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(90)
  @Max(3650)
  retentionDays: number;
}

export class VacuumDto {
  @ApiPropertyOptional({ description: 'Table name (omit for all tables)' })
  @IsOptional()
  @IsString()
  table?: string;
}

export class ReindexDto {
  @ApiProperty({ description: 'Table name to reindex' })
  @IsString()
  table: string;
}

export class CancelQueryDto {
  @ApiProperty({ description: 'PostgreSQL backend PID to cancel' })
  @Type(() => Number)
  @IsInt()
  pid: number;
}
