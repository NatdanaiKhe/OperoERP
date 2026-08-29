import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@/cache/cache.service';

const mockClient = {
  get: jest.fn(),
  set: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));

describe('CacheService', () => {
  let service: CacheService;
  const configMock = { getOrThrow: jest.fn(() => 'redis://localhost:6379') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();
    service = module.get(CacheService);
  });

  it('loads and stores value on miss', async () => {
    mockClient.get.mockResolvedValueOnce(null);
    mockClient.set.mockResolvedValueOnce('OK');
    const loader = jest.fn().mockResolvedValue({ a: 1 });

    const result = await service.getOrSet('k', 30_000, loader);

    expect(result).toEqual({ a: 1 });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(mockClient.set).toHaveBeenCalledWith('k', '{"a":1}', 'PX', 30_000);
  });

  it('serves cached value without calling loader', async () => {
    mockClient.get.mockResolvedValueOnce('{"a":1}');
    const loader = jest.fn().mockResolvedValue({ a: 2 });

    const result = await service.getOrSet('k', 30_000, loader);

    expect(result).toEqual({ a: 1 });
    expect(loader).not.toHaveBeenCalled();
  });

  it('falls through to loader when Redis errors', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('connection refused'));
    mockClient.set.mockResolvedValueOnce('OK');
    const loader = jest.fn().mockResolvedValue('db-value');

    const result = await service.getOrSet('k', 30_000, loader);

    expect(result).toBe('db-value');
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
