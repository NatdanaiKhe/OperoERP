import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  NotificationService,
  JOB_OPTS,
} from '@/notification/notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailQueue: { add: jest.Mock };

  beforeEach(async () => {
    emailQueue = { add: jest.fn().mockResolvedValue({}) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getQueueToken('email'), useValue: emailQueue },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendInviteEmail', () => {
    it('enqueues an invite job with WelcomeEmailDto shape and retry options', async () => {
      await service.sendInviteEmail(
        'jane@example.com',
        'Jane Doe',
        'http://localhost:3000/auth/accept-invite?token=abc',
      );

      expect(emailQueue.add).toHaveBeenCalledWith(
        'invite',
        {
          companyName: 'OperoERP',
          name: 'Jane Doe',
          email: 'jane@example.com',
          inviteUrl: 'http://localhost:3000/auth/accept-invite?token=abc',
        },
        JOB_OPTS,
      );
    });

    it('calls queue.add exactly once', async () => {
      await service.sendInviteEmail('a@b.com', 'A', 'http://localhost:3000/x');
      expect(emailQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendResetEmail', () => {
    it('enqueues a reset job with ResetEmailDto shape and retry options', async () => {
      await service.sendResetEmail(
        'jane@example.com',
        'Jane Doe',
        'http://localhost:3000/auth/reset-password?token=xyz',
      );

      expect(emailQueue.add).toHaveBeenCalledWith(
        'reset',
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
          resetUrl: 'http://localhost:3000/auth/reset-password?token=xyz',
        },
        JOB_OPTS,
      );
    });
  });

  describe('JOB_OPTS', () => {
    it('has 3 attempts with exponential backoff delay 2000', () => {
      expect(JOB_OPTS).toEqual({
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
    });
  });
});
