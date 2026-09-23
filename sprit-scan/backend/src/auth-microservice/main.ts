import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  const configService = app.get(ConfigService);
  const port = parseInt(configService.get<string>('PORT') ?? '3001', 10);
  const corsOrigin = (
    configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:4200'
  )
    .split(',')
    .map((origin) => origin.trim());

  // Backward-compatible fallback if CORS_ORIGIN is empty/invalid.
  const allowedOrigins =
    corsOrigin.filter(Boolean).length > 0
      ? corsOrigin
      : ['http://localhost:4200'];

  // Allow the Angular frontend to call the gateway.
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Validate/transform incoming payloads globally.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(port);
  Logger.log(
    `🚀 Auth Microservice is running on http://localhost:${port}`,
    'Bootstrap',
  );
}

void bootstrap();
