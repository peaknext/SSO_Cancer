import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppSettingsService } from './app-settings.service';
import { UpdateAppSettingDto } from './dto/update-app-setting.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('App Settings')
@ApiBearerAuth()
@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all settings grouped by category' })
  async findAll() {
    return this.appSettingsService.findAll();
  }

  @Patch(':key')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update setting value' })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateAppSettingDto,
  ) {
    return this.appSettingsService.update(key, dto);
  }
}
