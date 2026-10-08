import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from './prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthKafkaProducerService } from './auth-kafka-producer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ClientsModule.register([
      {
        name: 'AUTH_KAFKA_PRODUCER',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_CLIENT_ID ?? 'auth-microservice',
            brokers: (process.env.KAFKA_BROKERS ?? 'kafka:9092')
              .split(',')
              .map((broker) => broker.trim())
              .filter(Boolean),
            retry: {
              initialRetryTime: 1000,
              retries: 20,
            },
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
  controllers: [AuthController],
  providers: [AuthService, AuthKafkaProducerService],
})
export class AuthModule {}
