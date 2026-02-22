import { IsInt, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkRegimenDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  regimenId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lineOfTherapy?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
