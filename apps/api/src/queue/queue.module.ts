import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Module({})
export class QueueModule {
  static forRootAsync(): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const redisUrl = new URL(config.getOrThrow('REDIS_URL'));
            return {
              connection: {
                host: redisUrl.hostname,
                port: Number(redisUrl.port || 6379),
                password: redisUrl.password || undefined,
                username: redisUrl.username || undefined,
              },
            };
          },
        }),
      ],
      exports: [BullModule],
    };
  }
}
