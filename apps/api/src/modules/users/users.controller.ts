import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { createPaginatedResponse } from '../../common/dto/paginated-response.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'List users with pagination and filters' })
  async findAll(
    @Query() query: QueryUsersDto,
    @CurrentUser('role') currentUserRole: string,
  ) {
    const result = await this.usersService.findAll(query, currentUserRole);
    return createPaginatedResponse(result.data, result.total, result.page, result.limit);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user detail' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('role') currentUserRole: string,
  ) {
    const user = await this.usersService.findByIdDetail(id);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot view SUPER_ADMIN details');
    }
    return user;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create user (auto-generates temp password)' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('role') currentUserRole: string,
  ) {
    return this.usersService.create(dto, currentUserRole);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser('role') currentUserRole: string,
  ) {
    const user = await this.usersService.update(id, dto, currentUserRole);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return user;
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('role') currentUserRole: string,
  ) {
    const user = await this.usersService.deactivate(id, currentUserRole);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return { message: 'User deactivated' };
  }

  @Patch(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reactivate user' })
  async activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('role') currentUserRole: string,
  ) {
    const user = await this.usersService.activate(id, currentUserRole);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return { message: 'User activated' };
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin reset user password' })
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('role') currentUserRole: string,
  ) {
    const result = await this.usersService.resetPassword(id, currentUserRole);
    if (!result) throw new NotFoundException('USER_NOT_FOUND');
    return result;
  }

  @Get(':id/sessions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user active sessions' })
  async getSessions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('role') currentUserRole: string,
  ) {
    await this.guardSuperAdminAccess(id, currentUserRole);
    return this.usersService.getSessions(id);
  }

  @Delete(':id/sessions/:sessionId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke user session' })
  async revokeSession(
    @Param('id', ParseIntPipe) id: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser('role') currentUserRole: string,
  ) {
    await this.guardSuperAdminAccess(id, currentUserRole);
    await this.usersService.revokeSession(id, sessionId);
    return { message: 'Session revoked' };
  }

  /** Reject ADMIN from accessing SUPER_ADMIN user resources */
  private async guardSuperAdminAccess(targetId: number, currentUserRole: string) {
    if (currentUserRole === 'SUPER_ADMIN') return;
    const target = await this.usersService.findById(targetId);
    if (target?.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot access SUPER_ADMIN resources');
    }
  }
}
