import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCancerSiteDto {
  @ApiProperty({ example: '24' })
  @IsString()
  siteCode: string;

  @ApiProperty({ example: 'มะเร็งตับอ่อน' })
  @IsString()
  nameThai: string;

  @ApiProperty({ example: 'Pancreatic Cancer' })
  @IsString()
  nameEnglish: string;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
