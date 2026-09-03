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
      case 'invite': {
        const dto = job.data as WelcomeEmailDto;
        return this.send('invite', dto.email, this.inviteTemplateId, {
          name: dto.name,
          email: dto.email,
          inviteUrl: dto.inviteUrl,
          company: dto.companyName,
        });
      }
      case 'reset': {
        const dto = job.data as ResetEmailDto;
        return this.send('reset', dto.email, this.resetTemplateId, {
          name: dto.name,
          resetUrl: dto.resetUrl,
          expiredInMinutes: dto.expiredInMinutes,
        });
      }
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async send(
    jobName: string,
    to: string,
    templateId: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      template: { id: templateId, variables },
    });
    if (error) {
      throw new Error(`Failed to send ${jobName} email: ${error.message}`);
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
