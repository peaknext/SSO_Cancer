import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProtocolDto {
  @ApiProperty({ example: 'C2401' })
  @IsString()
  protocolCode: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  cancerSiteId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameThai?: string;

  @ApiProperty()
  @IsString()
  nameEnglish: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  protocolType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatmentIntent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  stageIds?: number[];
}
