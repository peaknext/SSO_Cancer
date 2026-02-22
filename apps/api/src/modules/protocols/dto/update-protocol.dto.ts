import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProtocolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameThai?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEnglish?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
