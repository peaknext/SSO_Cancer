import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDrugDto {
  @ApiProperty({ example: 'Carboplatin' })
  @IsString()
  @MaxLength(200)
  genericName: string;

  @ApiPropertyOptional({ example: 'Alkylating Agent' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  drugCategory?: string;
}
