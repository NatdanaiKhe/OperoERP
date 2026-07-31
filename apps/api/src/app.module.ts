import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

@Module({
  controllers: [],
  imports: [HealthModule],
})
export class AppModule {}
