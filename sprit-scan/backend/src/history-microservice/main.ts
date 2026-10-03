import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { HistoryModule } from './history.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(HistoryModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA, // Transport.KAFKA
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
      },
      consumer: {
        groupId: process.env.KAFKA_GROUP_ID ?? 'history-service-consumer',
      },
    },
  });

  const configService = app.get(ConfigService);
  const port = parseInt(configService.get<string>('PORT') ?? '3003', 10);

  // Apply request validation globally:
  // - transform: converts plain JSON payloads into DTO class instances/types
  // - whitelist: strips properties that are not declared in the DTO
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Start the HTTP listener first so the API gateway can reach this service
  // immediately. The Kafka consumer group join/rebalance can take 20-30s,
  // which previously blocked app.listen() and caused ECONNREFUSED on every
  // service restart.
  await app.listen(port);
  Logger.log(
    `🚀 History Microservice is running on http://localhost:${port}`,
    'Bootstrap',
  );

  await app.startAllMicroservices();
  Logger.log('✅ Kafka consumer connected', 'Bootstrap');
}

void bootstrap();
