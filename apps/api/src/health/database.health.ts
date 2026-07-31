import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { Pool } from 'pg';

/**
 * A health indicator that verifies database connectivity by running a
 * lightweight `SELECT 1` against the configured PostgreSQL instance.
 */
@Injectable()
export class DatabaseHealthIndicator implements OnModuleDestroy {
  private readonly pool: Pool | null;

  constructor(private readonly healthIndicatorService: HealthIndicatorService) {
    const connectionString = process.env.DATABASE_URL;

    this.pool = connectionString
      ? new Pool({
          connectionString,
          connectionTimeoutMillis: 2000,
          max: 1,
        })
      : null;
  }

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);

    if (!this.pool) {
      return indicator.down({ message: 'DATABASE_URL is not configured' });
    }

    try {
      await this.pool.query('SELECT 1');
      return indicator.up();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database is unreachable';
      return indicator.down({ message });
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
