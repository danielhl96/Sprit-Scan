import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { HistoryService } from './history.service';

@Controller()
export class HistoryConsumerController {
  constructor(private readonly historyService: HistoryService) {}

  @EventPattern('ai.result.created')
  async handleHistoryEvent(data: any) {
    const { userId, result } = data;

    if (!userId || !result) {
      // Handle missing userId or result
      return;
    }

    await this.historyService.createHistoryEntry(userId, result);
  }
}
