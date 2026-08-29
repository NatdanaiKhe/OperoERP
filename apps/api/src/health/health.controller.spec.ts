import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule, PrismaHealthIndicator } from '@nestjs/terminus';
import { HealthController } from '@/health/health.controller';
import { PrismaService } from '@/prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        PrismaHealthIndicator,
        {
          provide: PrismaService,
          useValue: { $queryRawUnsafe: jest.fn().mockResolvedValue([1]) },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should check self and database indicators', async () => {
    const checkSpy = jest
      .spyOn(controller['health'], 'check')
      .mockResolvedValue({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });

    await controller.check();

    expect(checkSpy).toHaveBeenCalled();
    const indicators = checkSpy.mock.calls[0][0];
    expect(indicators).toHaveLength(2);
  });
});
