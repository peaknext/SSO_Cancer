import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HisApiResponse,
  HisPatientSearchResult,
  HisPatientData,
} from './types/his-api.types';

interface HisSettings {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

@Injectable()
export class HisApiClient {
  private readonly logger = new Logger(HisApiClient.name);
  private settingsCache: HisSettings | null = null;
  private settingsCacheTime = 0;
  private static readonly CACHE_TTL_MS = 60_000; // 60s

  constructor(private readonly prisma: PrismaService) {}

  private async getSettings(): Promise<HisSettings> {
    const now = Date.now();
    if (this.settingsCache && now - this.settingsCacheTime < HisApiClient.CACHE_TTL_MS) {
      return this.settingsCache;
    }

    const rows = await this.prisma.appSetting.findMany({
      where: {
        settingKey: { in: ['his_api_base_url', 'his_api_key', 'his_api_timeout'] },
        isActive: true,
      },
    });

    const map = new Map(rows.map((r) => [r.settingKey, r.settingValue]));

    this.settingsCache = {
      baseUrl: (map.get('his_api_base_url') || '').replace(/\/+$/, ''),
      apiKey: map.get('his_api_key') || '',
      timeout: parseInt(map.get('his_api_timeout') || '30000', 10),
    };
    this.settingsCacheTime = now;

    return this.settingsCache;
  }

  /** Check if HIS API is configured */
  async isConfigured(): Promise<boolean> {
    const settings = await this.getSettings();
    return !!settings.baseUrl;
  }

  /** Call HIS API with retry on timeout/5xx */
  private async callApi<T>(path: string, retries = 1): Promise<T> {
    const settings = await this.getSettings();

    if (!settings.baseUrl) {
      throw new Error('HIS API ยังไม่ได้ตั้งค่า — กรุณาตั้งค่า his_api_base_url ในหน้า Settings');
    }

    const url = `${settings.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = settings.apiKey.startsWith('Bearer ')
        ? settings.apiKey
        : `Bearer ${settings.apiKey}`;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), settings.timeout);

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          let parsed: any;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = null;
          }

          const errorMsg = parsed?.error?.message || `HIS API error: ${response.status} ${response.statusText}`;

          // Retry on 5xx
          if (response.status >= 500 && attempt < retries) {
            this.logger.warn(`HIS API 5xx (attempt ${attempt + 1}/${retries + 1}): ${url}`);
            continue;
          }

          throw new Error(errorMsg);
        }

        const json: HisApiResponse<T> = await response.json();

        if (!json.success) {
          throw new Error(json.error?.message || 'HIS API returned success=false');
        }

        return json.data;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          if (attempt < retries) {
            this.logger.warn(`HIS API timeout (attempt ${attempt + 1}/${retries + 1}): ${url}`);
            continue;
          }
          throw new Error(`HIS API timeout หลัง ${settings.timeout}ms — กรุณาลองใหม่อีกครั้ง`);
        }

        // Network errors: retry
        if (err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOTFOUND') {
          if (attempt < retries) {
            this.logger.warn(`HIS API network error (attempt ${attempt + 1}/${retries + 1}): ${err.message}`);
            continue;
          }
          throw new Error(`ไม่สามารถเชื่อมต่อ HIS API ได้ — ${err.message}`);
        }

        throw err;
      }
    }

    throw new Error('HIS API: exhausted retries');
  }

  /** Call HIS API with POST body + retry on timeout/5xx */
  private async callApiPost<T>(path: string, body: unknown, retries = 1): Promise<T> {
    const settings = await this.getSettings();

    if (!settings.baseUrl) {
      throw new Error('HIS API ยังไม่ได้ตั้งค่า — กรุณาตั้งค่า his_api_base_url ในหน้า Settings');
    }

    const url = `${settings.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = settings.apiKey.startsWith('Bearer ')
        ? settings.apiKey
        : `Bearer ${settings.apiKey}`;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), settings.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }

          const errorMsg =
            parsed?.error?.message || `HIS API error: ${response.status} ${response.statusText}`;

          if (response.status >= 500 && attempt < retries) {
            this.logger.warn(`HIS API 5xx (attempt ${attempt + 1}/${retries + 1}): ${url}`);
            continue;
          }

          throw new Error(errorMsg);
        }

        const json: HisApiResponse<T> = await response.json();

        if (!json.success) {
          throw new Error(json.error?.message || 'HIS API returned success=false');
        }

        return json.data;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          if (attempt < retries) {
            this.logger.warn(`HIS API timeout (attempt ${attempt + 1}/${retries + 1}): ${url}`);
            continue;
          }
          throw new Error(`HIS API timeout หลัง ${settings.timeout}ms — กรุณาลองใหม่อีกครั้ง`);
        }

        if (err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOTFOUND') {
          if (attempt < retries) {
            this.logger.warn(
              `HIS API network error (attempt ${attempt + 1}/${retries + 1}): ${err.message}`,
            );
            continue;
          }
          throw new Error(`ไม่สามารถเชื่อมต่อ HIS API ได้ — ${err.message}`);
        }

        throw err;
      }
    }

    throw new Error('HIS API: exhausted retries');
  }

  /** Advanced search: find patients by clinical criteria */
  async advancedSearchPatients(body: {
    from: string;
    to: string;
    icdPrefixes?: string[];
    secondaryDiagnosisCodes?: string[];
    drugKeywords?: string[];
  }): Promise<HisPatientSearchResult[]> {
    return this.callApiPost<HisPatientSearchResult[]>('/patients/search/advanced', body);
  }

  /** Search patients from HIS */
  async searchPatient(query: string, type?: string): Promise<HisPatientSearchResult[]> {
    const params = new URLSearchParams({ q: query });
    if (type) params.set('type', type);
    return this.callApi<HisPatientSearchResult[]>(`/patients/search?${params}`);
  }

  /** Fetch full visit data for a patient */
  async fetchVisitData(hn: string, from?: string, to?: string): Promise<HisPatientData> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return this.callApi<HisPatientData>(`/patients/${encodeURIComponent(hn)}/visits${qs ? '?' + qs : ''}`);
  }

  /** Health check — test connectivity */
  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      const settings = await this.getSettings();
      if (!settings.baseUrl) {
        return { ok: false, message: 'HIS API URL ยังไม่ได้ตั้งค่า' };
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (settings.apiKey) {
        headers['Authorization'] = settings.apiKey.startsWith('Bearer ')
          ? settings.apiKey
          : `Bearer ${settings.apiKey}`;
      }

      const response = await fetch(`${settings.baseUrl}/health`, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.ok) {
        return { ok: true, message: `เชื่อมต่อสำเร็จ (${response.status})` };
      }
      return { ok: false, message: `HIS API ตอบ ${response.status} ${response.statusText}` };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { ok: false, message: 'HIS API timeout (5s)' };
      }
      return { ok: false, message: `ไม่สามารถเชื่อมต่อ: ${err.message}` };
    }
  }
}
