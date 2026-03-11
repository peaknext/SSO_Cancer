import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { HisIntegrationService } from './his-integration.service';
import { HisApiClient } from './his-api.client';
import { CANCER_ICD10_PREFIXES } from './types/his-api.types';

interface ScanFilterConfig {
  cancerDiag: boolean;
  z510: boolean;
  z511: boolean;
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

    const filterConfig = await this.loadFilterConfig();
    const icdPrefixes = this.buildIcdPrefixes(filterConfig);

    this.logger.log(
      `[NightlyScan] Starting scan for ${yesterday} with ICD prefixes: [${icdPrefixes.join(', ')}]`,
    );
    const startTime = Date.now();

    // Create scan log entry
    const scanLog = await this.prisma.nightlyScanLog.create({
      data: {
        scanDate: yesterday,
        startedAt: new Date(),
        status: 'running',
        filterConfig: JSON.stringify(filterConfig),
      },
    });

    let totalScanned = 0;
    let newPatients = 0;
    let newVisits = 0;
    let skipped = 0;
    let errors = 0;

    try {
      const patients = await this.hisClient.advancedSearchPatients({
        from: yesterday,
        to: yesterday,
        icdPrefixes,
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
            const isNew = result.skippedDuplicate === 0;
            if (isNew) newPatients++;

            await this.prisma.nightlyScanDetail.create({
              data: {
                scanLogId: scanLog.id,
                hn: patient.hn,
                patientName: patient.fullName || null,
                status: 'imported',
                importedVisits: result.importedVisits,
                skippedVisits: result.skippedDuplicate || 0,
              },
            });
          } else {
            skipped++;
            await this.prisma.nightlyScanDetail.create({
              data: {
                scanLogId: scanLog.id,
                hn: patient.hn,
                patientName: patient.fullName || null,
                status: 'skipped',
                skippedVisits: result.skippedDuplicate || 0,
              },
            });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`[NightlyScan] Failed for HN ${patient.hn}: ${msg}`);
          errors++;

          await this.prisma.nightlyScanDetail.create({
            data: {
              scanLogId: scanLog.id,
              hn: patient.hn,
              patientName: patient.fullName || null,
              status: 'error',
              errorMessage: msg.substring(0, 2000),
            },
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[NightlyScan] Fatal error: ${msg}`);

      await this.prisma.nightlyScanLog.update({
        where: { id: scanLog.id },
        data: {
          status: 'error',
          finishedAt: new Date(),
          durationMs: Date.now() - startTime,
          totalScanned,
          errorMessage: msg.substring(0, 5000),
        },
      });

      await this.saveResultToAppSetting({
        date: yesterday,
        startedAt: scanLog.startedAt.toISOString(),
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

    // Update scan log with final results
    const finishedAt = new Date();
    await this.prisma.nightlyScanLog.update({
      where: { id: scanLog.id },
      data: {
        status: 'success',
        finishedAt,
        durationMs: Date.now() - startTime,
        totalScanned,
        newPatients,
        newVisits,
        skipped,
        errors,
      },
    });

    // Backward compat: also update app_settings
    await this.saveResultToAppSetting({
      date: yesterday,
      startedAt: scanLog.startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      status: 'success',
      totalScanned,
      newPatients,
      newVisits,
      skipped,
      errors,
    });

    this.logger.log(
      `[NightlyScan] Done: ${newPatients} new patients, ${newVisits} new visits, ${errors} errors (${Date.now() - startTime}ms)`,
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

  private async loadFilterConfig(): Promise<ScanFilterConfig> {
    try {
      const settings = await this.prisma.appSetting.findMany({
        where: {
          settingKey: {
            in: ['his_scan_filter_cancer_diag', 'his_scan_filter_z510', 'his_scan_filter_z511'],
          },
        },
      });
      const map = new Map(settings.map((s) => [s.settingKey, s.settingValue]));
      return {
        cancerDiag: map.get('his_scan_filter_cancer_diag') === 'true',
        z510: map.get('his_scan_filter_z510') === 'true',
        z511: map.get('his_scan_filter_z511') === 'true',
      };
    } catch {
      return { cancerDiag: true, z510: false, z511: false };
    }
  }

  private buildIcdPrefixes(config: ScanFilterConfig): string[] {
    const prefixes: string[] = [];
    if (config.cancerDiag) {
      prefixes.push('C', 'D0');
    }
    if (config.z510) {
      prefixes.push('Z510');
    }
    if (config.z511) {
      prefixes.push('Z511');
    }
    // Fallback: if nothing is selected, use default cancer prefixes
    if (prefixes.length === 0) {
      return [...CANCER_ICD10_PREFIXES];
    }
    return prefixes;
  }

  private async saveResultToAppSetting(result: Record<string, unknown>): Promise<void> {
    try {
      await this.prisma.appSetting.updateMany({
        where: { settingKey: 'his_nightly_scan_last_result' },
        data: { settingValue: JSON.stringify(result) },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[NightlyScan] Failed to save result to app_settings: ${msg}`);
    }
  }
}
