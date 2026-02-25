import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  private readonly maxFailedAttempts: number;
  private readonly lockoutDuration: number;
  private readonly accessTokenTtl: string;
  private readonly refreshTokenTtl: string;
  private readonly refreshSecret: string;
  private readonly passwordHistoryCount: number;
  private readonly maxConcurrentSessions: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.maxFailedAttempts = Number(
      this.configService.get('MAX_FAILED_LOGIN_ATTEMPTS', 5),
    );
    this.lockoutDuration = Number(
      this.configService.get('LOCKOUT_DURATION_SECONDS', 900),
    );
    this.accessTokenTtl = this.configService.get<string>(
      'JWT_ACCESS_TTL',
      '15m',
    );
    this.refreshTokenTtl = this.configService.get<string>(
      'JWT_REFRESH_TTL',
      '7d',
    );
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET environment variable is required');
    this.refreshSecret = refreshSecret;
    this.passwordHistoryCount = Number(
      this.configService.get('PASSWORD_HISTORY_COUNT', 5),
    );
    this.maxConcurrentSessions = Number(
      this.configService.get('MAX_CONCURRENT_SESSIONS', 5),
    );
  }

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.usersService.findByEmail(dto.email);

    // Constant-time: always run bcrypt.compare even if user not found
    // This prevents timing attacks that reveal valid emails
    const dummyHash = '$2b$12$LJ3m4ys3Lg7Yt18G4WQJG.vGPqFnsgXOdGmCd7JnRqT1l/TCSeDV6';
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? dummyHash,
    );

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('ACCOUNT_DEACTIVATED');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('ACCOUNT_LOCKED');
    }

    if (!isPasswordValid) {
      await this.usersService.incrementFailedAttempts(user.id);
      const updated = await this.usersService.findById(user.id);
      if (
        updated &&
        updated.failedLoginAttempts >= this.maxFailedAttempts
      ) {
        await this.usersService.lockAccount(user.id, this.lockoutDuration);
      }
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    await this.usersService.updateLastLogin(user.id, ip);

    const tokenId = uuidv4();
    const tokens = await this.generateTokens(user, tokenId);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenId,
        ipAddress: ip,
        userAgent: userAgent?.substring(0, 500) || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Enforce max concurrent sessions — remove oldest if over limit
    await this.enforceMaxSessions(user.id);

    await this.logAudit(user.id, 'LOGIN', 'User', user.id, ip, userAgent);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        fullNameThai: user.fullNameThai,
      },
    };
  }

  async refresh(tokenId: string, ip: string, userAgent: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('SESSION_EXPIRED');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('ACCOUNT_DEACTIVATED');
    }

    const newTokenId = uuidv4();
    const tokens = await this.generateTokens(session.user, newTokenId);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        tokenId: newTokenId,
        ipAddress: ip,
        userAgent: userAgent || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        fullName: session.user.fullName,
        fullNameThai: session.user.fullNameThai,
      },
    };
  }

  async logout(tokenId: string) {
    await this.prisma.session.deleteMany({ where: { tokenId } });
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
    ip: string,
    userAgent: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('CURRENT_PASSWORD_INCORRECT');
    }

    const history = await this.usersService.getPasswordHistory(
      userId,
      this.passwordHistoryCount,
    );
    for (const entry of history) {
      const isReused = await bcrypt.compare(dto.newPassword, entry.passwordHash);
      if (isReused) {
        throw new BadRequestException('PASSWORD_RECENTLY_USED');
      }
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.addPasswordHistory(userId, user.passwordHash);
    await this.usersService.updatePassword(userId, newHash);

    // Revoke all existing sessions to force re-login
    await this.prisma.session.deleteMany({ where: { userId } });

    await this.logAudit(
      userId,
      'PASSWORD_CHANGE',
      'User',
      userId,
      ip,
      userAgent,
    );

    return { message: 'Password changed successfully' };
  }

  async getMe(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('USER_NOT_FOUND');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      fullNameThai: user.fullNameThai,
      department: user.department,
      position: user.position,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async generateTokens(
    user: { id: number; email: string; role: string; fullName: string },
    tokenId: string,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.accessTokenTtl,
      } as JwtSignOptions),
      this.jwtService.signAsync(
        { sub: user.id, tokenId },
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshTokenTtl,
        } as JwtSignOptions,
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async enforceMaxSessions(userId: number) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (sessions.length > this.maxConcurrentSessions) {
      const idsToDelete = sessions
        .slice(this.maxConcurrentSessions)
        .map((s) => s.id);
      await this.prisma.session.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  }

  private async logAudit(
    userId: number,
    action: string,
    entityType: string,
    entityId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent: userAgent?.substring(0, 500) || null,
      },
    });
  }
}
