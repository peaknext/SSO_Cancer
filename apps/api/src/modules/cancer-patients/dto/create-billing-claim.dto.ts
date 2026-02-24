import {
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBillingClaimDto {
  @ApiProperty({ example: 1, description: 'เรียกเก็บครั้งที่' })
  @IsInt()
  @Min(1)
  roundNumber: number;

  @ApiPropertyOptional({
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  })
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @ApiPropertyOptional({ description: 'เหตุผลที่ไม่ผ่าน' })
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
