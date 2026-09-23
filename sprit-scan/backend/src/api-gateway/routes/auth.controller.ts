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

  @All('*path')
  async forward(
    @Req() req: Request,
    @Param('path') path: string,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const response = await this.proxy.forward<unknown>('auth', {
      method: req.method as Method,
      // Auth microservice routes are mounted under /auth/*
      path: `/auth/${path ?? ''}`,
      data: body,
      params: query,
    });

    if (req.method === 'POST' && path === 'login') {
      const token = (response as { access_token?: string }).access_token;
      if (token) {
        res.cookie('access_token', token, this.getCookieOptions());
      }
      return { message: 'Login successful' };
    }

    if (req.method === 'POST' && path === 'logout') {
      res.clearCookie('access_token', this.getCookieOptions());
      res.status(HttpStatus.NO_CONTENT);
      return;
    }

    return response;
  }
}
