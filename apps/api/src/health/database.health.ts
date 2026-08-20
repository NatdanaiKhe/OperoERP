import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`, 2000);
      return indicator.up();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database is unreachable';
      return indicator.down({ message });
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error('Database health check timed out')),
          ms,
        ),
      ),
    ]);
  }
}
