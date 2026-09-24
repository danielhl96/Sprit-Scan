import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ApiGatewayModule } from './api-gateway-module';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('gateway.port') ?? 3000;
  const corsOrigin = configService.get<string[]>('gateway.corsOrigin') ?? [
    'http://localhost:4200',
  ];

  // Allow the Angular frontend to call the gateway.
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

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
