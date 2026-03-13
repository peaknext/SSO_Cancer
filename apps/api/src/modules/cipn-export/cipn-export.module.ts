import { Module } from '@nestjs/common';
import { CipnExportController } from './cipn-export.controller';
import { CipnExportService } from './cipn-export.service';

@Module({
  controllers: [CipnExportController],
  providers: [CipnExportService],
  exports: [CipnExportService],
})
export class CipnExportModule {}
