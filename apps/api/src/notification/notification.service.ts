import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { WelcomeEmailDto } from './dto/welcome-email.dto';
import type { ResetEmailDto } from './dto/reset-email.dto';

export const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
};

@Injectable()
export class NotificationService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendInviteEmail(
    to: string,
    name: string,
    inviteUrl: string,
  ): Promise<void> {
    const dto: WelcomeEmailDto = {
      companyName: 'OperoERP',
      name,
      email: to,
      inviteUrl,
    };
    await this.emailQueue.add('invite', dto, JOB_OPTS);
  }

  async sendResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    expiredInMinutes: string,
  ): Promise<void> {
    const dto: ResetEmailDto = {
      name,
      email: to,
      resetUrl,
      expiredInMinutes: expiredInMinutes,
    };
    await this.emailQueue.add('reset', dto, JOB_OPTS);
  }
}
