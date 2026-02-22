import {
  Controller,
  Post,
  Get,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ValidateKeyDto } from './dto/ai-suggestion.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('AI Suggestions')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest/:vn')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Get AI protocol suggestion for a visit (calls AI provider)' })
  async suggest(
    @Param('vn') vn: string,
    @CurrentUser('id') userId: number,
  ) {
    return this.aiService.getSuggestion(vn, userId);
  }

  @Get('suggestions/:vn')
  @ApiOperation({ summary: 'Get cached AI suggestion for a visit' })
  async getCachedSuggestion(@Param('vn') vn: string) {
    return this.aiService.getCachedSuggestion(vn);
  }

  @Get('suggestions/:vn/history')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all AI suggestion history for a visit' })
  async getSuggestionHistory(@Param('vn') vn: string) {
    return this.aiService.getSuggestionHistory(vn);
  }

  @Post('settings/validate-key')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Validate an AI provider API key' })
  async validateKey(@Body() dto: ValidateKeyDto) {
    return this.aiService.validateProviderKey(dto.provider, dto.apiKey);
  }
}
