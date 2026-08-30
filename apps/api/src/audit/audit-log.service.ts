import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from 'database';
import { PrismaService } from '@/prisma/prisma.service';

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  INVITE_SENT = 'INVITE_SENT',
  INVITE_ACCEPTED = 'INVITE_ACCEPTED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  LOGOUT = 'LOGOUT',
  REFRESH = 'REFRESH',
  REVOKE_ALL = 'REVOKE_ALL',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  USER_DELETED = 'USER_DELETED',
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLogService');

  constructor(private prisma: PrismaService) {}

  async log({
    action,
    userId,
    req,
    metadata,
  }: {
    action: AuditAction;
    userId?: string | null;
    req?: Request;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: userId ?? null,
          ipAddress: req?.ip ?? null,
          userAgent:
            (req?.headers?.['user-agent'] as string | undefined) ?? null,
          metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      this.logger.warn(`Audit log failed: ${(err as Error).message}`);
    }
  }
}
