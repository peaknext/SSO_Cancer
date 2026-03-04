import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncVisitDto {
  @ApiProperty({ description: 'VN ของ visit ที่ต้องการซิงค์ข้อมูลจาก HIS' })
  @IsString()
  vn: string;
}
