import { IsString, IsOptional, IsInt, IsArray, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProtocolDto {
  @ApiProperty({ example: 'C2401' })
  @IsString()
  @MaxLength(10)
  protocolCode: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  cancerSiteId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameThai?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  nameEnglish: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  protocolType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  treatmentIntent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  stageIds?: number[];
}
