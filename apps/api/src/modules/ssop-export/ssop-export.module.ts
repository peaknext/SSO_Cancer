import { Module } from '@nestjs/common';
import { SsopExportController } from './ssop-export.controller';
import { SsopExportService } from './ssop-export.service';

@Module({
  controllers: [SsopExportController],
  providers: [SsopExportService],
  exports: [SsopExportService],
})
export class SsopExportModule {}
