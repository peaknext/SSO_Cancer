import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportSingleVisitDto {
  @ApiProperty({ description: 'VN ของ visit ที่ต้องการนำเข้า' })
  @IsString()
  vn: string;

  @ApiPropertyOptional({
    description: 'บังคับนำเข้าแม้ข้อมูลไม่สมบูรณ์',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceIncomplete?: boolean;
}
