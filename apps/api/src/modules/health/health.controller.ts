import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let database = 'disconnected';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    return {
      status: database === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
