import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CancerSitesModule } from './modules/cancer-sites/cancer-sites.module';
import { CancerStagesModule } from './modules/cancer-stages/cancer-stages.module';
import { ProtocolsModule } from './modules/protocols/protocols.module';
import { RegimensModule } from './modules/regimens/regimens.module';
import { DrugsModule } from './modules/drugs/drugs.module';
import { DrugTradeNamesModule } from './modules/drug-trade-names/drug-trade-names.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AppSettingsModule } from './modules/app-settings/app-settings.module';
import { ProtocolAnalysisModule } from './modules/protocol-analysis/protocol-analysis.module';
import { AiModule } from './modules/ai/ai.module';
import { CancerPatientsModule } from './modules/cancer-patients/cancer-patients.module';
import { SsoAipnCatalogModule } from './modules/sso-aipn-catalog/sso-aipn-catalog.module';
import { SsoProtocolDrugsModule } from './modules/sso-protocol-drugs/sso-protocol-drugs.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { BackupRestoreModule } from './modules/backup-restore/backup-restore.module';
import { HisIntegrationModule } from './modules/his-integration/his-integration.module';
import { SsopExportModule } from './modules/ssop-export/ssop-export.module';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CancerSitesModule,
    CancerStagesModule,
    ProtocolsModule,
    RegimensModule,
    DrugsModule,
    DrugTradeNamesModule,
    DashboardModule,
    AuditLogsModule,
    AppSettingsModule,
    ProtocolAnalysisModule,
    AiModule,
    CancerPatientsModule,
    SsoAipnCatalogModule,
    SsoProtocolDrugsModule,
    HospitalsModule,
    BackupRestoreModule,
    HisIntegrationModule,
    SsopExportModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
