import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import express from 'express';
import { ApiGatewayModule } from './api-gateway-module';

async function bootstrap() {
  // Disable Nest's built-in body parser so we can register our own with a
  // larger size limit (needed for base64-encoded image uploads to /api/ai/*).
  // This also lets us control the exact middleware order below.
  const app = await NestFactory.create(ApiGatewayModule, {
    bodyParser: false,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('gateway.port') ?? 3010;
  const corsOrigin = configService.get<string[]>('gateway.corsOrigin') ?? [
    'http://localhost:4200',
  ];

  // IMPORTANT: CORS must be registered BEFORE the body parser. Express
  // middleware runs in registration order, and if the body parser throws
  // (e.g. "PayloadTooLargeError" because the request exceeds the size
  // limit), middleware registered after it never runs. Without CORS headers
  // on that error response, browsers report a misleading
  // "CORS Missing Allow Origin" error instead of the real 413 status.
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Body size limit large enough for base64-encoded images sent to the AI
  // service, while still rejecting obviously abusive payloads (see the
  // dedicated 413 boundary test in the AI e2e suite).
  const bodyLimit = process.env.BODY_SIZE_LIMIT ?? '50mb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Validate/transform incoming payloads globally.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Parse cookies into req.cookies.
  app.use(cookieParser());

  await app.listen(port);
  Logger.log(
    `🚀 API Gateway is running on http://localhost:${port}`,
    'Bootstrap',
  );
}

void bootstrap();
