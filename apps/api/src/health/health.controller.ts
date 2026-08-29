import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  HealthCheck,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // The app's own health: heap memory must stay under 300MB
      () => this.memory.checkHeap('self', 300 * 1024 * 1024),
      // Database connectivity
      () => this.db.pingCheck('database', this.prisma, { timeout: 2000 }),
    ]);
  }
}
