import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Allowed sortBy field names — prevents arbitrary column access
const ALLOWED_SORT_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'fullName',
  'siteCode',
  'stageCode',
  'protocolCode',
  'regimenCode',
  'genericName',
  'drugCode',
  'tradeName',
  'sortOrder',
  'settingKey',
  'visitDate',
  'regimenName',
  'nameThai',
  'nameEnglish',
  'protocolType',
  'regimenType',
  'drugCategory',
  'isActive',
  'role',
  'lastLoginAt',
  'hn',
  'vn',
];

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @ApiPropertyOptional({ enum: ALLOWED_SORT_FIELDS, default: 'id' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-zA-Z_]+$/, {
    message: 'sortBy must contain only letters and underscores',
  })
  @IsIn(ALLOWED_SORT_FIELDS, {
    message: `sortBy must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`,
  })
  sortBy?: string = 'id';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
