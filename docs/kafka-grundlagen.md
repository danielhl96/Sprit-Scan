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

## 4. Ist Kafka ein eigener Microservice (wie Redis)?

Ja. Kafka läuft als **eigenständiger Container/Prozess**, genau wie `redis` in diesem Projekt – kein Teil von `ai-service` oder `history-service`, sondern eine eigene Instanz, mit der sich alle Services nur über das Netzwerk verbinden.

Aus [docker-compose.yml](../docker-compose.yml):

```yaml
kafka:
  image: confluentinc/cp-kafka:7.7.1
  environment:
    - KAFKA_NODE_ID=1
    - KAFKA_PROCESS_ROLES=broker,controller
    ...
  networks:
    - app-network
```

Der Unterschied zu Redis:
- **Redis** ist ein einzelner Prozess (Key-Value-Store), i. d. R. eine Instanz reicht für kleine Projekte.
- **Kafka** ist von Natur aus auf **verteilten Betrieb** (mehrere Broker = "Cluster") ausgelegt. Aktuell läuft hier nur **ein Broker** (`KAFKA_NODE_ID=1`), das ist technisch aber bereits ein Mini-Cluster mit Clustergröße 1.

Kein Service im Projekt "ist" Kafka – `ai-service` und `history-service` sind nur **Clients**, die sich mit dem Kafka-Broker verbinden (genau wie sie sich mit `redis` über `REDIS_URL` verbinden).

## 5. Wie würde man Kafka skalieren?

### a) Mehr Broker (horizontale Skalierung des Clusters)

Statt einem Broker (`KAFKA_NODE_ID=1`) startet man mehrere Broker-Container, die sich im selben Cluster zusammenschließen:

```yaml
kafka-1:
  image: confluentinc/cp-kafka:7.7.1
  environment:
    - KAFKA_NODE_ID=1
    - KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
    ...

kafka-2:
  environment:
    - KAFKA_NODE_ID=2
    - KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
    ...

kafka-3:
  environment:
    - KAFKA_NODE_ID=3
    - KAFKA_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
    ...
```

Vorteile:
- **Mehr Durchsatz**: Partitionen eines Topics werden über mehrere Broker verteilt.
- **Ausfallsicherheit**: Fällt ein Broker aus, übernehmen die anderen (bei `replicationFactor > 1`).

Wichtiger Parameter dafür: `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR` und die Topic-Replikation (`--replication-factor 3` beim Anlegen eines Topics), damit Daten auf mehreren Brokern gespiegelt werden.

### b) Mehr Partitionen pro Topic

Mehr Partitionen erlauben mehr **parallele Consumer** innerhalb derselben Consumer Group:

```bash
kafka-topics --bootstrap-server kafka:9092 \
  --alter --topic ai.result.created --partitions 6
```

Faustregel: Anzahl Partitionen ≥ Anzahl gewünschter paralleler Consumer-Instanzen. Hat ein Topic z. B. 6 Partitionen, können bis zu 6 Instanzen von `history-service` (gleiche `groupId`) parallel lesen – jede bekommt eine eigene Partition zugewiesen.

### c) Mehr Consumer-Instanzen (horizontale Skalierung der Services)

In Compose/Kubernetes einfach mehr Replicas von `history-service` starten (gleiche `KAFKA_GROUP_ID`):

```yaml
history-service:
  deploy:
    replicas: 3
```

Kafka verteilt dann automatisch die Partitionen auf die laufenden Consumer der Gruppe (Rebalancing).

## 6. Wie schützt man Kafka vor unbefugtem Zugriff von außen?

### a) Keine öffentlichen Ports exponieren

Aktuell hat `kafka` in [docker-compose.yml](../docker-compose.yml) **keinen** `ports:`-Eintrag nach außen – das ist schon richtig. Kafka ist nur innerhalb des Docker-Netzwerks erreichbar, nicht vom Host/Internet aus.

### b) Eigenes, isoliertes Netzwerk

Kafka sollte nicht im selben Netzwerk wie öffentlich erreichbare Services (`frontend`, `api-gateway`) liegen. Besser: ein eigenes internes Netz, das nur von den Services erreichbar ist, die wirklich mit Kafka sprechen müssen (`ai-service`, `history-service`):

```yaml
networks:
  kafka-net:
    driver: bridge
    internal: true   # kein Zugriff auf/von außerhalb von Docker möglich
```

### c) Authentifizierung (SASL) + Verschlüsselung (SSL)

Ohne Auth kann sich **jeder Client im selben Netzwerk** mit Kafka verbinden. Mit `SASL_SSL`:
- Jeder Client braucht gültige Credentials (Username/Passwort via SCRAM).
- Die Verbindung ist verschlüsselt (TLS), kein Mitlesen im Netzwerk möglich.

Siehe Abschnitt weiter oben/im Chat besprochen: `KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=SASL_SSL`.

### d) Autorisierung (ACLs)

Selbst mit gültigen Credentials sollte nicht jeder Client alles dürfen:
- `ai-service` darf nur auf `ai.*`-Topics **schreiben**.
- `history-service` darf nur von `ai.*`-Topics **lesen**.
- `KAFKA_ALLOW_EVERYONE_IF_NO_ACL_FOUND=false` sorgt dafür, dass alles standardmäßig verboten ist, außer explizit erlaubt.

### e) Firewall/Security Groups (bei Cloud-Deployment)

Falls Kafka irgendwann auf einem eigenen Server/VM läuft (nicht mehr nur im Docker-Netz): Nur die IPs/Security-Groups der bekannten Backend-Services dürfen Port 9092 erreichen, niemand sonst.

## 7. Kurzzusammenfassung

- **Producer**: sendet Events, braucht keine Group ID, nutzt `emit()`.
- **Consumer**: empfängt Events, braucht eine Group ID, nutzt `@EventPattern()`.
- Ein Service kann **beides gleichzeitig** sein, muss es aber nicht (im Projekt: `ai-service` = reiner Producer, `history-service` = reiner Consumer).
- Kafka ist eine **eigene Instanz/eigener Prozess**, genau wie Redis – kein Teil der Anwendungs-Microservices.
- **Skalierung**: mehr Broker (Cluster), mehr Partitionen pro Topic, mehr Consumer-Instanzen in derselben Group.
- **Schutz vor Außenzugriff**: keine öffentlichen Ports, eigenes internes Netzwerk, SASL_SSL (Auth + Verschlüsselung), ACLs (Autorisierung pro Topic/Service).
