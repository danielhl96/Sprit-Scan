import {
  Controller,
  Post,
  HttpStatus,
  HttpCode,
  Delete,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  Param,
  Get,
} from '@nestjs/common';
import type { Request } from 'express';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post('entry')
  @HttpCode(HttpStatus.CREATED)
  async createHistoryEntry(@Req() req: Request, @Body() body: any) {}

  @Get('entries')
  @HttpCode(HttpStatus.OK)
  async getHistoryEntries(@Req() req: Request) {}
  @Delete('entry/:id')
  @HttpCode(HttpStatus.OK)
  async deleteHistoryEntry(@Param('id') id: string, @Req() req: Request) {}
}
