import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignVisitCaseDto {
  @ApiProperty({ description: 'Case ID to assign to this visit' })
  @IsInt()
  caseId: number;
}
