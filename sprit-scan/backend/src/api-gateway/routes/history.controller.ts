import { All, Body, Controller, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Method } from 'axios';
import { ProxyService } from '../proxy/proxy.service';

/**
 * Forwards every request under `/api/history/*` to the history-microservice.
 */
@Controller('api/history')
export class HistoryController {
  constructor(private readonly proxy: ProxyService) {}

  @All('*path')
  forward(
    @Req() req: Request,
    @Param('path') path: string,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.proxy.forward('history', {
      method: req.method as Method,
      path: `/history/${path ?? ''}`,
      data: body,
      params: query,
    });
  }
}
