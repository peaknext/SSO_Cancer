import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HisApiResponse,
  HisPatientSearchResult,
  HisPatientData,
} from './types/his-api.types';
import { decryptValue } from '../../common/utils/crypto.util';

// Hospital HIS APIs commonly use self-signed or incomplete-chain SSL certificates.
// Use undici's own fetch + Agent to bypass SSL verification for HIS connections only.
// IMPORTANT: Must use fetch from the same undici package as Agent — Node.js 20 bundles
// undici v5 internally, but we use undici v7 from npm. Mixing versions causes "fetch failed".
import { fetch as undiciFetch, Agent as UndiciAgent } from 'undici';
const hisHttpsAgent = new UndiciAgent({ connect: { rejectUnauthorized: false } });

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

    const rawApiKey = map.get('his_api_key') || '';
    this.settingsCache = {
      baseUrl: (map.get('his_api_base_url') || '').replace(/\/+$/, ''),
      apiKey: rawApiKey ? decryptValue(rawApiKey) : '',
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

        const response = await undiciFetch(url, {
          headers,
          signal: controller.signal,
          dispatcher: hisHttpsAgent,
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

        const json: HisApiResponse<T> = await response.json() as HisApiResponse<T>;

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

        // Network errors: retry (check both err.cause and err.code)
        const errCode = err.cause?.code || err.code;
        if (errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND' || errCode === 'UND_ERR_CONNECT_TIMEOUT') {
          if (attempt < retries) {
            this.logger.warn(`HIS API network error (attempt ${attempt + 1}/${retries + 1}): ${err.message}`);
            continue;
          }
          throw new Error(`ไม่สามารถเชื่อมต่อ HIS API ได้ — ${err.message}`);
        }

        // Log full error detail for debugging
        this.logger.error(`HIS API call failed: ${url}`, err.message);
        if (err.cause) this.logger.error(`  cause: ${err.cause?.message || err.cause?.code || JSON.stringify(err.cause)}`);

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

        const response = await undiciFetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
          dispatcher: hisHttpsAgent,
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

        const json: HisApiResponse<T> = await response.json() as HisApiResponse<T>;

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

        const errCode = err.cause?.code || err.code;
        if (errCode === 'ECONNREFUSED' || errCode === 'ENOTFOUND' || errCode === 'UND_ERR_CONNECT_TIMEOUT') {
          if (attempt < retries) {
            this.logger.warn(
              `HIS API network error (attempt ${attempt + 1}/${retries + 1}): ${err.message}`,
            );
            continue;
          }
          throw new Error(`ไม่สามารถเชื่อมต่อ HIS API ได้ — ${err.message}`);
        }

        this.logger.error(`HIS API POST failed: ${url}`, err.message);
        if (err.cause) this.logger.error(`  cause: ${err.cause?.message || err.cause?.code || JSON.stringify(err.cause)}`);

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
    // HIS team implemented: GET /api/patient?hn={hn} or GET /api/patient?cid={citizenId}
    const params = new URLSearchParams();
    if (type === 'citizen_id') {
      params.set('cid', query);
    } else {
      params.set('hn', query);
    }
    try {
      // HIS may return a single object or an array — normalize to array
      const result = await this.callApi<HisPatientSearchResult | HisPatientSearchResult[]>(
        `/patient?${params}`,
      );
      return Array.isArray(result) ? result : [result];
    } catch (err: any) {
      // HIS API returns 404 when patient not found — return empty array
      if (err.message?.includes('404') || err.message?.includes('ไม่พบ') || err.message?.includes('NOT_FOUND')) {
        return [];
      }
      throw err;
    }
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

      const response = await undiciFetch(`${settings.baseUrl}/health`, {
        headers,
        signal: controller.signal,
        dispatcher: hisHttpsAgent,
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
