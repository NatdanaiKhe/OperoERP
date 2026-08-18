import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class NotificationService {
  private resend: Resend;
  private from: string;
  private inviteTemplateId: string;
  private resetTemplateId: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = this.config.getOrThrow<string>('MAIL_FROM');
    this.inviteTemplateId = this.config.getOrThrow<string>(
      'RESEND_INVITE_TEMPLATE_ID',
    );
    this.resetTemplateId = this.config.getOrThrow<string>(
      'RESEND_RESET_TEMPLATE_ID',
    );
  }

  async sendInviteEmail(to: string, name: string, inviteUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      template: {
        id: this.inviteTemplateId,
        variables: {
          name,
          url: inviteUrl,
        },
      },
    });

    if (error) {
      throw new Error(`Failed to send invite email: ${error.message}`);
    }
  }

  async sendResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      template: {
        id: this.resetTemplateId,
        variables: {
          name,
          url: resetUrl,
        },
      },
    });

    if (error) {
      throw new Error(`Failed to send reset email: ${error.message}`);
    }
  }
}
