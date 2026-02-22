import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppSettingDto {
  @ApiProperty()
  @IsString()
  settingValue: string;
}
