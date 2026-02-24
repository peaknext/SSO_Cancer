import { IsString, IsArray, IsInt, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateFormularyDto {
  @ApiProperty({ description: 'Protocol code (e.g., C0111)' })
  @IsString()
  @MaxLength(10)
  protocolCode: string;

  @ApiProperty({
    description: 'Array of AIPN drug codes to validate',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  aipnCodes: number[];
}
