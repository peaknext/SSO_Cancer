import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { BackupRestoreService } from './backup-restore.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Backup & Restore')
@ApiBearerAuth()
@Controller('backup-restore')
export class BackupRestoreController {
  constructor(private readonly service: BackupRestoreService) {}

  @Get('status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current database table counts' })
  async getStatus() {
    return this.service.getDatabaseStatus();
  }

  @Get('backup')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Download full database backup as .json.gz' })
  async downloadBackup(
    @Query('includeAuditLogs') includeAuditLogs: string = 'true',
    @CurrentUser('id') userId: number,
    @Res() res: Response,
  ) {
    const include = includeAuditLogs !== 'false';
    const { buffer, metadata } = await this.service.createBackup(userId, include);

    // Log backup to audit
    await this.service.logBackupAudit(userId, metadata);

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=sso-cancer-backup-${date}.json.gz`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('restore/preview')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload backup file and preview contents (no DB write)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async previewRestore(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('กรุณาอัปโหลดไฟล์ — Please upload a file');
    }
    return this.service.parseAndPreview(file.buffer, file.originalname);
  }

  @Post('restore/confirm')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload backup file and restore database' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async confirmRestore(
    @UploadedFile() file: Express.Multer.File,
    @Query('includeAuditLogs') includeAuditLogs: string = 'false',
    @CurrentUser('id') userId: number,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาอัปโหลดไฟล์ — Please upload a file');
    }
    const include = includeAuditLogs === 'true';
    return this.service.restoreFromBackup(file.buffer, file.originalname, userId, include);
  }
}
