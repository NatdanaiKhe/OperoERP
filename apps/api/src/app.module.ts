import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from '@/config/config.module';
import { CacheModule } from '@/cache/cache.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '@/audit/audit.module';
import { AuthModule } from '@/auth/auth.module';
import { HealthModule } from '@/health/health.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { NotificationModule } from '@/notification/notification.module';
import { RolesModule } from '@/roles/roles.module';
import { QueueModule } from '@/queue/queue.module';
import { CompanyModule } from '@/company/company.module';
import { DepartmentModule } from '@/department/department.module';
import { CustomerModule } from '@/customer/customer.module';

@Module({
  imports: [
    AppConfigModule,
    CacheModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    NotificationModule,
    RolesModule,
    QueueModule.forRootAsync(),
    CompanyModule,
    DepartmentModule,
    CustomerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
