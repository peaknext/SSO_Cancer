import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { HisIntegrationService } from './his-integration.service';
import { HisApiClient } from './his-api.client';
import { CANCER_ICD10_PREFIXES } from './types/his-api.types';

interface NightlyScanResult {
  date: string;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'error';
  totalScanned: number;
  newPatients: number;
  newVisits: number;
  skipped: number;
  errors: number;
  error?: string;
}

@Injectable()
export class HisNightlyScanService {
  private readonly logger = new Logger(HisNightlyScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hisService: HisIntegrationService,
    private readonly hisClient: HisApiClient,
  ) {}

  @Cron('0 1 * * *', { timeZone: 'Asia/Bangkok' })
  async runNightlyScan(): Promise<void> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      this.logger.debug('[NightlyScan] Disabled — skipping');
      return;
    }

    // Yesterday in Bangkok TZ (YYYY-MM-DD)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Bangkok',
    });

    this.logger.log(`[NightlyScan] Starting scan for ${yesterday}`);
    const startedAt = new Date().toISOString();

    let totalScanned = 0;
    let newPatients = 0;
    let newVisits = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const patients = await this.hisClient.advancedSearchPatients({
        from: yesterday,
        to: yesterday,
        icdPrefixes: CANCER_ICD10_PREFIXES,
      });

      totalScanned = patients.length;
      this.logger.log(`[NightlyScan] Found ${totalScanned} patients from HIS`);

      for (const patient of patients) {
        try {
          const result = await this.hisService.importPatient(
            patient.hn,
            null,
            yesterday,
            yesterday,
          );
          if (result.importedVisits > 0) {
            newVisits += result.importedVisits;
            if (result.skippedDuplicate === 0) newPatients++;
          } else {
            skipped++;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`[NightlyScan] Failed for HN ${patient.hn}: ${msg}`);
          errors++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[NightlyScan] Fatal error: ${msg}`);
      await this.saveResult({
        date: yesterday,
        startedAt,
        status: 'error',
        error: msg,
        totalScanned,
        newPatients: 0,
        newVisits: 0,
        skipped: 0,
        errors: 1,
      });
      return;
    }

    const result: NightlyScanResult = {
      date: yesterday,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'success',
      totalScanned,
      newPatients,
      newVisits,
      skipped,
      errors,
    };
    await this.saveResult(result);
    this.logger.log(
      `[NightlyScan] Done: ${newPatients} new patients, ${newVisits} new visits, ${errors} errors`,
    );
  }

  private async isEnabled(): Promise<boolean> {
    try {
      const setting = await this.prisma.appSetting.findUnique({
        where: { settingKey: 'his_nightly_scan_enabled' },
      });
      return setting?.settingValue === 'true';
    } catch {
      return false;
    }
  }

  private async saveResult(result: NightlyScanResult): Promise<void> {
    try {
      await this.prisma.appSetting.updateMany({
        where: { settingKey: 'his_nightly_scan_last_result' },
        data: { settingValue: JSON.stringify(result) },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[NightlyScan] Failed to save result: ${msg}`);
    }
  }
}
