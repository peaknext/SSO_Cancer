import { IsString, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BatchSyncDto {
  @IsString()
  hn: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  vns: string[];
}
