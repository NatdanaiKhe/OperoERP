import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { Public } from '@/common/decorators/public.decorator';
import { DatabaseHealthIndicator } from '@/health/database.health';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private database: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // The app's own health: heap memory must stay under 300MB
      () => this.memory.checkHeap('self', 300 * 1024 * 1024),
      // Database connectivity
      () => this.database.isHealthy('database'),
    ]);
  }
}
