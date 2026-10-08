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

  /**
   * Handles user deletion coming from the auth service.
   * Removes all history entries that belong to the deleted user.
   */
  @EventPattern('auth.user.deleted')
  async handleUserDeleted(data: any) {
    const { userId } = data;

    if (!userId) {
      this.logger.warn('Received "auth.user.deleted" without userId, ignoring');
      return;
    }

    const deleted = await this.historyService.deleteAllForUser(userId);
    this.logger.log(`Deleted ${deleted} history entries for user "${userId}"`);
  }
}
