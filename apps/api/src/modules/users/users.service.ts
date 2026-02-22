import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '../../prisma';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const { page = 1, limit = 25, sortBy = 'id', sortOrder = 'asc', search, role, isActive } = query;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { fullNameThai: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, email: true, fullName: true, fullNameThai: true,
          role: true, department: true, position: true, phoneNumber: true,
          isActive: true, lastLoginAt: true, createdAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdDetail(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, fullName: true, fullNameThai: true,
        role: true, department: true, position: true, phoneNumber: true,
        avatarUrl: true, isActive: true, lastLoginAt: true, lastLoginIp: true,
        failedLoginAttempts: true, lockedUntil: true, createdAt: true, updatedAt: true,
      },
    });
  }

  async create(dto: CreateUserDto, creatorRole: string) {
    if (dto.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot create SUPER_ADMIN users');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        fullNameThai: dto.fullNameThai,
        role: dto.role,
        department: dto.department,
        position: dto.position,
        phoneNumber: dto.phoneNumber,
      },
      select: {
        id: true, email: true, fullName: true, fullNameThai: true,
        role: true, department: true, position: true, isActive: true,
        createdAt: true,
      },
    });

    return { ...user, tempPassword };
  }

  async update(id: number, dto: UpdateUserDto, currentUserRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) return null;

    if (target.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot modify SUPER_ADMIN');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, email: true, fullName: true, fullNameThai: true,
        role: true, department: true, position: true, phoneNumber: true,
        isActive: true, updatedAt: true,
      },
    });
  }

  async deactivate(id: number, currentUserRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) return null;
    if (target.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot deactivate SUPER_ADMIN');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: number, currentUserRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) return null;
    if (target.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot activate SUPER_ADMIN');
    }
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async resetPassword(id: number, currentUserRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) return null;
    if (target.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot reset SUPER_ADMIN password');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });

    return { tempPassword };
  }

  async getSessions(userId: number) {
    return this.prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        userAgent: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: number, sessionId: number) {
    return this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
  }

  // --- Auth helper methods (used by AuthService) ---

  async updateLastLogin(id: number, ip: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async incrementFailedAttempts(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async lockAccount(id: number, lockoutDurationSeconds: number) {
    const lockedUntil = new Date(Date.now() + lockoutDurationSeconds * 1000);
    return this.prisma.user.update({
      where: { id },
      data: { lockedUntil },
    });
  }

  async getPasswordHistory(userId: number, count: number) {
    return this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: count,
    });
  }

  async addPasswordHistory(userId: number, passwordHash: string) {
    return this.prisma.passwordHistory.create({
      data: { userId, passwordHash },
    });
  }

  async updatePassword(userId: number, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + 'A1!';
  }
}
