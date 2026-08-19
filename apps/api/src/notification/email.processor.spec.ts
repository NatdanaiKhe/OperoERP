import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailProcessor } from '@/notification/email.processor';
import {
  AuditLogService,
  AuditAction,
} from '@/audit/audit-log.service';
import { WelcomeEmailDto } from '@/notification/dto/welcome-email.dto';
import { ResetEmailDto } from '@/notification/dto/reset-email.dto';

// Mock the Resend module
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(),
      },
    })),
  };
});

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let resendSend: jest.Mock;
  let auditLogMock: { log: jest.Mock };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        RESEND_API_KEY: 're_test_key',
        MAIL_FROM: 'Opero ERP <no-reply@example.com>',
        RESEND_INVITE_TEMPLATE_ID: 'tpl_invite',
        RESEND_RESET_TEMPLATE_ID: 'tpl_reset',
      };
      const value = values[key];
      if (value === undefined) throw new Error(`Config key "${key}" not found`);
      return value;
    }),
  };

  beforeEach(async () => {
    auditLogMock = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AuditLogService, useValue: auditLogMock },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    // Get the mock send function from the processor's Resend instance
    const resendInstance = (
      processor as unknown as {
        resend: { emails: { send: jest.Mock } };
      }
    ).resend;
    resendSend = resendInstance.emails.send;
    resendSend.mockClear();
  });

  const validWelcomeDto: WelcomeEmailDto = {
    companyName: 'OperoERP',
    name: 'Jane Doe',
    email: 'jane@example.com',
    inviteUrl: 'http://localhost:3000/auth/accept-invite?token=abc',
  };

  const validResetDto: ResetEmailDto = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    resetUrl: 'http://localhost:3000/auth/reset-password?token=xyz',
  };

  describe('process invite', () => {
    it('calls Resend with invite template and variables', async () => {
      resendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      await processor.process({
        name: 'invite',
        data: validWelcomeDto,
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Parameters<typeof processor.process>[0]);

      expect(resendSend).toHaveBeenCalledWith({
        from: 'Opero ERP <no-reply@example.com>',
        to: 'jane@example.com',
        template: {
          id: 'tpl_invite',
          variables: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            inviteUrl: 'http://localhost:3000/auth/accept-invite?token=abc',
            company: 'OperoERP',
          },
        },
      });
    });
  });

  describe('process reset', () => {
    it('calls Resend with reset template and variables', async () => {
      resendSend.mockResolvedValue({ data: { id: 'email-2' }, error: null });

      await processor.process({
        name: 'reset',
        data: validResetDto,
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Parameters<typeof processor.process>[0]);

      expect(resendSend).toHaveBeenCalledWith({
        from: 'Opero ERP <no-reply@example.com>',
        to: 'jane@example.com',
        template: {
          id: 'tpl_reset',
          variables: {
            name: 'Jane Doe',
            url: 'http://localhost:3000/auth/reset-password?token=xyz',
          },
        },
      });
    });
  });

  describe('error handling', () => {
    it('throws on Resend error so BullMQ retries', async () => {
      resendSend.mockResolvedValue({
        data: null,
        error: { message: 'boom', name: 'internal_server_error' },
      });

      await expect(
        processor.process({
          name: 'invite',
          data: validWelcomeDto,
          attemptsMade: 1,
          opts: { attempts: 3 },
        } as unknown as Parameters<typeof processor.process>[0]),
      ).rejects.toThrow(/invite email: boom/);
    });

    it('throws on unknown job name', async () => {
      await expect(
        processor.process({
          name: 'unknown',
          data: {},
          attemptsMade: 1,
          opts: { attempts: 3 },
        } as unknown as Parameters<typeof processor.process>[0]),
      ).rejects.toThrow(/Unknown job name/);
    });
  });

  describe('onFailed — audit logging on final failure', () => {
    it('logs EMAIL_SEND_FAILED when all retries exhausted', async () => {
      const err = new Error('boom');
      await processor.onFailed(
        {
          name: 'invite',
          data: validWelcomeDto,
          attemptsMade: 3,
          opts: { attempts: 3 },
        } as unknown as Parameters<typeof processor.onFailed>[0],
        err,
      );

      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.EMAIL_SEND_FAILED,
          metadata: expect.objectContaining({
            email: 'jane@example.com',
            error: 'boom',
            attempts: 3,
          }),
        }),
      );
    });

    it('does NOT log when retries remain', async () => {
      const err = new Error('transient');
      await processor.onFailed(
        {
          name: 'invite',
          data: validWelcomeDto,
          attemptsMade: 1,
          opts: { attempts: 3 },
        } as unknown as Parameters<typeof processor.onFailed>[0],
        err,
      );

      expect(auditLogMock.log).not.toHaveBeenCalled();
    });

    it('does not crash when job is undefined', async () => {
      await processor.onFailed(undefined, new Error('pre-assignment'));
      expect(auditLogMock.log).not.toHaveBeenCalled();
    });
  });
});
