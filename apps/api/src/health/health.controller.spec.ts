import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './database.health';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [DatabaseHealthIndicator],
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
