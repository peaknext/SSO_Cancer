import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmProtocolDto {
  @ApiPropertyOptional({
    description: 'Protocol ID to confirm for this visit. Omit or set null for non-protocol treatment.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  protocolId?: number;

  @ApiPropertyOptional({ description: 'Matched regimen ID (optional for non-drug protocols)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  regimenId?: number;
}
