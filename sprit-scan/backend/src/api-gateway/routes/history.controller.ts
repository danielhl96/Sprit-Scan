import { All, Body, Controller, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Method } from 'axios';
import { ProxyService } from '../proxy/proxy.service';
import { UseGuards } from '@nestjs/common';
import { JwtValiGuard } from '../guards/jwt-vali.guard';

/**
 * Forwards every request under `/api/history/*` to the history-microservice.
 */
@Controller('api/history')
@UseGuards(JwtValiGuard)
export class HistoryController {
  constructor(private readonly proxy: ProxyService) {}

  /**
   * Build a safe subset of incoming headers to pass to the history microservice.
   *
   * Why these headers:
   * - authorization: forwards the Bearer token so JWT guards in the microservice can authenticate the user.
   * - cookie: forwards cookies when downstream logic depends on cookie-based auth/session data.
   * - content-type: preserves the body format (e.g. application/json) for correct request parsing.
   *
   * We intentionally do not forward all headers to avoid leaking unnecessary client/proxy metadata.
   */
  private getForwardHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    const authorization = req.headers.authorization;
    if (typeof authorization === 'string') {
      headers.authorization = authorization;
    }

    const cookie = req.headers.cookie;
    if (typeof cookie === 'string') {
      headers.cookie = cookie;
    }

    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string') {
      headers['content-type'] = contentType;
    }

    return headers;
  }

  @All('*path')
  forward(
    @Req() req: Request,
    @Param('path') path: string | string[],
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    const normalizedPath = Array.isArray(path)
      ? path.join('/')
      : (path ?? '').split(',').join('/');

    return this.proxy.forward('history', {
      method: req.method as Method,
      path: `/history/${normalizedPath}`,
      data: body,
      params: query,
      headers: this.getForwardHeaders(req),
    });
  }
}
