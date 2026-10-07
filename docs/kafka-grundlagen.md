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

## 3. Wie wird eine Nachricht gesendet und empfangen?

Dieser Abschnitt beschreibt den kompletten Weg einer Nachricht – Schritt für Schritt – vom Producer bis zum Consumer.

### Schritt 1: Producer sendet (`emit`)

Der Producer ruft `client.emit(topic, payload)` auf. Dabei passiert Folgendes:

1. Das `payload`-Objekt wird **serialisiert** (zu JSON/Bytes umgewandelt).
2. Der Client wählt eine **Partition** des Topics aus. Ohne expliziten Key geschieht das per Round-Robin; mit Key (`{ key, value }`) landen gleiche Keys immer in derselben Partition (wichtig für Reihenfolge).
3. Die Nachricht wird über das Netzwerk an den **Broker** geschickt.
4. Der Broker **persistiert** die Nachricht ans Ende der Partition (append-only Log) und vergibt ihr einen fortlaufenden **Offset** (z. B. 0, 1, 2, …).

```typescript
// Fire-and-forget: sendet ein Event, wartet nicht auf Verarbeitung
this.kafkaProducer.publish('ai.result.created', {
  type: 'spirits',
  userId,
  result,
  createdAt: new Date().toISOString(),
});
```

Wichtig: `emit()` ist **asynchron und fire-and-forget**. Der Producer wartet nur auf die Bestätigung des Brokers ("geschrieben"), **nicht** darauf, dass ein Consumer die Nachricht verarbeitet hat. Sender und Empfänger sind entkoppelt.

### Schritt 2: Nachricht liegt im Topic

Die Nachricht liegt jetzt dauerhaft (bis zur **Retention**, Standard 7 Tage) in der Partition. Sie wird **nicht** gelöscht, nachdem ein Consumer sie gelesen hat – anders als bei klassischen Message-Queues. Dadurch können mehrere Consumer-Gruppen dieselbe Nachricht unabhängig voneinander lesen.

### Schritt 3: Consumer empfängt (`poll`)

Der Consumer **holt** Nachrichten aktiv ab (Pull-Modell), er bekommt sie nicht "zugepusht":

1. Der Consumer fragt den Broker regelmäßig: "Gibt es ab meinem aktuellen Offset neue Nachrichten?" (intern: `poll`).
2. Der Broker liefert einen Batch neuer Nachrichten zurück.
3. kafkajs/NestJS **deserialisiert** jede Nachricht und ruft die passende `@EventPattern`-Methode auf.

```typescript
@EventPattern('ai.result.created')
async handleHistoryEvent(data: any) {
  // 'data' ist die bereits deserialisierte Nachricht
  const { userId, result } = data;
  await this.historyService.createHistoryEntry(userId, result);
}
```

### Schritt 4: Offset committen (Fortschritt speichern)

Nachdem der Handler **erfolgreich** durchgelaufen ist (keine Exception), committet der Consumer den **Offset**: "Bis hier habe ich verarbeitet." Der Offset wird im internen Topic `__consumer_offsets` gespeichert.

- Beim nächsten `poll` liest der Consumer ab dem committeten Offset weiter – die alte Nachricht kommt nicht erneut.
- **Wirft der Handler eine Exception**, wird **nicht** committet → dieselbe Nachricht wird erneut geliefert (siehe Abschnitt 4).

### Zusammengefasst als Ablauf

```
Producer                 Broker (Topic/Partition)              Consumer
   |                            |                                 |
   | emit('ai.result.created')  |                                 |
   |--------------------------->| append @ offset N               |
   |   (ack: geschrieben)       |                                 |
   |<---------------------------|                                 |
   |                            |         poll (ab offset N)       |
   |                            |<--------------------------------|
   |                            | Batch [offset N ...]            |
   |                            |-------------------------------->|
   |                            |                   handler(data) |
   |                            |         commit offset N+1       |
   |                            |<--------------------------------|
```

## 4. Zustellgarantien und Retries

Kafka arbeitet standardmäßig mit **At-least-once**-Zustellung: Jede Nachricht kommt **mindestens einmal** an – unter Umständen aber auch **mehrfach**. Das ist zentral zu verstehen, weil es direkt beeinflusst, wie robust ein Consumer gebaut sein muss.

### Kafka hat kein klassisches "Zustell-Limit"

Anders als RabbitMQ oder SQS zählt Kafka **keine Zustellversuche** und kennt kein "nach 3 Versuchen verwerfen". Stattdessen gilt das **Offset-Prinzip**:

1. Jeder Consumer merkt sich per Offset, bis wohin er verarbeitet hat.
2. Solange der Offset **nicht committet** wird, liest der Consumer dieselbe Nachricht beim nächsten `poll` **wieder**.
3. Das wiederholt sich **praktisch unbegrenzt**, bis der Offset committet wird oder die Nachricht durch die Retention gelöscht wird.

### Was "unbegrenzt" praktisch begrenzt

| Grenze | Standardwert | Bedeutung |
|---|---|---|
| `retention.ms` | 7 Tage | Danach wird die Nachricht gelöscht – obere Grenze für Wiederholungen. |
| `max.poll.interval.ms` | 5 Minuten | Braucht der Handler länger, gilt der Consumer als "tot" → Rebalancing, andere Instanz bekommt die Partition. |
| kafkajs `retries` | 20 (projektspezifisch) | Betrifft **Verbindungs-/Broker-Operationen**, NICHT das fachliche Re-Delivery. |

### Zwei unterschiedliche "Retry"-Ebenen

Ein häufiges Missverständnis – diese beiden Dinge sind klar zu trennen:

| Ebene | Was wird wiederholt | Limit |
|---|---|---|
| **kafkajs `retries: 20`** | Netzwerk-/Broker-Operationen (connect, fetch, commit) | 20 Versuche |
| **Consumer Re-Delivery** | Nicht-committete Nachrichten nach Handler-Fehler | Quasi unbegrenzt (bis Retention) |

In [ai.module.ts](../sprit-scan/backend/src/ai-microservice/ai.module.ts) betrifft die `retry`-Konfiguration also nur die **Verbindung** zum Broker – nicht, wie oft eine fachlich fehlgeschlagene Nachricht erneut verarbeitet wird.

### Beispiel: Die Datenbank fällt aus

Szenario im `history-service`, wenn der DB-Insert scheitert:

1. Handler wirft eine Exception (DB nicht erreichbar).
2. Der Offset wird **nicht** committet.
3. Beim nächsten `poll` kommt dieselbe Nachricht erneut → Handler scheitert wieder.
4. Das wiederholt sich im Poll-Takt, **bis die DB zurück ist** (dann Erfolg + Commit) oder die Retention zuschlägt.

Das ist gewünschtes Verhalten: **keine Nachricht geht verloren**. Nachteil: Da Kafka Nachrichten **pro Partition in Reihenfolge** verarbeitet, blockiert eine hängende Nachricht alle nachfolgenden in derselben Partition (Head-of-line Blocking).

### Deduplizierung: Weil Nachrichten mehrfach kommen können

Weil At-least-once Duplikate zulässt, muss der Consumer **idempotent** sein. In diesem Projekt geschieht das über eine eindeutige `eventId`:

- Der Producer hängt an jedes Event eine `eventId` (UUID).
- Der Consumer speichert verarbeitete `eventId`s in der Tabelle `processed_events` und überspringt bereits bekannte IDs.
- History-Eintrag und `eventId`-Marker werden in **einer Transaktion** geschrieben → entweder beides oder nichts.

So führt selbst eine doppelt zugestellte Nachricht nur zu **einem** History-Eintrag.

### Poison Messages und Dead Letter Queue (DLQ)

Weil Kafka selbst nie "aufgibt", muss **die Anwendung** entscheiden, wann eine dauerhaft fehlerhafte Nachricht (poison message) aussortiert wird. Üblich ist ein eigener Retry-Zähler (z. B. im Message-Header) und ein separates DLQ-Topic:

```typescript
// Pseudocode
const MAX_RETRIES = 5;
if (retryCount >= MAX_RETRIES) {
  await this.publishToDlq(message); // in separates Topic schieben
  return;                            // Offset committen → weitermachen
}
throw error;                         // sonst erneut versuchen
```

Kafka liefert den Retry-Zähler nicht automatisch mit – man muss ihn selbst führen und bei jeder Wiederholung erhöhen.

## 5. Erklärung der verwendeten Funktionen & Konstanten

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

## 6. Ist Kafka ein eigener Microservice (wie Redis)?

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

## 7. Wie würde man Kafka skalieren?

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

## 8. Wie schützt man Kafka vor unbefugtem Zugriff von außen?

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

## 9. Kurzzusammenfassung

- **Producer**: sendet Events, braucht keine Group ID, nutzt `emit()`.
- **Consumer**: empfängt Events, braucht eine Group ID, nutzt `@EventPattern()`.
- **Senden/Empfangen**: Producer `emit()` → Broker persistiert mit Offset → Consumer `poll`t aktiv → Handler läuft → Offset wird committet.
- **Zustellung**: At-least-once – Nachrichten können mehrfach kommen; Kafka wiederholt nicht-committete Nachrichten quasi unbegrenzt (bis Retention/`max.poll.interval.ms`).
- **Retry-Ebenen**: kafkajs `retries` = Verbindungsfehler; Consumer Re-Delivery = fachliche Wiederholung (unbegrenzt).
- **Idempotenz**: Deduplizierung über eindeutige `eventId`, damit Duplikate nur einen Eintrag erzeugen.
- Ein Service kann **beides gleichzeitig** sein, muss es aber nicht (im Projekt: `ai-service` = reiner Producer, `history-service` = reiner Consumer).
- Kafka ist eine **eigene Instanz/eigener Prozess**, genau wie Redis – kein Teil der Anwendungs-Microservices.
- **Skalierung**: mehr Broker (Cluster), mehr Partitionen pro Topic, mehr Consumer-Instanzen in derselben Group.
- **Schutz vor Außenzugriff**: keine öffentlichen Ports, eigenes internes Netzwerk, SASL_SSL (Auth + Verschlüsselung), ACLs (Autorisierung pro Topic/Service).
