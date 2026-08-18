import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '@/notification/notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
