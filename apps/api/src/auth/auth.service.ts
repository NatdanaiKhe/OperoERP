import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from 'database';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuditLogService, AuditAction } from '@/audit/audit-log.service';
import { NotificationService } from '@/notification/notification.service';
import { CacheService } from '@/cache/cache.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Request } from 'express';
import { JwtPayload } from '@/common/decorators/current-user.decorator';
import { isSuperAdmin } from '@/common/utils/auth.utils';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_DAYS = 30;
// TTL-only staleness menu-config changes propagate in <=30s.
// Switch to a company-scoped version key if instant propagation is ever required.
const PROFILE_CACHE_TTL_MS = 30_000;
// Valid bcrypt hash used to equalize timing when the email is unknown.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equalizer', SALT_ROUNDS);

enum TokenType {
  INVITE = 'INVITE',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

@Injectable()
export class AuthService {
  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private notification: NotificationService,
    private cache: CacheService,
  ) {}

  async validateUser(email: string, password: string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        isActive: true,
        userRoles: {
          select: { role: { select: { name: true, companyId: true } } },
        },
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
    // Defensive: invited users have null password until they accept.
    if (!user.password) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      await this.auditLog.log({
        action: AuditAction.LOGIN_FAILURE,
        req,
        metadata: { email, reason: 'no-password' },
      });
      throw new UnauthorizedException('Invalid credentials');
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
    return this.cache.getOrSet(`profile:${userId}`, PROFILE_CACHE_TTL_MS, () =>
      this.loadProfile(userId),
    );
  }

  private async loadProfile(userId: string) {
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
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                companyId: true,
                menuVisibility: { select: { menuKey: true, visible: true } },
              },
            },
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // Merge menu visibility from all roles (OR: if any role grants visibility, it's visible).
    const visibleKeys = new Set<string>();
    for (const ur of user.userRoles) {
      for (const mv of ur.role.menuVisibility) {
        if (mv.visible) visibleKeys.add(mv.menuKey);
      }
    }
    const result = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      companyId: user.userRoles[0]?.role.companyId ?? null,
      userRoles: user.userRoles.map((ur) => ({ role: { name: ur.role.name } })),
      menuConfig: [...visibleKeys],
    };
    return result;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName },
    });
    return this.profile(userId);
  }

  async listUsers(
    companyId: string,
    query: {
      status?: 'active' | 'inactive' | 'deleted';
      department?: string;
      role?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    // Default view: active users only. Deleted/inactive users are opt-in
    // via ?status=deleted / ?status=inactive.
    const where: Prisma.UserWhereInput = {
      userRoles: { some: { role: { companyId } } },
      NOT: { userRoles: { some: { role: { name: 'superadmin' } } } },
      deletedAt: query.status === 'deleted' ? { not: null } : null,
    };
    if (query.status === 'inactive') {
      where.isActive = false;
    } else {
      where.isActive = true;
    }
    if (query.department) {
      where.departmentId = query.department;
    }
    if (query.role) {
      where.userRoles = {
        some: { role: { name: query.role, companyId } },
      };
    }

    const select = {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      department: true,
      isActive: true,
      userRoles: { select: { role: { select: { name: true } } } },
    } satisfies Prisma.UserSelect;

    const map = (u: Prisma.UserGetPayload<{ select: typeof select }>) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      department: u.department,
      isActive: u.isActive,
      roles: u.userRoles.map((ur) => ur.role.name),
    });

    // Paginated callers get { data, total, page, limit }; plain array stays
    // the default so existing callers are unaffected.
    if (query.limit) {
      const page = query.page ?? 1;
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select,
          skip: (page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.user.count({ where }),
      ]);
      return { data: users.map(map), total, page, limit: query.limit };
    }

    const users = await this.prisma.user.findMany({ where, select });
    return users.map(map);
  }

  async invite(dto: InviteDto, req?: Request): Promise<{ userId: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, isActive: true },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Email already in use');
      }
      // Re-issue invite for pending user.
      const raw = await this.generateTokenRecord(
        existing.id,
        TokenType.INVITE,
        this.config.getOrThrow<number>('INVITE_TOKEN_TTL_HOURS'),
      );
      const inviteUrl = `${this.config.getOrThrow<string>('WEB_APP_URL')}/auth/accept-invite?token=${raw}`;
      await this.notification.sendInviteEmail(
        dto.email,
        `${dto.firstName} ${dto.lastName}`,
        inviteUrl,
      );
      await this.auditLog.log({
        action: AuditAction.INVITE_SENT,
        userId: existing.id,
        req,
        metadata: { email: dto.email, role: dto.role, reissue: true },
      });
      return { userId: existing.id };
    }

    const username = await this.generateUniqueUsername(dto.email);

    // Resolve the invitee's company via their department, then look the role
    // up scoped to that company. A role belonging to any other company simply
    // doesn't resolve here, so cross-company assignments are rejected at the
    // service layer (the schema can't express this — User has no companyId FK).
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      select: { companyId: true },
    });
    if (!department) {
      throw new BadRequestException('Invalid department');
    }

    const role = await this.prisma.role.findFirst({
      where: { name: dto.role, companyId: department.companyId },
      select: { id: true },
    });
    if (!role) {
      throw new BadRequestException('Invalid role');
    }

    const user = await this.prisma.user.create({
      data: {
        username,
        email: dto.email,
        password: null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        departmentId: dto.departmentId,
        isActive: false,
        userRoles: {
          create: { roleId: role.id },
        },
      },
    });

    const raw = await this.generateTokenRecord(
      user.id,
      TokenType.INVITE,
      this.config.getOrThrow<number>('INVITE_TOKEN_TTL_HOURS'),
    );
    const inviteUrl = `${this.config.getOrThrow<string>('WEB_APP_URL')}/auth/accept-invite?token=${raw}`;
    await this.notification.sendInviteEmail(
      dto.email,
      `${dto.firstName} ${dto.lastName}`,
      inviteUrl,
    );
    await this.auditLog.log({
      action: AuditAction.INVITE_SENT,
      userId: user.id,
      req,
      metadata: { email: dto.email, role: dto.role },
    });
    return { userId: user.id };
  }

  async acceptInvite(dto: AcceptInviteDto, req?: Request): Promise<void> {
    const { id, userId } = await this.validateToken(
      dto.token,
      TokenType.INVITE,
    );
    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, isActive: true },
    });
    await this.prisma.token.update({
      where: { id },
      data: { usedAt: new Date() },
    });
    await this.auditLog.log({
      action: AuditAction.INVITE_ACCEPTED,
      userId,
      req,
    });
  }

  async forgotPassword(email: string, req?: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, isActive: true },
    });

    // Enumeration-proof: always resolve, no token/email/audit for unknown or inactive.
    if (!user || !user.isActive) return;

    const raw = await this.generateTokenRecord(
      user.id,
      TokenType.PASSWORD_RESET,
      this.config.getOrThrow<number>('RESET_TOKEN_TTL_HOURS'),
    );
    const resetUrl = `${this.config.getOrThrow<string>('WEB_APP_URL')}/auth/reset-password?token=${raw}`;
    await this.notification.sendResetEmail(
      email,
      `${user.firstName} ${user.lastName}`,
      resetUrl,
    );
    await this.auditLog.log({
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      userId: user.id,
      req,
    });
  }

  async resetPassword(dto: ResetPasswordDto, req?: Request): Promise<void> {
    const { id, userId } = await this.validateToken(
      dto.token,
      TokenType.PASSWORD_RESET,
    );
    const hashed = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await this.prisma.token.update({
      where: { id },
      data: { usedAt: new Date() },
    });
    // Force re-login on every device after a password reset.
    await this.revokeAllForUser(userId);
    await this.auditLog.log({
      action: AuditAction.PASSWORD_RESET,
      userId,
      req,
    });
  }

  async login(
    userId: string,
    roles: string[],
    companyId: string,
    req?: Request,
  ) {
    const tokens = await this.generateAccessAndRefreshToken(
      userId,
      roles,
      companyId,
      isSuperAdmin(roles),
    );
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
            userRoles: {
              select: { role: { select: { name: true, companyId: true } } },
            },
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
    const companyId = stored.user.userRoles[0]?.role.companyId ?? null;

    const tokens = await this.generateAccessAndRefreshToken(
      stored.userId,
      roles,
      companyId,
      isSuperAdmin(roles),
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
    if (!user.password) {
      throw new UnauthorizedException('No password set');
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

  // Soft delete: keep the row (role/department intact), mark deleted,
  // and kill every active session so a deleted user is logged out everywhere.
  async softDeleteUser(userId: string, req?: Request): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });
    await this.revokeAllForUser(userId);
    await this.auditLog.log({
      action: AuditAction.USER_DELETED,
      userId,
      req,
    });
  }

  // Edit role and/or department for an existing (non-deleted) user.
  // Company scoping mirrors invite(): the role must belong to the user's
  // (new) department's company.
  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    req?: Request,
  ): Promise<{ message: string }> {
    if (!dto.departmentId && !dto.role) {
      throw new BadRequestException('Nothing to update');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, departmentId: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const departmentId = dto.departmentId ?? user.departmentId;
    let companyId: string | null = null;
    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
        select: { companyId: true, deletedAt: true },
      });
      if (!department || department.deletedAt) {
        throw new BadRequestException('Invalid department');
      }
      companyId = department.companyId;
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.departmentId) {
      data.department = { connect: { id: dto.departmentId } };
    }
    if (dto.role) {
      if (!companyId) {
        throw new BadRequestException(
          'User has no department; assign a department first',
        );
      }
      const role = await this.prisma.role.findFirst({
        where: { name: dto.role, companyId },
        select: { id: true },
      });
      if (!role) {
        throw new BadRequestException('Invalid role for this company');
      }
      data.userRoles = { deleteMany: {}, create: { roleId: role.id } };
    }

    await this.prisma.user.update({ where: { id: userId }, data });
    await this.auditLog.log({
      action: AuditAction.USER_UPDATED,
      userId,
      req,
      metadata: { role: dto.role, departmentId: dto.departmentId },
    });
    return { message: 'User updated' };
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

  private async generateUniqueUsername(email: string): Promise<string> {
    const base = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    for (let i = 0; i < 3; i++) {
      const suffix = i === 0 ? '' : `-${this.generateToken()}`;
      const username = `${base}${suffix}`;
      const existing = await this.prisma.user.findUnique({
        where: { username },
      });
      if (!existing) return username;
    }
    throw new ConflictException('Could not generate unique username');
  }

  // ponytail: no scheduled cron; cleanup piggybacks on creation. Add a cron if token volume grows.
  private async generateTokenRecord(
    userId: string,
    type: TokenType,
    ttlHours: number,
  ): Promise<string> {
    await this.prisma.token.deleteMany({
      where: {
        userId,
        type,
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
      },
    });
    const raw = this.generateToken();
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    await this.prisma.token.create({
      data: {
        type,
        tokenHash: this.hashToken(raw),
        userId,
        expiresAt,
      },
    });
    return raw;
  }

  private async validateToken(
    rawToken: string,
    type: TokenType,
  ): Promise<{ id: string; userId: string }> {
    const hash = this.hashToken(rawToken);
    const token = await this.prisma.token.findUnique({
      where: { tokenHash: hash },
      select: {
        id: true,
        userId: true,
        type: true,
        usedAt: true,
        expiresAt: true,
      },
    });
    if (
      !token ||
      token.type !== type ||
      token.usedAt ||
      token.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return { id: token.id, userId: token.userId };
  }

  private async generateAccessAndRefreshToken(
    userId: string,
    roles: string[],
    companyId: string,
    isSuperAdmin: boolean,
  ) {
    const accessToken = this.generateAccessToken({
      userId,
      roles,
      companyId,
      isSuperAdmin,
    });
    const refreshToken = this.generateToken(40);
    const hashedRefresh = this.hashToken(refreshToken);
    await this.persistRefreshToken(userId, hashedRefresh);
    return { accessToken, refreshToken };
  }

  private generateAccessToken(payload: JwtPayload) {
    return this.jwt.sign(
      {
        sub: payload.userId,
        roles: payload.roles,
        companyId: payload.companyId,
      },
      {
        expiresIn: this.config.getOrThrow<string>(
          'JWT_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
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

  private generateToken(size?: number) {
    const token = crypto.randomBytes(size ?? 32).toString('hex');
    return token;
  }
}
