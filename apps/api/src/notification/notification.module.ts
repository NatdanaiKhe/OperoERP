import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from '@/notification/notification.service';
import { EmailProcessor } from '@/notification/email.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),
  ],
  providers: [NotificationService, EmailProcessor],
  exports: [NotificationService],
})
export class NotificationModule {}
