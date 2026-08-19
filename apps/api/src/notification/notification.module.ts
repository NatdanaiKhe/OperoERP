import { Module } from '@nestjs/common';
import { NotificationService } from '@/notification/notification.service';
import { EmailProcessor } from '@/notification/email.processor';
import { QueueModule } from '@/queue/queue.module';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [
    QueueModule.registerQueue({ name: 'email' }),
    AuditModule,
  ],
  providers: [NotificationService, EmailProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
