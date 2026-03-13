import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAppSettingDto } from './dto/update-app-setting.dto';
import { encryptValue } from '../../common/utils/crypto.util';

// Keys whose values must be masked in GET responses
const SENSITIVE_KEYS = new Set([
  'ai_gemini_api_key',
  'ai_claude_api_key',
  'ai_openai_api_key',
  'ai_ollama_api_key',
  'his_api_key',
  'his_db_password',
]);

function maskValue(value: string): string {
  if (!value || value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.appSetting.findMany({
      where: { isActive: true },
      orderBy: [{ settingGroup: 'asc' }, { settingKey: 'asc' }],
    });

    // Mask sensitive values before returning
    const masked = settings.map((s) =>
      SENSITIVE_KEYS.has(s.settingKey)
        ? { ...s, settingValue: maskValue(s.settingValue) }
        : s,
    );

    const grouped: Record<string, typeof settings> = {};
    for (const setting of masked) {
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

    const updated = await this.prisma.appSetting.update({
      where: { settingKey: key },
      data: { settingValue: SENSITIVE_KEYS.has(key) ? encryptValue(dto.settingValue) : dto.settingValue },
    });

    // C-02 fix: Mask sensitive values in PATCH response
    if (SENSITIVE_KEYS.has(key)) {
      return { ...updated, settingValue: maskValue(updated.settingValue) };
    }
    return updated;
  }
}
