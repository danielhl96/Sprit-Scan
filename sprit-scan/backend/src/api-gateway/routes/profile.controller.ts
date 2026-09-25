import { All, Body, Controller, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Method } from 'axios';
import { ProxyService } from '../proxy/proxy.service';
import { UseGuards } from '@nestjs/common';
import { JwtValiGuard } from '../guards/jwt-vali.guard';

/**
 * Forwards every request under `/api/profile/*` to the profile-microservice.
 */
@Controller('api/profile')
@UseGuards(JwtValiGuard)
export class ProfileController {
  constructor(private readonly proxy: ProxyService) {}

  @All('*path')
  forward(
    @Req() req: Request,
    @Param('path') path: string,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.proxy.forward('profile', {
      method: req.method as Method,
      path: `/${path ?? ''}`,
      data: body,
      params: query,
    });
  }
}
