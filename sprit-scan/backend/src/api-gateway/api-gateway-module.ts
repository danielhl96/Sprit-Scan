import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { ProxyService } from './proxy/proxy.service';
import { gatewayConfig, servicesConfig } from './config/services.config';

import { AuthController } from './routes/auth.controller';
import { ProfileController } from './routes/profile.controller';
import { HistoryController } from './routes/history.controller';
import { AiController } from './routes/ai.controller';

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
  ],
  controllers: [
    ApiGatewayController,
    AuthController,
    ProfileController,
    HistoryController,
    AiController,
  ],
  providers: [ApiGatewayService, ProxyService],
})
export class ApiGatewayModule {}
