import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import express from 'express';
import { AiModule } from './ai.module';

async function bootstrap() {
  // Disable Nest's built-in body parser so we can register our own with a
  // larger limit for the base64-encoded image payloads forwarded by the
  // gateway (the default body-parser limit is only 100kb).
  const app = await NestFactory.create(AiModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);
  const port = parseInt(configService.get<string>('PORT') ?? '3004', 10);

  const bodyLimit = process.env.BODY_SIZE_LIMIT ?? '50mb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'ai-microservice',
        brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
      },
      consumer: {
        groupId: 'ai-microservice-consumer',
      },
    },
  });

  // Validate/transform incoming payloads globally.
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Start the HTTP listener first so the API gateway can reach this service
  // immediately. The Kafka consumer group join/rebalance can take 20-30s,
  // which would otherwise block app.listen() and cause ECONNREFUSED on every
  // service restart.
  await app.listen(port);
  Logger.log(
    `🚀 AI Microservice is running on http://localhost:${port}`,
    'Bootstrap',
  );

  await app.startAllMicroservices();
  Logger.log('✅ Kafka consumer connected', 'Bootstrap');
}

void bootstrap();
