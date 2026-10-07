import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { HistoryService } from './history.service';

@Controller()
export class HistoryConsumerController {
  private readonly logger = new Logger(HistoryConsumerController.name);

  constructor(private readonly historyService: HistoryService) {}

  @EventPattern('ai.result.created')
  async handleHistoryEvent(data: any) {
    const { eventId, userId, result } = data;

    if (!userId || !result) {
      // Handle missing userId or result
      return;
    }

    // Deduplicate: skip events that were already processed.
    // Kafka delivers at-least-once, so the same event may arrive twice.
    if (eventId) {
      const alreadyProcessed =
        await this.historyService.hasProcessedEvent(eventId);
      if (alreadyProcessed) {
        this.logger.warn(
          `Duplicate event "${eventId}" ignored for topic "ai.result.created"`,
        );
        return;
      }
    }

    await this.historyService.createHistoryEntry(userId, result, {
      eventId,
      topic: 'ai.result.created',
    });
  }
}
