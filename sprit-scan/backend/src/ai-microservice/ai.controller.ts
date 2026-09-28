import { AiService } from './ai.service';
import {
  Controller,
  Post,
  HttpStatus,
  HttpCode,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import type {
  AuthenticatedRequest,
  DataBodyExpert,
  DataBodySpirits,
} from '../types';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  private requireUserId(req: AuthenticatedRequest): string {
    const headerUserId = req.headers['x-user-id'];
    const forwardedUserId =
      typeof headerUserId === 'string'
        ? headerUserId
        : Array.isArray(headerUserId)
          ? headerUserId[0]
          : undefined;

    const userId = forwardedUserId ?? req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return userId;
  }

  @HttpCode(HttpStatus.OK)
  @Post('expert')
  async expert(@Req() req: AuthenticatedRequest, @Body() body: DataBodyExpert) {
    const userId = this.requireUserId(req);
    return this.aiService.expert(userId, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('spirits')
  async assistant(
    @Req() req: AuthenticatedRequest,
    @Body() body: DataBodySpirits,
  ) {
    const userId = this.requireUserId(req);
    return this.aiService.spirits(userId, body);
  }
}
