import {
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnApplicationShutdown {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    // lazyConnect: the cache is best-effort — no connection at boot, so a
    // down Redis never blocks app startup.
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`Redis: ${err.message}`);
    });
  }

  /**
   * Best-effort get-or-compute. Every "cache unavailable" failure is handled
   * here and degrades to the loader; the DB remains the source of truth.
   */
  async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch (err) {
      this.logger.warn(`Cache read failed for ${key}: ${(err as Error).message}`);
    }
    const value = await loader();
    try {
      await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (err) {
      this.logger.warn(`Cache write failed for ${key}: ${(err as Error).message}`);
    }
    return value;
  }

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
