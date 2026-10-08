# Microservices Grundlagen

## 1. Was ist eine Microservice-Architektur?

Bei einer **Microservice-Architektur** wird eine Anwendung in mehrere kleine, unabhängige Services aufgeteilt. Jeder Service:

- ist für **genau einen fachlichen Bereich** zuständig (Single Responsibility),
- läuft als **eigener Prozess** (eigener Container),
- hat seine **eigene Datenbank**,
- kommuniziert mit anderen Services nur über **definierte Schnittstellen** (HTTP, Events), nie durch direkten Zugriff auf deren interne Daten.

Das Gegenstück ist der **Monolith**: eine einzige große Anwendung, in der alle Funktionen (Auth, History, AI, …) im selben Prozess und meist in derselben Datenbank liegen.

## 2. Die Services in diesem Projekt

Sprit-Scan ist konsequent in Microservices aufgeteilt. Jeder Service hat eine klar abgegrenzte Aufgabe:

| Service | Aufgabe | Eigene DB | Kommunikation |
|---|---|---|---|
| **api-gateway** | Einziger öffentlicher Eingang, leitet Anfragen weiter, prüft JWT | – | HTTP zu allen Services |
| **auth-service** | Registrierung, Login, User-Verwaltung, Passwörter | `auth-db` | HTTP (via Gateway), Kafka-Producer |
| **history-service** | Speichert & liefert Scan-Historie | `history-db` | HTTP (via Gateway), Kafka-Consumer |
| **ai-service** | OpenAI-Anbindung (Expertenfragen, Bildanalyse) | – | HTTP (via Gateway), Kafka-Producer |

Unterstützende Infrastruktur (keine eigenen Microservices, sondern geteilte Bausteine):

- **Kafka**: Event-Bus für asynchrone Kommunikation zwischen Services.
- **Redis**: Cache / Token-Blacklist / Session-Daten.
- **PostgreSQL**: je Service eine eigene Instanz (`auth-db`, `history-db`).

### Architektur-Überblick

```
                 ┌─────────────┐
   Browser  ───▶ │  Frontend   │  (Angular, Port 4200)
                 └──────┬──────┘
                        │ HTTP
                 ┌──────▼──────┐
                 │ api-gateway │  (einziger öffentlicher Eingang, Port 3000)
                 └──┬───┬───┬──┘
          HTTP      │   │   │      HTTP
        ┌───────────┘   │   └───────────┐
        ▼               ▼               ▼
 ┌────────────┐  ┌────────────┐  ┌────────────┐
 │auth-service│  │history-svc │  │ ai-service │
 │  auth-db   │  │ history-db │  │            │
 └─────┬──────┘  └─────▲──────┘  └─────┬──────┘
       │               │               │
       │  auth.user.   │  ai.result.   │
       │   deleted     │   created     │
       └──────────▶ ┌──┴───┐ ◀─────────┘
                    │ Kafka │  (Event-Bus)
                    └───────┘
```

## 3. Warum wird diese Architektur verwendet?

### a) Unabhängige Entwicklung & Deployment
Jeder Service kann **separat** entwickelt, getestet und deployed werden. Ein Fix am ai-service erfordert kein erneutes Deployment des auth-service.

### b) Skalierbarkeit pro Service
Nur der Service, der Last hat, wird skaliert. Braucht die Bildanalyse mehr Leistung, startet man mehr `ai-service`-Instanzen – nicht die gesamte Anwendung.

### c) Technologische Freiheit
Jeder Service könnte theoretisch eine andere Sprache/Framework nutzen. In diesem Projekt ist alles NestJS, aber die Freiheit besteht.

### d) Fehlerisolation (Resilience)
Fällt der ai-service aus, können Login (auth) und History weiter funktionieren. Beim Monolithen würde ein Absturz oft die **gesamte** Anwendung lahmlegen.

### e) Klare fachliche Grenzen
Die Trennung zwingt zu sauberen Schnittstellen und verhindert, dass unterschiedliche Fachbereiche sich gegenseitig "verschmutzen".

## 4. Kernkonzepte

### a) Datenbank pro Service ("Database per Service")
Jeder Service besitzt seine **eigene** Datenbank und ist der einzige, der direkt darauf zugreift. Kein anderer Service liest/schreibt fremde Tabellen.

- Vorteil: starke Entkopplung, Services können ihr Datenmodell frei ändern.
- Konsequenz: Es gibt **keine** service-übergreifenden SQL-Joins oder DB-Transaktionen. Konsistenz muss anders gelöst werden (siehe Events / Saga).

Im Projekt: `auth-db` gehört **nur** dem auth-service, `history-db` **nur** dem history-service.

### b) API-Gateway
Ein einziger, öffentlich erreichbarer Eingang. Er:

- leitet Anfragen an den richtigen Service weiter (Routing/Proxy),
- validiert das JWT zentral und reicht Nutzerkontext (`x-user-id`, `x-user-email`) weiter,
- verbirgt die interne Struktur (Clients kennen nur das Gateway, nicht die einzelnen Services).

Im Projekt liegt nur das Gateway in einem von außen erreichbaren Netzwerk; die Services selbst sind in internen Netzwerken isoliert.

### c) Synchrone vs. asynchrone Kommunikation

**Synchron (HTTP, Request/Response):** Der Aufrufer wartet auf die Antwort.
- Beispiel: Frontend → Gateway → auth-service (Login).
- Vorteil: einfach, sofortige Antwort.
- Nachteil: enge zeitliche Kopplung – ist das Ziel langsam/down, wartet/scheitert der Aufruf.

**Asynchron (Events über Kafka):** Der Sender feuert ein Event ab und wartet nicht.
- Beispiel: ai-service sendet `ai.result.created`, history-service verarbeitet es später.
- Vorteil: lose Kopplung, Resilienz, Services müssen nicht gleichzeitig online sein.
- Nachteil: komplexer, Ergebnis ist nicht sofort da (Eventual Consistency).

### d) Eventual Consistency
Da jeder Service seine eigene DB hat, sind Daten nicht **sofort** überall konsistent, sondern werden **nach und nach** über Events abgeglichen.

Beispiel aus dem Projekt: Wird ein User gelöscht, sendet der auth-service `auth.user.deleted`. Der history-service löscht daraufhin die zugehörige Historie – wenige Millisekunden **später**. Kurzzeitig existiert die Historie noch, obwohl der User weg ist. Für diesen Anwendungsfall ist das akzeptabel.

### e) Service Discovery / Netzwerk
Services finden sich über **Hostnamen** (in Docker: der Servicename). Beispiel: Das Gateway erreicht den auth-service unter `http://auth-service:3001`. Welche Services sich erreichen dürfen, wird über **Docker-Netzwerke** gesteuert (Isolation).

## 5. Kommunikationsmuster im Projekt konkret

### Synchron: Login
```
Frontend ──POST /api/auth/login──▶ api-gateway ──▶ auth-service
                                                      │
Frontend ◀────── JWT-Cookie ◀──── api-gateway ◀──────┘
```

### Asynchron: Scan-Ergebnis speichern
```
ai-service ──emit('ai.result.created')──▶ Kafka ──▶ history-service ──▶ history-db
```
Der ai-service wartet **nicht**, bis die History gespeichert ist – er sendet nur das Event.

### Asynchron: User-Löschung kaskadieren
```
auth-service ──delete user──▶ auth-db
auth-service ──emit('auth.user.deleted')──▶ Kafka ──▶ history-service ──▶ löscht History
```
So wird Datenaufräumen über Servicegrenzen hinweg erreicht, **ohne** dass der auth-service die history-db kennt.

## 6. Vorteile im Überblick

- **Unabhängiges Deployment**: Services einzeln ausrollbar, kürzere Release-Zyklen.
- **Gezielte Skalierung**: nur belastete Services skalieren.
- **Fehlerisolation**: Ausfall eines Service legt nicht alles lahm.
- **Technologiefreiheit**: pro Service wählbar.
- **Klare Verantwortlichkeiten**: ein Team/Service pro Fachbereich.
- **Bessere Wartbarkeit**: kleine Codebasen sind leichter zu verstehen.
- **Lose Kopplung** durch Events: Services kennen einander kaum.

## 7. Nachteile & Herausforderungen

- **Erhöhte Komplexität**: viele bewegliche Teile (mehrere Services, DBs, Netzwerke, ein Event-Bus).
- **Verteilte Systeme sind schwer**: Netzwerkfehler, Latenz, Teilausfälle müssen aktiv behandelt werden.
- **Datenkonsistenz**: keine DB-übergreifenden Transaktionen → Eventual Consistency, Deduplizierung, evtl. Saga-Pattern.
- **Debugging/Monitoring**: Ein Request läuft über mehrere Services → zentrales Logging/Tracing nötig.
- **Betrieb/DevOps-Aufwand**: Container-Orchestrierung, Deployments, Netzwerke, CI/CD.
- **Netzwerk-Overhead**: Service-zu-Service-Kommunikation ist langsamer als ein In-Process-Methodenaufruf.
- **Doppelter Code/Infrastruktur**: jeder Service bringt eigenes Setup mit.

## 8. Wann Microservices – und wann nicht?

**Gut geeignet, wenn:**
- die Anwendung groß ist und mehrere Teams parallel arbeiten,
- einzelne Bereiche sehr unterschiedlich skalieren müssen,
- hohe Verfügbarkeit / Fehlerisolation wichtig ist,
- Bereiche unabhängig deploybar sein sollen.

**Eher ungeeignet, wenn:**
- das Projekt klein ist oder ein kleines Team hat,
- die fachlichen Grenzen noch unklar sind,
- schnelle Erstentwicklung (MVP) im Vordergrund steht.

> **Faustregel:** Oft startet man mit einem gut strukturierten Monolithen ("Modular Monolith") und zerlegt ihn **später** in Microservices, wenn die Grenzen klar und die Skalierungsbedürfnisse real sind.

## 9. Gegenüberstellung: Monolith vs. Microservices

| Aspekt | Monolith | Microservices |
|---|---|---|
| Codebasis | eine große | viele kleine |
| Deployment | alles zusammen | pro Service |
| Skalierung | gesamte App | einzelne Services |
| Datenbank | meist eine | eine pro Service |
| Fehlerausbreitung | hoch | isoliert |
| Komplexität | niedriger | höher (verteiltes System) |
| Kommunikation | In-Process-Aufruf | HTTP / Events über Netzwerk |
| Konsistenz | sofort (eine DB) | eventual (über Events) |
| Einstieg/MVP | schnell | aufwändiger |

## 10. Best Practices (im Projekt angewandt)

- **Database per Service**: `auth-db`, `history-db` strikt getrennt.
- **API-Gateway** als einziger Eingang mit zentraler JWT-Prüfung.
- **Netzwerk-Isolation**: Services nur in den Netzwerken, die sie brauchen (`internal`, `app-network`, `kafka-network`).
- **Asynchrone Events** für service-übergreifende Vorgänge (Kafka) statt direkter Service-zu-Service-HTTP-Calls.
- **Idempotenz / Deduplizierung**: Events tragen eine `eventId`, der Consumer verhindert doppelte Verarbeitung (wichtig bei Kafkas At-least-once-Zustellung).
- **Resiliente Verbindungen**: Reconnect-Logik bei Kafka-Producern, damit ein kurzzeitig nicht erreichbarer Broker den Service nicht crasht.
- **Events beschreiben Vergangenes**: Namen im Past Tense (`user.deleted`, `result.created`) – erst handeln, dann Event senden.

## 11. Kurzzusammenfassung

- Microservices zerlegen eine Anwendung in **kleine, unabhängige Services** mit je eigener DB und klarer Aufgabe.
- Kommunikation erfolgt **synchron** (HTTP, via Gateway) oder **asynchron** (Events über Kafka).
- **Vorteile**: unabhängiges Deployment, gezielte Skalierung, Fehlerisolation, lose Kopplung.
- **Nachteile**: höhere Komplexität, verteilte Systeme, Eventual Consistency, mehr Betriebsaufwand.
- Die Architektur lohnt sich bei **größeren Systemen**; kleine Projekte fahren mit einem Monolithen oft besser.
- Sprit-Scan setzt die wichtigsten Muster um: Gateway, Database-per-Service, Netzwerk-Isolation, eventbasierte Entkopplung und idempotente Consumer.
