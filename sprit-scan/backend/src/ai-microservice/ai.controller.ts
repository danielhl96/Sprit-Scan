import { AiService } from './ai.service';
import {
  Controller,
  Post,
  HttpStatus,
  HttpCode,
  Delete,
  Body,
  Req,
  UnauthorizedException,
  Param,
  Get,
} from '@nestjs/common';

import type {
  AuthenticatedRequest,
  DataBodyExpert,
  DataBodySpirits,
} from '../types';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}
  @HttpCode(HttpStatus.OK)
  @Post('expert')
  async expert(@Req() req: AuthenticatedRequest, @Body() body: DataBodyExpert) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return this.aiService.expert(userId, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('spirits')
  async assistant(
    @Req() req: AuthenticatedRequest,
    @Body() body: DataBodySpirits,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }
    return this.aiService.spirits(userId, body);
  }
}
