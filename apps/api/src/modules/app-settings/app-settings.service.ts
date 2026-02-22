import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAppSettingDto } from './dto/update-app-setting.dto';

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.appSetting.findMany({
      where: { isActive: true },
      orderBy: [{ settingGroup: 'asc' }, { settingKey: 'asc' }],
    });

    const grouped: Record<string, typeof settings> = {};
    for (const setting of settings) {
      const group = setting.settingGroup || 'general';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(setting);
    }

    return grouped;
  }

  async update(key: string, dto: UpdateAppSettingDto) {
    const setting = await this.prisma.appSetting.findUnique({
      where: { settingKey: key },
    });
    if (!setting) throw new NotFoundException('SETTING_NOT_FOUND');

    return this.prisma.appSetting.update({
      where: { settingKey: key },
      data: { settingValue: dto.settingValue },
    });
  }
}
