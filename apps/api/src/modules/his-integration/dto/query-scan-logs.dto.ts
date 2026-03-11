import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryScanLogsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['success', 'error', 'running'] })
  @IsOptional()
  @IsString()
  @IsIn(['success', 'error', 'running'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
