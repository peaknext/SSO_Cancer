import { IsArray, IsString, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BatchTopMatchDto {
  @ApiProperty({
    description: 'Array of VN strings to match (max 20)',
    example: ['6801000001', '6801000002'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  vns: string[];
}
