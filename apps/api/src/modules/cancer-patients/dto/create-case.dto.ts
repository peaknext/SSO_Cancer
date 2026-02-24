import { IsString, MaxLength, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCaseDto {
  @ApiProperty({
    example: 'C2024-001',
    description: 'เลขที่เคส (เจ้าหน้าที่กำหนดเอง)',
  })
  @IsString()
  @MaxLength(50)
  caseNumber: string;

  @ApiPropertyOptional({ description: 'Protocol ID' })
  @IsOptional()
  @IsInt()
  protocolId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
