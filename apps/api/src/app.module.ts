import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from '@/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '@/audit/audit.module';
import { AuthModule } from '@/auth/auth.module';
import { HealthModule } from '@/health/health.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { NotificationModule } from '@/notification/notification.module';
import { RolesModule } from '@/roles/roles.module';
import { QueueModule } from '@/queue/queue.module';
import { CompanyModule } from './company/company.module';
import { DepartmentModule } from './department/department.module';

@Module({
  imports: [
    AppConfigModule,
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [new KeyvRedis(config.getOrThrow('REDIS_URL'))],
        ttl: 60_000,
      }),
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    NotificationModule,
    RolesModule,
    QueueModule.forRootAsync(),
    CompanyModule,
    DepartmentModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
