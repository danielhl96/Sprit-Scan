import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AiKafkaProducerService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('AI_KAFKA_PRODUCER') private readonly client: ClientKafka,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  publish(topic: string, payload: Record<string, unknown>): void {
    this.client.emit(topic, payload);
  }
}
