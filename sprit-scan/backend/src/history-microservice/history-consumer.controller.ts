import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller()
export class HistoryConsumerController {
  @EventPattern('ai.result.created')
  handleHistoryEvent(data: any) {
    console.log('Received history event:', data);
    // Handle the event data as needed
  }
}
