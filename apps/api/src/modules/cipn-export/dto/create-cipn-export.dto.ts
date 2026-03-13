import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCipnExportDto {
  @ApiProperty({
    description: 'รายการ PatientVisit IDs (IPD admissions) ที่จะ export',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'ต้องเลือกอย่างน้อย 1 admission' })
  @IsInt({ each: true })
  visitIds: number[];
}
