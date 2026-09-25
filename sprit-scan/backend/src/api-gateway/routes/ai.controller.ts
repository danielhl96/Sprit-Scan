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
/**
 * Forwards every request under `/api/ai/*` to the ai-microservice.
 */
@Controller('api/ai')
@UseGuards(JwtValiGuard)
export class AiController {
  constructor(private readonly proxy: ProxyService) {}

  @All('*path')
  forward(
    @Req() req: Request,
    @Param('path') path: string,
    @Query() query: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    return this.proxy.forward('ai', {
      method: req.method as Method,
      path: `/${path ?? ''}`,
      data: body,
      params: query,
    });
  }
}
