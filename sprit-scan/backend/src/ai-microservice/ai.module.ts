import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiKafkaProducerService } from './ai-kafka-producer.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register([
      {
        name: 'AI_KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_CLIENT_ID ?? 'ai-microservice',
            brokers: (process.env.KAFKA_BROKERS ?? 'kafka:9092')
              .split(',')
              .map((broker) => broker.trim())
              .filter(Boolean),
          },
          producerOnlyMode: true,
        },
      },
    ]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiKafkaProducerService],
})
export class AiModule {}
