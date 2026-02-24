import { IsString, MaxLength, IsOptional, IsInt, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCaseDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  protocolId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  caseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
