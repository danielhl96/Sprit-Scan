import {
  All,
  Body,
  Controller,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Method } from 'axios';
import { ProxyService } from '../proxy/proxy.service';
import { JwtValiGuard } from '../guards/jwt-vali.guard';
import { AuthenticatedRequest } from 'src/types';
/**
 * Forwards every request under `/api/ai/*` to the ai-microservice.
 */
@Controller('api/ai')
@UseGuards(JwtValiGuard)
export class AiController {
  constructor(private readonly proxy: ProxyService) {}

  private getForwardHeaders(req: AuthenticatedRequest): Record<string, string> {
    const headers: Record<string, string> = {};

    const authorization = req.headers.authorization;
    if (typeof authorization === 'string') {
      headers.authorization = authorization;
    } else {
      const cookieToken = req.cookies?.access_token as string | undefined;
      if (cookieToken) {
        headers.authorization = `Bearer ${cookieToken}`;
      }
    }
    const cookie = req.headers.cookie;
    if (typeof cookie === 'string') {
      headers.cookie = cookie;
    }

    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string') {
      headers['content-type'] = contentType;
    }

    if (typeof req.user?.userId === 'string' && req.user.userId.length > 0) {
      headers['x-user-id'] = req.user.userId;
    }

    if (typeof req.user?.email === 'string' && req.user.email.length > 0) {
      headers['x-user-email'] = req.user.email;
    }

    return headers;
  }

  @All('*path')
  forward(
    @Req() req: Request,
    @Param('path') path: string,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    const normalizedPath = Array.isArray(path)
      ? path.join('/')
      : (path ?? '').split(',').join('/');

    return this.proxy.forward('ai', {
      method: req.method as Method,
      path: `/ai/${normalizedPath}`,
      data: body,
      params: query,
      headers: this.getForwardHeaders(req),
    });
  }
}
