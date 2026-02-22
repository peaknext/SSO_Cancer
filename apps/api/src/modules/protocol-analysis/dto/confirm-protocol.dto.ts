import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmProtocolDto {
  @ApiProperty({ description: 'Protocol ID to confirm for this visit' })
  @Type(() => Number)
  @IsInt()
  protocolId: number;

  @ApiPropertyOptional({ description: 'Matched regimen ID (optional for non-drug protocols)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  regimenId?: number;
}
