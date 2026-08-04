import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
    credentials: true,
  });
  await app.listen(config.getOrThrow<number>('PORT'));
  Logger.log(
    `Application is running on port ${config.get<number>('PORT')}`,
    'Bootstrap',
  );
}
bootstrap();
