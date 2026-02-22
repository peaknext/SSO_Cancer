import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Entity counts and visit-based overview' })
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('visits-by-site')
  @ApiOperation({ summary: 'Top 10 cancer sites by visit count' })
  async getVisitsBySite() {
    return this.dashboardService.getVisitsBySite();
  }

  @Get('top-drugs')
  @ApiOperation({ summary: 'Top 10 most used drugs by visit count' })
  async getTopDrugsByVisits() {
    return this.dashboardService.getTopDrugsByVisits();
  }

  @Get('confirmation-rate')
  @ApiOperation({ summary: 'Protocol confirmation rate statistics' })
  async getConfirmationRate() {
    return this.dashboardService.getConfirmationRate();
  }

  @Get('empty-regimens')
  @ApiOperation({ summary: 'List of regimens with no drugs assigned' })
  async getEmptyRegimens() {
    return this.dashboardService.getEmptyRegimens();
  }

  @Get('protocols-by-site')
  @ApiOperation({ summary: 'Protocol count grouped by cancer site' })
  async getProtocolsBySite() {
    return this.dashboardService.getProtocolsBySite();
  }

  @Get('protocols-by-type')
  @ApiOperation({ summary: 'Protocol count grouped by type' })
  async getProtocolsByType() {
    return this.dashboardService.getProtocolsByType();
  }

  @Get('drugs-by-category')
  @ApiOperation({ summary: 'Drug count grouped by category' })
  async getDrugsByCategory() {
    return this.dashboardService.getDrugsByCategory();
  }

  @Get('price-coverage')
  @ApiOperation({ summary: 'Price coverage per drug category' })
  async getPriceCoverage() {
    return this.dashboardService.getPriceCoverage();
  }

  @Get('ai-stats')
  @ApiOperation({ summary: 'AI suggestion usage statistics' })
  async getAiStats() {
    return this.dashboardService.getAiStats();
  }

  @Get('recent-activity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Last 10 audit log entries' })
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }
}
