# Sprit-Scan

Sprit-Scan ist eine Full-Stack-Webanwendung, mit der Benutzer Spirituosen (z. B. Wein oder Whiskey) per Foto scannen, KI-generierte Informationen dazu erhalten, ihren Scan-Verlauf verwalten und mit einem KI-Experten chatten können.

- **Frontend:** Angular SPA (Signals, Standalone Components) inkl. PWA
- **Backend:** NestJS-Microservices hinter einem zentralen API-Gateway
- **Infrastruktur:** Docker Compose, PostgreSQL (Prisma), Redis, Kafka
- **Optionaler Public Access:** Cloudflare Tunnel

---

## Inhaltsverzeichnis

- [Allgemeine Übersicht](#allgemeine-übersicht)
- [Architektur](#architektur)
- [Sicherheit](#sicherheit)
- [Frontend-Architektur](#frontend-architektur)
- [Backend-Architektur](#backend-architektur)
- [Tech Stack](#tech-stack)
- [Projektstruktur](#projektstruktur)
- [Projekt starten](#projekt-starten)
- [Cloudflare Tunnel](#cloudflare-tunnel)
- [PWA-Konfiguration](#pwa-konfiguration)
- [Tests](#tests)
- [CI (GitHub Actions)](#ci-github-actions)
- [Environment Variablen](#environment-variablen)
- [Weiterführende Doku](#weiterführende-doku)

---

## Allgemeine Übersicht

Sprit-Scan besteht aus zwei Hauptteilen:

- Einer **Angular-SPA**, die als Progressive Web App installierbar ist.
- Einem **NestJS-Backend**, das als Microservice-Architektur hinter einem API-Gateway aufgebaut ist.

Kernfunktionen:

- Registrierung/Login mit JWT (als httpOnly-Cookie)
- Bild-Upload zur KI-gestützten Spirituosen-Erkennung
- Persönlicher Scan-Verlauf (History)
- Profilverwaltung (E-Mail/Passwort ändern, Account löschen)
- Chat mit einem KI-Experten

Events zwischen Services (z. B. Cleanup nach Account-Löschung) laufen über **Kafka**, nicht über direkte Service-zu-Service-Aufrufe.

---

## Architektur

```text
Frontend (Angular, :4200)
        |
        v
API Gateway (NestJS, :3000)   <-- einziger öffentlicher Einstiegspunkt
   |            |             |
   v            v             v
Auth (:3001) History (:3003) AI (:3004)
   |            |
   v            v
Auth-DB      History-DB      (+ Redis, + Kafka)

Optional: Cloudflare Tunnel -> frontend.<domain> / backend.<domain>
```

Prinzipien:

- Das **Frontend** kommuniziert ausschließlich mit dem **API-Gateway**.
- Das Gateway leitet Requests über einen generischen `ProxyService` an die passenden Microservices weiter (`/api/auth/*`, `/api/history/*`, `/api/ai/*`).
- Jeder Microservice ist über interne Docker-Netzwerke isoliert und besitzt bei Bedarf eine eigene PostgreSQL-Datenbank (`auth-db`, `history-db`).
- **Kafka** wird für asynchrone, ereignisbasierte Kommunikation genutzt (z. B. `auth.user.deleted` → History-Service räumt zugehörige Einträge auf).
- **Redis** wird u. a. für Token-Blacklisting beim Logout verwendet.

---

## Sicherheit

Wichtige Sicherheitsmechanismen im Projekt:

- **Authentifizierung über JWT**, das als `httpOnly`, `Secure` (in Produktion) und `SameSite=strict` konfiguriertes Cookie gesetzt wird (`access_token`).
  - `httpOnly` verhindert Zugriff per JavaScript (Schutz gegen XSS-Diebstahl).
  - `SameSite=strict` reduziert das Risiko von CSRF, da das Cookie bei Cross-Site-Requests nicht automatisch mitgeschickt wird.
- **Logout mit Token-Blacklisting:** Beim Logout wird das Token in Redis mit verbleibender Gültigkeitsdauer (TTL) gesperrt, damit es nicht weiterverwendet werden kann.
- **Passwort-Hashing** erfolgt mit `argon2` (nicht reversibel, salted).
- **Validierung eingehender Daten** über `class-validator` / `class-transformer` sowie eine globale `ValidationPipe` im Gateway.
- **CORS** wird zentral im Gateway konfiguriert (`CORS_ORIGIN`), sodass nur erlaubte Frontend-Origins zugelassen werden.
- **Rate Limiting** über `@nestjs/throttler` im Gateway, um Brute-Force- und Abuse-Szenarien zu begrenzen.
- **Payload-Size-Limits** verhindern überdimensionierte Request-Bodies (z. B. bei Bild-Uploads).
- **Eventbasierte Datenlöschung:** Wird ein Account gelöscht, wird dies als Kafka-Event (`auth.user.deleted`) propagiert, sodass abhängige Daten (z. B. History) zuverlässig aufgeräumt werden – inklusive Idempotenz über gespeicherte `eventId`s, um doppelte Verarbeitung zu verhindern.

Weiterführende Details (inkl. konkretem CSRF-Angriffsszenario und Begründung für `SameSite=Strict`) stehen in [docs/sicherheit-grundlagen.md](docs/sicherheit-grundlagen.md).

---

## Frontend-Architektur

Das Frontend ist eine **Angular 21**-Anwendung mit Standalone-Components und Signals.

Struktur (`sprit-scan/src/app`):

- `app.routes.ts` – zentrale Route-Konfiguration mit Lazy Loading (`loadComponent`) und `authGuard` für geschützte Routen (`/home`, `/profile`, `/history`, `/ai-expert`).
- `app.config.ts` – globale Provider, u. a. HTTP-Client mit Interceptors sowie Registrierung des Service Workers (`provideServiceWorker`).
- `api/` – HTTP-Infrastruktur:
  - `HttpClientCredentialsInterceptor.ts` – sorgt dafür, dass Cookies (JWT) bei Requests an das Gateway mitgeschickt werden.
  - `HttpClientErrorHandling.ts` – zentrales Error-Handling für HTTP-Responses.
  - `api-root-domain.ts` – liest die Backend-Basis-URL aus `NG_APP_ROOT_DOMAIN` (fällt sonst auf die öffentliche Cloudflare-Domain zurück).
- `guards/` – Route Guards (z. B. `AuthGuard`, der nicht eingeloggte Nutzer zu `/login` umleitet).
- `features/` – Feature-Module je Seite (Login, Register, Home, Scan, History, Profile, AI-Expert).
- `shared/` – wiederverwendbare UI-Komponenten und Services (z. B. Notification-Service, Buttons, Modals, Chat-Bubbles, Scan-Animation).

Wichtige Patterns:

- **Signals** (`signal`, `computed`, `effect`) für reaktiven State statt klassischer RxJS-Subjects an vielen Stellen.
- **Lazy-loaded Routes** reduzieren die initiale Bundle-Größe.
- **Guards** schützen alle eingeloggten Bereiche serverseitig *und* clientseitig (das Gateway validiert das JWT zusätzlich serverseitig).

---

## Backend-Architektur

Das Backend (`sprit-scan/backend/src`) besteht aus folgenden eigenständigen NestJS-Anwendungen:

| Service               | Zweck                                                      | Port | Datenbank   |
| --------------------- | ----------------------------------------------------------- | ---- | ----------- |
| `api-gateway`         | Einziger öffentlicher Einstiegspunkt, Routing, Auth-Check, CORS, Rate Limiting | 3000 | –           |
| `auth-microservice`   | Registrierung, Login, JWT-Ausstellung, Passwort/E-Mail-Änderung, Account-Löschung | 3001 | `auth-db`   |
| `history-microservice`| Speichern/Abfragen des persönlichen Scan-Verlaufs, Kafka-Consumer für Cleanup | 3003 | `history-db`|
| `ai-microservice`     | Bildanalyse und Chat mit KI-Experte über die OpenAI API      | 3004 | – (nutzt Redis) |

Das **API-Gateway**:

1. liest Microservice-URLs aus Umgebungsvariablen (`sprit-scan/backend/src/api-gateway/config/services.config.ts`),
2. validiert eingehende Requests global,
3. prüft/verarbeitet JWT-Cookies für geschützte Routen,
4. leitet Requests über einen generischen `ProxyService` an den passenden Microservice weiter,
5. übersetzt Fehler der Microservices in passende HTTP-Statuscodes (z. B. `502 Bad Gateway`, wenn ein Service nicht erreichbar ist).

Kommunikationsmuster:

- **Synchron (REST):** Frontend → Gateway → Microservice.
- **Asynchron (Kafka):** z. B. `auth-microservice` publiziert `auth.user.deleted`, `history-microservice` konsumiert dieses Event und löscht zugehörige Einträge – mit Idempotenz-Schutz über gespeicherte `eventId`s.

---

## Tech Stack

| Layer         | Technologie                              |
| ------------- | ----------------------------------------- |
| Frontend      | Angular 21, TypeScript, Signals            |
| Styling       | Tailwind CSS 4, DaisyUI                    |
| PWA           | `@angular/service-worker`                  |
| Backend       | NestJS 11 (Node.js 20), TypeScript         |
| Gateway-HTTP  | `@nestjs/axios` (Axios)                    |
| Config        | `@nestjs/config`                           |
| Auth          | JWT (`@nestjs/jwt`), `argon2` Passwort-Hashing |
| Datenbanken   | PostgreSQL 15 + Prisma                     |
| Messaging     | Kafka (`kafkajs`)                          |
| Cache/Session | Redis                                      |
| KI            | OpenAI API                                 |
| Tests         | Jest + Supertest                           |
| Container     | Docker & Docker Compose                    |
| CI            | GitHub Actions                             |

---

## Projektstruktur

```text
Sprit-Scan/
├── docker-compose.yml            # lokale Entwicklungsumgebung (inkl. Cloudflare Tunnel)
├── docker-compose-test.yml       # isolierte Infrastruktur für E2E-Tests
├── .github/workflows/
│   └── backend-ci.yml            # CI-Pipeline (Unit/Integration + E2E)
├── docs/                         # Vertiefende Grundlagen-Dokumente
├── README.md
└── sprit-scan/
    ├── angular.json
    ├── ngsw-config.json          # Service-Worker-Caching-Regeln
    ├── public/manifest.webmanifest
    ├── src/app/
    │   ├── app.routes.ts
    │   ├── app.config.ts
    │   ├── api/                  # HTTP-Interceptors, Basis-URL
    │   ├── guards/                # Route Guards
    │   ├── features/              # Seiten (Login, Home, Scan, History, Profile, AI-Expert, ...)
    │   └── shared/                 # Wiederverwendbare Komponenten & Services
    └── backend/
        ├── package.json
        └── src/
            ├── api-gateway/
            ├── auth-microservice/
            ├── history-microservice/
            ├── ai-microservice/
            ├── redis/
            ├── resilience/
            └── test/e2e.spec.ts
```

---

## Projekt starten

Alles lässt sich vom Repository-Root aus starten:

```bash
docker compose up -d --build
```

Wichtige Endpunkte:

- Frontend: `http://localhost:4200`
- API-Gateway: `http://localhost:3000`
- Health-Check: `http://localhost:3000/health`

Stoppen:

```bash
docker compose down        # Datenbank-Volumes bleiben erhalten
docker compose down -v     # inkl. Volumes
```

### API-Gateway-Routing

| Gateway-Route     | Weitergeleitet an          | Env-Variable            |
| ----------------- | --------------------------- | ------------------------ |
| `/api/auth/*`     | `auth-microservice` (:3001) | `AUTH_SERVICE_URL`       |
| `/api/history/*`  | `history-microservice` (:3003) | `HISTORY_SERVICE_URL`|
| `/api/ai/*`       | `ai-microservice` (:3004)   | `AI_SERVICE_URL`         |
| `/health`         | Gateway selbst               | –                        |

### Frontend-Befehle

```bash
cd sprit-scan
npm install
npm start        # ng serve → http://localhost:4200
npm run build
npm test
```

### Backend-Befehle

```bash
cd sprit-scan/backend
npm install
npm run start:dev
npm run build
npm test
```

---

## Cloudflare Tunnel

`cloudflared` läuft als eigener Container in `docker-compose.yml` und macht Frontend/Backend öffentlich erreichbar, ohne Ports direkt freizugeben.

**Wichtig:** Läuft `cloudflared` in Docker, zeigt `localhost` **innerhalb des Containers** auf den Tunnel-Container selbst – nicht auf Frontend oder Gateway. Falsche Ingress-Konfiguration führt daher zu `502 Bad Gateway`.

Korrekte Public-Hostname-Konfiguration in Cloudflare Zero Trust:

- `frontend.<deine-domain>` → `http://frontend:4200`
- `backend.<deine-domain>` → `http://api-gateway:3000`

Zusätzlich nötig:

- `.env` benötigt `CLOUDFLARE_TUNNEL_TOKEN`.
- `CORS_ORIGIN` im Gateway muss die öffentliche Frontend-Domain enthalten (z. B. `https://frontend.<deine-domain>,http://localhost:4200`).
- In `sprit-scan/angular.json` muss der öffentliche Hostname unter `serve.options.allowedHosts` erlaubt sein, da der Angular Dev-Server sonst Requests mit fremdem `Host`-Header blockiert.

---

## PWA-Konfiguration

Die PWA ist an mehreren Stellen konfiguriert:

- **Build-Aktivierung (Production):** `sprit-scan/angular.json` (`serviceWorker: ngsw-config.json`)
- **Registrierung zur Laufzeit:** `sprit-scan/src/app/app.config.ts` (`provideServiceWorker`, nur außerhalb von Dev-Mode aktiv)
- **Caching-Regeln:** `sprit-scan/ngsw-config.json` (Asset-Groups für App-Shell, Icons, sonstige Assets)
- **Manifest/Icons:** `sprit-scan/public/manifest.webmanifest`

---

## Tests

### Frontend

```bash
cd sprit-scan
npm install
npm test
```

### Backend (Unit/Integration)

```bash
cd sprit-scan/backend
npm install
npm test
```

### Backend E2E gegen vollständige Infrastruktur

```bash
# im Repository-Root
docker compose -f docker-compose-test.yml up -d --build

# danach
cd sprit-scan/backend
npm test -- src/test/e2e.spec.ts
```

Die E2E-Tests decken u. a. ab:

- Auth-Flows inkl. Randfälle mit falschem Passwort (Login, E-Mail-/Passwort-Änderung, Account-Löschung)
- History-CRUD
- AI-Endpunkt-Grenzfälle (leere Eingabe, zu große Payloads)
- Rate Limiting
- Eventual-Consistency-Cleanup über Kafka nach Account-Löschung

---

## CI (GitHub Actions)

Workflow: [.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml)

- Trigger: `push` und `pull_request` auf `main`
- Job 1 (`unit-integration`): Build + Tests ohne E2E
- Job 2 (`e2e`): startet `docker-compose-test.yml`, wartet auf Gateway-Health, führt E2E-Tests aus, räumt danach auf

Optionales Secret:

- `OPENAI_API_KEY` (für KI-bezogene Testpfade)

---

## Environment Variablen

Wichtige Variablen (siehe `.env`):

| Variable                  | Beschreibung                                      |
| -------------------------- | -------------------------------------------------- |
| `CORS_ORIGIN`              | Erlaubte Frontend-Origins (kommagetrennt)          |
| `JWT_SECRET`                | Secret zum Signieren der JWTs                      |
| `OPENAI_API_KEY`            | API-Key für KI-Funktionen                          |
| `CLOUDFLARE_TUNNEL_TOKEN`   | Token für den Cloudflare Tunnel                    |
| `AUTH_SERVICE_URL`          | Basis-URL des Auth-Service (intern)                |
| `HISTORY_SERVICE_URL`       | Basis-URL des History-Service (intern)             |
| `AI_SERVICE_URL`            | Basis-URL des AI-Service (intern)                  |
| `DATABASE_URL` / `DATABASE_URL_History` | Verbindungs-Strings der jeweiligen Postgres-DB |

> In Docker Compose werden interne Service-Namen statt `localhost` verwendet (z. B. `http://auth-service:3001`).

---

## Weiterführende Doku

Im Ordner `docs/` liegen vertiefende Grundlagen-Dokumente:

- [docs/microservices-grundlagen.md](docs/microservices-grundlagen.md)
- [docs/kafka-grundlagen.md](docs/kafka-grundlagen.md)
- [docs/sicherheit-grundlagen.md](docs/sicherheit-grundlagen.md)
- [docs/docker-grundlagen.md](docs/docker-grundlagen.md)
- [docs/angular-grundlagen.md](docs/angular-grundlagen.md)
- [docs/tailwind-grundlagen.md](docs/tailwind-grundlagen.md)
