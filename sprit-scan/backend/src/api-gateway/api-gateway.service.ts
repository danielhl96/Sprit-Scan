import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceUrls } from './config/services.config';

@Injectable()
export class ApiGatewayService {
  constructor(private readonly configService: ConfigService) {}

  /** Basic health payload including the configured downstream services. */
  getHealth() {
    const services = this.configService.get<ServiceUrls>('services');
    return {
      status: 'ok',
      gateway: 'api-gateway',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
