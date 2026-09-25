import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { ProxyService } from './proxy/proxy.service';
import { gatewayConfig, servicesConfig } from './config/services.config';

import { AuthController } from './routes/auth.controller';
import { ProfileController } from './routes/profile.controller';
import { HistoryController } from './routes/history.controller';
import { AiController } from './routes/ai.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    // Load .env once, globally, and register the typed config namespaces.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [servicesConfig, gatewayConfig],
    }),
    // Configure the HTTP client used to talk to the microservices via REST.
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('gateway.httpTimeout') ?? 5000,
        maxRedirects: 5,
      }),
    }),
    // Rate limiting: protect the gateway from abuse / too many requests.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('gateway.rateTtl') ?? 60000,
            limit: config.get<number>('gateway.rateLimit') ?? 100,
          },
        ],
      }),
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [
    ApiGatewayController,
    AuthController,
    ProfileController,
    HistoryController,
    AiController,
  ],
  providers: [
    ApiGatewayService,
    ProxyService,
    // Apply the throttler globally to every route.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ApiGatewayModule {}
