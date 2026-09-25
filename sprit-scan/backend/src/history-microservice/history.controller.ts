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

import type { AuthenticatedRequest } from '../types';

import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

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

  @Post('entry')
  @HttpCode(HttpStatus.CREATED)
  async createHistoryEntry(
    @Req() req: AuthenticatedRequest,
    @Body() body: any,
  ) {
    const userId = this.requireUserId(req);
    return this.historyService.createHistoryEntry(userId, body);
  }

  @Get('entries')
  @HttpCode(HttpStatus.OK)
  async getHistoryEntries(@Req() req: AuthenticatedRequest) {
    const userId = this.requireUserId(req);
    return this.historyService.getHistoryEntries(userId);
  }
  @Delete('entry/:id')
  @HttpCode(HttpStatus.OK)
  async deleteHistoryEntry(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const userId = this.requireUserId(req);
    return this.historyService.deleteHistoryEntry(userId, id);
  }
}
