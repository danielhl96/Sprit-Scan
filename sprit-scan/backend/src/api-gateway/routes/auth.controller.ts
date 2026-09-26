import {
  All,
  Body,
  Controller,
  HttpStatus,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Method } from 'axios';
import { ProxyService } from '../proxy/proxy.service';
import { redisClient } from 'src/redis/redis';

/**
 * Forwards every request under `/api/auth/*` to the auth-microservice.
 * The microservice itself is not implemented yet – this controller only
 * defines the public REST surface of the gateway.
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly proxy: ProxyService) {}

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private getCookieOptions() {
    const production = this.isProduction();
    return {
      httpOnly: true,
      secure: production,
      sameSite: production ? ('none' as const) : ('lax' as const),
      path: '/',
      maxAge: 2 * 60 * 60 * 1000, // 2h
    };
  }

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
  async forward(
    @Req() req: Request,
    @Param('path') path: string,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (req.method === 'POST' && path === 'logout') {
      const token = req.cookies?.access_token as string | undefined;
      if (token) {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        const ttl = payload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisClient.set(`blacklist_${token}`, 'true', { EX: ttl });
          console.log(`Token blacklisted for ${ttl} seconds`);
        }
      }
      res.clearCookie('access_token');
      res.status(HttpStatus.NO_CONTENT);
      return;
    }

    const normalizedPath = Array.isArray(path)
      ? path.join('/')
      : (path ?? '').split(',').join('/');

    const response = await this.proxy.forward<unknown>('auth', {
      method: req.method as Method,
      // Auth microservice routes are mounted under /auth/*
      path: `/auth/${normalizedPath}`,
      data: body,
      params: query,
      headers: this.getForwardHeaders(req),
    });

    if (req.method === 'POST' && path === 'login') {
      const token = (response as { access_token?: string }).access_token;
      if (token) {
        res.cookie('access_token', token, this.getCookieOptions());
      }
      return { message: 'Login successful' };
    }

    return response;
  }
}
