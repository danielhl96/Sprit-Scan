import { All, Body, Controller, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Method } from 'axios';
import { ProxyService } from '../proxy/proxy.service';

/**
 * Forwards every request under `/api/auth/*` to the auth-microservice.
 * The microservice itself is not implemented yet – this controller only
 * defines the public REST surface of the gateway.
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly proxy: ProxyService) {}

  @All('*path')
  forward(
    @Req() req: Request,
    @Param('path') path: string,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.proxy.forward('auth', {
      method: req.method as Method,
      path: `/${path ?? ''}`,
      data: body,
      params: query,
    });
  }
}
