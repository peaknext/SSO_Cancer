import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppSettingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  settingValue: string;
}
