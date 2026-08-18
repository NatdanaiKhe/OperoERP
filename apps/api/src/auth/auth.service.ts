import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuditLogService, AuditAction } from '@/audit/audit-log.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { Request } from 'express';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 30;
// Valid bcrypt hash used to equalize timing when the email is unknown.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equalizer', SALT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async validateUser(email: string, password: string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        isActive: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) {
      // Equalize timing so attackers can't tell valid emails from invalid ones.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      await this.auditLog.log({
        action: AuditAction.LOGIN_FAILURE,
        req,
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      await this.auditLog.log({
        action: AuditAction.LOGIN_FAILURE,
        req,
        metadata: { email, reason: 'inactive' },
      });
      throw new UnauthorizedException('User is not active');
    }
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      await this.auditLog.log({
        action: AuditAction.LOGIN_FAILURE,
        req,
        metadata: { email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLogin: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      roles: u.userRoles.map((ur) => ur.role.name),
    }));
  }

  async register(
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    req?: Request,
  ) {
    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.user.findUnique({ where: { username } }),
    ]);
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }
    if (existingUsername) {
      throw new ConflictException('Username already in use');
    }
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        userRoles: {
          create: {
            role: { connect: { name: 'user' } },
          },
        },
      },
    });
    await this.auditLog.log({
      action: AuditAction.REGISTER,
      userId: user.id,
      req,
    });
  }

  async login(userId: string, roles: string[], req?: Request) {
    const tokens = await this.generateAccessAndRefreshToken(userId, roles);
    await this.auditLog.log({
      action: AuditAction.LOGIN_SUCCESS,
      userId,
      req,
    });
    return tokens;
  }

  async refresh(oldRefreshToken: string, req?: Request) {
    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const hashed = this.hashToken(oldRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashed },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        user: {
          select: {
            isActive: true,
            userRoles: { select: { role: { select: { name: true } } } },
          },
        },
      },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    if (!stored.user.isActive) {
      throw new UnauthorizedException('User is not active');
    }

    // Atomic rotation: only one concurrent request can revoke the old token.
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      // Already rotated → reuse detected. Compromise: kill all sessions.
      await this.auditLog.log({
        action: AuditAction.REVOKE_ALL,
        userId: stored.userId,
        req,
        metadata: { reason: 'reuse' },
      });
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException(
        'Token reuse detected, all sessions revoked',
      );
    }

    const roles = stored.user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateAccessAndRefreshToken(
      stored.userId,
      roles,
    );

    await this.auditLog.log({
      action: AuditAction.REFRESH,
      userId: stored.userId,
      req,
    });

    return tokens;
  }

  async logout(refreshToken: string, req?: Request) {
    if (!refreshToken) return;

    const hashed = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashed },
      select: { userId: true },
    });

    if (stored) {
      await this.auditLog.log({
        action: AuditAction.LOGOUT,
        userId: stored.userId,
        req,
      });
    }

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    req?: Request,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const currentMatches = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!currentMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await this.auditLog.log({
      action: AuditAction.PASSWORD_CHANGE,
      userId,
      req,
    });
    // Force re-login on every device after a password change.
    await this.revokeAllForUser(userId);
  }

  async updateLastLogin(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateAccessAndRefreshToken(userId: string, roles: string[]) {
    const accessToken = this.generateAccessToken({ userId, roles });
    const refreshToken = await this.generateToken(40);
    const hashedRefresh = this.hashToken(refreshToken);
    await this.persistRefreshToken(userId, hashedRefresh);
    return { accessToken, refreshToken };
  }

  private generateAccessToken(payload: { userId: string; roles: string[] }) {
    return this.jwt.sign(
      {
        sub: payload.userId,
        roles: payload.roles,
      },
      {
        expiresIn: this.config.getOrThrow<string>(
          'JWT_EXPIRES_IN',
        ) as jwt.SignOptions['expiresIn'],
      },
    );
  }

  private async persistRefreshToken(userId: string, tokenHash: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  private async generateToken(size?: number) {
    const token = crypto.randomBytes(size ?? 32).toString('hex');
    return token;
  }
}
