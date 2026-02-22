import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCancerSiteDto {
  @ApiProperty({ example: '24' })
  @IsString()
  @MaxLength(5)
  siteCode: string;

  @ApiProperty({ example: 'มะเร็งตับอ่อน' })
  @IsString()
  @MaxLength(300)
  nameThai: string;

  @ApiProperty({ example: 'Pancreatic Cancer' })
  @IsString()
  @MaxLength(300)
  nameEnglish: string;

  @ApiPropertyOptional({ example: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
