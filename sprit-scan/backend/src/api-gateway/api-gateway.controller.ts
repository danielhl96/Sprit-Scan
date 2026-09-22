import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  /** Health check endpoint: GET /health */
  @Get('health')
  getHealth() {
    return this.apiGatewayService.getHealth();
  }
}
