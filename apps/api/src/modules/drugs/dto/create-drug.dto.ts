import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDrugDto {
  @ApiProperty({ example: 'Carboplatin' })
  @IsString()
  genericName: string;

  @ApiPropertyOptional({ example: 'Alkylating Agent' })
  @IsOptional()
  @IsString()
  drugCategory?: string;
}
