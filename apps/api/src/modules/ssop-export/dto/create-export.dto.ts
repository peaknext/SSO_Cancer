import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExportDto {
  @ApiProperty({
    description: 'รายการ PatientVisit IDs ที่จะ export',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'ต้องเลือกอย่างน้อย 1 visit' })
  @IsInt({ each: true })
  visitIds: number[];
}
