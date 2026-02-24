import {
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBillingClaimDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  roundNumber?: number;

  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  decidedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
