# Kafka Grundlagen – Producer vs. Consumer

## 1. Was ist Kafka?

Apache Kafka ist ein verteiltes Event-Streaming-System. Nachrichten werden in **Topics** veröffentlicht und von anderen Services gelesen. Kafka entkoppelt Services: Der Sender (Producer) muss nicht wissen, wer die Nachricht empfängt.

Wichtige Begriffe:

- **Topic**: Benannter Kanal, auf dem Nachrichten abgelegt werden (z. B. `ai.result.created`).
- **Partition**: Ein Topic kann in mehrere Partitionen aufgeteilt werden (Parallelität, Reihenfolge nur innerhalb einer Partition garantiert).
- **Broker**: Ein Kafka-Server-Prozess, der Topics/Partitions hostet (in diesem Projekt: `kafka:9092`).
- **Consumer Group**: Mehrere Consumer, die sich eine Gruppe teilen, bekommen Partitionen aufgeteilt zugewiesen (Lastverteilung, kein doppeltes Lesen innerhalb der Gruppe).
- **Client ID**: Name des Clients beim Broker, nützlich für Logging/Monitoring.

## 2. Producer vs. Consumer

| | Producer | Consumer |
|---|---|---|
| Rolle | Sendet Nachrichten an ein Topic | Liest Nachrichten aus einem Topic |
| Braucht Group ID? | Nein | Ja (für Lastverteilung/Offset-Tracking) |
| Beispiel in diesem Projekt | `ai-microservice` (sendet AI-Ergebnisse) | `history-microservice` (empfängt AI-Ergebnisse) |

### Producer (nur senden)

Aus [sprit-scan/backend/src/ai-microservice/ai.module.ts](../sprit-scan/backend/src/ai-microservice/ai.module.ts):

```typescript
ClientsModule.register([
  {
    name: 'AI_KAFKA_PRODUCER',
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? 'ai-microservice',
        brokers: (process.env.KAFKA_BROKERS ?? 'kafka:9092')
          .split(',')
          .map((broker) => broker.trim())
          .filter(Boolean),
      },
      producerOnlyMode: true,
    },
  },
]),
```

Aus [sprit-scan/backend/src/ai-microservice/ai-kafka-producer.service.ts](../sprit-scan/backend/src/ai-microservice/ai-kafka-producer.service.ts):

```typescript
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
```

Verwendung in [sprit-scan/backend/src/ai-microservice/ai.service.ts](../sprit-scan/backend/src/ai-microservice/ai.service.ts):

```typescript
this.kafkaProducer.publish('ai.result.created', {
  type: 'spirits',
  userId,
  result,
  createdAt: new Date().toISOString(),
});
```

### Consumer (nur empfangen)

Aus [sprit-scan/backend/src/history-microservice/main.ts](../sprit-scan/backend/src/history-microservice/main.ts):

```typescript
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
    },
    consumer: {
      groupId: process.env.KAFKA_CONSUMER_GROUP_ID ?? 'history-service-consumer',
    },
  },
});

await app.startAllMicroservices();
```

Aus [sprit-scan/backend/src/history-microservice/history-consumer.controller.ts](../sprit-scan/backend/src/history-microservice/history-consumer.controller.ts):

```typescript
@Controller()
export class HistoryConsumerController {
  @EventPattern('ai.result.created')
  handleHistoryEvent(data: any) {
    console.log('Received history event:', data);
  }
}
```

## 3. Erklärung der verwendeten Funktionen & Konstanten

### `Transport.KAFKA`
Konstante aus `@nestjs/microservices`. Sagt Nest, dass Kafka als Transport-Layer verwendet wird (statt z. B. TCP, Redis, RabbitMQ).

### `ClientsModule.register([...])`
Registriert einen oder mehrere Kafka-Clients im Nest-Modul. Der `name` (`'AI_KAFKA_PRODUCER'`) wird später per `@Inject(...)` referenziert.

### `producerOnlyMode: true`
Optimierung: Der Client verbindet sich nur als Producer, startet keine unnötige Consumer-Logik.

### `ClientKafka`
Injectable Kafka-Client-Klasse aus `@nestjs/microservices`. Stellt `emit()` und `send()` bereit.

### `client.connect()`
Baut die Verbindung zum Broker explizit auf (wichtig bei `onModuleInit`, damit der Producer vor dem ersten `emit()` bereit ist).

### `client.emit(topic, payload)`
Sendet ein **Event** (fire-and-forget) an ein Topic. Keine Antwort wird erwartet.

### `client.send(topic, payload)`
Sendet eine **Request/Response**-Nachricht. Erwartet eine Antwort vom Empfänger (RPC-Style). Wird hier nicht verwendet, da nur Events gebraucht werden.

### `app.connectMicroservice(options)`
Verbindet die Nest-HTTP-Anwendung zusätzlich mit einem Microservice-Transport (hier Kafka), sodass HTTP und Kafka parallel laufen.

### `app.startAllMicroservices()`
Startet alle über `connectMicroservice()` registrierten Microservices (hier: den Kafka-Consumer).

### `@EventPattern('topic-name')`
Decorator aus `@nestjs/microservices`. Markiert eine Methode als Handler für eingehende Kafka-Events auf dem angegebenen Topic.

### `groupId`
Pflichtangabe für Consumer. Mehrere Instanzen mit derselben `groupId` teilen sich die Partitionen eines Topics (Skalierung ohne doppeltes Verarbeiten).

### `clientId`
Nur zur Identifikation/Logging. Hat keinen Einfluss auf Routing oder Gruppenverhalten.

### `brokers`
Liste von `host:port`-Adressen der Kafka-Broker, zu denen sich der Client verbindet (hier: `kafka:9092` aus Docker Compose).

## 4. Kurzzusammenfassung

- **Producer**: sendet Events, braucht keine Group ID, nutzt `emit()`.
- **Consumer**: empfängt Events, braucht eine Group ID, nutzt `@EventPattern()`.
- Ein Service kann **beides gleichzeitig** sein, muss es aber nicht (im Projekt: `ai-service` = reiner Producer, `history-service` = reiner Consumer).
