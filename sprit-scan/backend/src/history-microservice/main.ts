import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { HistoryModule } from './history.module';

async function bootstrap() {
  const app = await NestFactory.create(HistoryModule);

  const configService = app.get(ConfigService);
  const port = parseInt(configService.get<string>('PORT') ?? '3003', 10);
  const corsOrigin = (
    configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:4200'
  )
    .split(',')
    .map((origin) => origin.trim());

  const allowedOrigins =
    corsOrigin.filter(Boolean).length > 0
      ? corsOrigin
      : ['http://localhost:4200'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Apply request validation globally:
  // - transform: converts plain JSON payloads into DTO class instances/types
  // - whitelist: strips properties that are not declared in the DTO
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(port);
  Logger.log(
    `🚀 History Microservice is running on http://localhost:${port}`,
    'Bootstrap',
  );
}

void bootstrap();
