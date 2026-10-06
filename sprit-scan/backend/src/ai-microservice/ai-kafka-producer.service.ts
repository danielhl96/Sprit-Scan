import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class AiKafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiKafkaProducerService.name);
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    @Inject('AI_KAFKA_PRODUCER') private readonly client: ClientKafka,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.tryConnect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.client.close();
  }

  publish(topic: string, payload: Record<string, unknown>): void {
    if (!this.isConnected) {
      this.logger.warn(
        `Kafka producer not connected yet, skipping publish to topic "${topic}"`,
      );
      return;
    }
    this.client.emit(topic, payload);
  }

  private async tryConnect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.isConnected = false;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Kafka connection failed: ${message}. Retrying in 5s...`,
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.tryConnect();
    }, 5000);
  }
}
