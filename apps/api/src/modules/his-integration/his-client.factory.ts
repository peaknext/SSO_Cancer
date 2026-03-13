import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IHisClient } from './his-client.interface';
import { HisApiClient } from './his-api.client';
import { HisDbClient } from './his-db.client';
import {
  HisPatientSearchResult,
  HisPatientData,
  HisAdmissionData,
} from './types/his-api.types';

type ConnectionMode = 'api' | 'direct_db';

/**
 * Runtime-switching delegate: reads `his_connection_mode` from AppSetting
 * and forwards all calls to either HisApiClient or HisDbClient.
 * Cached for 60s — switch mode from Settings UI without restart.
 */
@Injectable()
export class HisClientDelegate implements IHisClient {
  private readonly logger = new Logger(HisClientDelegate.name);
  private modeCache: ConnectionMode | null = null;
  private modeCacheTime = 0;
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiClient: HisApiClient,
    private readonly dbClient: HisDbClient,
  ) {}

  private async getMode(): Promise<ConnectionMode> {
    const now = Date.now();
    if (this.modeCache && now - this.modeCacheTime < HisClientDelegate.CACHE_TTL_MS) {
      return this.modeCache;
    }

    const setting = await this.prisma.appSetting.findUnique({
      where: { settingKey: 'his_connection_mode' },
    });

    const mode = setting?.settingValue === 'direct_db' ? 'direct_db' : 'api';
    this.modeCache = mode;
    this.modeCacheTime = now;

    return mode;
  }

  private async getActiveClient(): Promise<IHisClient> {
    const mode = await this.getMode();
    return mode === 'direct_db' ? this.dbClient : this.apiClient;
  }

  async isConfigured(): Promise<boolean> {
    return (await this.getActiveClient()).isConfigured();
  }

  async searchPatient(query: string, type?: string): Promise<HisPatientSearchResult[]> {
    return (await this.getActiveClient()).searchPatient(query, type);
  }

  async fetchPatientWithVisits(
    query: string,
    type: 'hn' | 'citizen_id',
    from?: string,
    to?: string,
  ): Promise<HisPatientData> {
    return (await this.getActiveClient()).fetchPatientWithVisits(query, type, from, to);
  }

  async fetchPatientWithAdmissions(
    query: string,
    type: 'hn' | 'citizen_id',
    from?: string,
    to?: string,
  ): Promise<HisAdmissionData> {
    return (await this.getActiveClient()).fetchPatientWithAdmissions(query, type, from, to);
  }

  async advancedSearchPatients(body: {
    from: string;
    to: string;
    icdPrefixes?: string[];
    secondaryDiagnosisCodes?: string[];
    drugKeywords?: string[];
  }): Promise<HisPatientSearchResult[]> {
    return (await this.getActiveClient()).advancedSearchPatients(body);
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    const mode = await this.getMode();
    const result = await (await this.getActiveClient()).healthCheck();
    return {
      ...result,
      message: `[${mode}] ${result.message}`,
    };
  }

  async batchLookupPttype(
    vns: string[],
  ): Promise<Map<string, { pttype: string; pttypeName: string }>> {
    const client = await this.getActiveClient();
    if (!client.batchLookupPttype) return new Map();
    return client.batchLookupPttype(vns);
  }

  async batchLookupPttypeByAn(
    ans: string[],
  ): Promise<Map<string, { pttype: string; pttypeName: string }>> {
    const client = await this.getActiveClient();
    if (!client.batchLookupPttypeByAn) return new Map();
    return client.batchLookupPttypeByAn(ans);
  }
}
