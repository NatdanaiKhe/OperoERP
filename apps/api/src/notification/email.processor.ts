import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Job } from 'bullmq';
import { AuditLogService, AuditAction } from '@/audit/audit-log.service';
import type { WelcomeEmailDto } from './dto/welcome-email.dto';
import type { ResetEmailDto } from './dto/reset-email.dto';

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger('EmailProcessor');
  private resend: Resend;
  private from: string;
  private inviteTemplateId: string;
  private resetTemplateId: string;

  constructor(
    private config: ConfigService,
    private auditLog: AuditLogService,
  ) {
    super();
    this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = this.config.getOrThrow<string>('MAIL_FROM');
    this.inviteTemplateId = this.config.getOrThrow<string>(
      'RESEND_INVITE_TEMPLATE_ID',
    );
    this.resetTemplateId = this.config.getOrThrow<string>(
      'RESEND_RESET_TEMPLATE_ID',
    );
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'invite':
        return this.sendInvite(job.data as WelcomeEmailDto);
      case 'reset':
        return this.sendReset(job.data as ResetEmailDto);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async sendInvite(dto: WelcomeEmailDto): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: dto.email,
      template: {
        id: this.inviteTemplateId,
        variables: {
          name: dto.name,
          email: dto.email,
          inviteUrl: dto.inviteUrl,
          company: dto.companyName,
        },
      },
    });
    if (error) {
      throw new Error(`Failed to send invite email: ${error.message}`);
    }
  }

  private async sendReset(dto: ResetEmailDto): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: dto.email,
      template: {
        id: this.resetTemplateId,
        variables: {
          name: dto.name,
          url: dto.resetUrl,
        },
      },
    });
    if (error) {
      throw new Error(`Failed to send reset email: ${error.message}`);
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, err: Error): Promise<void> {
    try {
      if (!job) return;
      const isExhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
      if (!isExhausted) return;

      const email = (job.data as { email?: string })?.email ?? 'unknown';
      // ponytail: userId not available in job data; logged with email in metadata.
      // Thread userId through DTOs if user-level triage needed.
      await this.auditLog.log({
        action: AuditAction.EMAIL_SEND_FAILED,
        metadata: {
          email,
          jobName: job.name,
          error: err.message,
          attempts: job.attemptsMade,
        },
      });
    } catch (auditErr) {
      this.logger.error(
        `Failed to log email failure: ${(auditErr as Error).message}`,
      );
    }
  }
}
