# Sprit-Scan (updated)

Sprit-Scan ist eine Full-Stack-Webanwendung zur Erkennung und Verwaltung von Spirituosen per Bild-Upload.

- **Frontend:** Angular SPA inkl. PWA
- **Backend:** NestJS Microservices hinter einem API-Gateway
- **Infra:** Docker Compose, PostgreSQL, Redis, Kafka
- **Optional Public Access:** Cloudflare Tunnel

Das komplette Projekt kann lokal per Docker Compose gestartet werden.


## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running the Project](#running-the-project)
- [Cloudflare Tunnel](#cloudflare-tunnel)
- [PWA](#pwa)
- [Tests](#tests)
- [CI](#ci)

## Architecture Overview

```
Frontend (Angular, :4200)
      |
      v
API Gateway (NestJS, :3000)
  |           |            |
  v           v            v
Auth (:3001) History (:3003) AI (:3004)
  |           |
  v           v
Auth-DB     History-DB      + Redis + Kafka

Optional: Cloudflare Tunnel -> frontend/backend Hostnames
```



## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | Angular 21, TypeScript                                  |
| Styling      | Tailwind CSS 4, DaisyUI                                 |
| Backend      | NestJS 11 (Node.js 20), TypeScript                      |
| Gateway HTTP | `@nestjs/axios` (Axios) for REST calls                  |
| Config       | `@nestjs/config` (env-based)                            |
| Databases    | PostgreSQL 15 + Prisma                                  |
| Cache / Bus  | Redis 7 + Kafka                                         |
| AI           | OpenAI API                                              |
| Testing      | Jest + Supertest                                        |
| Container    | Docker & Docker Compose                                 |


## Project Structure

```
Sprit-Scan/
├── docker-compose.yml
├── docker-compose-test.yml
├── .github/workflows/backend-ci.yml
├── README.md
├── docs/
└── sprit-scan/
  ├── Dockerfile
  ├── package.json
  ├── angular.json
  ├── ngsw-config.json
  ├── public/manifest.webmanifest
    ├── src/
    └── backend/
    ├── Dockerfile
        ├── package.json
        └── src/
      ├── api-gateway/
      ├── auth-microservice/
      ├── history-microservice/
      ├── ai-microservice/
      └── test/e2e.spec.ts
```


## Running the Project

Everything can be started from the repository root:

```bash
docker compose up -d --build
```

Main endpoints:

- Frontend: `http://localhost:4200`
- API Gateway: `http://localhost:3000`
- Health: `http://localhost:3000/health`

Stop:

```bash
docker compose down
docker compose down -v
```
## Running the Project

Everything can be started from the repository root:

```bash
docker compose up -d --build
```

Main endpoints:

- Frontend: `http://localhost:4200`
- API Gateway: `http://localhost:3000`
- Health: `http://localhost:3000/health`

Stop:

```bash
docker compose down
docker compose down -v
```

### API Gateway Routing
| `history-microservice` | Storing and querying a user's scan history   | history-db |
| `ai-microservice`      | AI-based drink recognition & expert chat     | – (Redis)  |

> These folders exist under `backend/src/*-microservice` but are not implemented yet.
### Backend Commands

```bash
cd sprit-scan/backend
### Frontend Commands
docker compose up -d --build
```
cd sprit-scan
This starts:
npm start
npm run build
npm test

```bash
### Backend Commands

```json
cd sprit-scan/backend
npm install
npm run start:dev
npm run build
npm test
  "status": "ok",
  "gateway": "api-gateway",
## Cloudflare Tunnel

`cloudflared` runs as container in `docker-compose.yml`.

If tunnel ingress uses `localhost`, Cloudflare returns `502` because `localhost` points to the `cloudflared` container itself.

Use these origins in Cloudflare Zero Trust:

- `frontend.danielhennies.com` → `http://frontend:4200`
- `backend.danielhennies.com` → `http://api-gateway:3000`

## PWA

PWA is configured in:

- `sprit-scan/angular.json` (production service worker activation)
- `sprit-scan/src/app/app.config.ts` (service worker registration)
- `sprit-scan/ngsw-config.json` (cache groups)
- `sprit-scan/public/manifest.webmanifest` (manifest + icons)

## Tests

Backend E2E with full infrastructure:
    "ai": "http://ai-service:3004"
  }
docker compose -f docker-compose-test.yml up -d --build
cd sprit-scan/backend
npm test -- src/test/e2e.spec.ts
```

## CI

GitHub Actions workflow:

- `.github/workflows/backend-ci.yml`
- Runs on `push` and `pull_request` to `main`
- Executes unit/integration tests and E2E tests

## Environment Variables

Important variables:

- `CORS_ORIGIN`
- `OPENAI_API_KEY`
- `CLOUDFLARE_TUNNEL_TOKEN`
- `AUTH_SERVICE_URL`
- `HISTORY_SERVICE_URL`
- `AI_SERVICE_URL`

## API Overview

> `node_modules` volumes so the container picks up the new packages:
>
  "GET /health": "gateway health",
  "ANY /api/auth/*": "auth-microservice",
  "ANY /api/history/*": "history-microservice",
  "ANY /api/ai/*": "ai-microservice"
docker compose down -v       # also remove database volumes
```

## Additional Docs

See `docs/` for architecture and security deep-dives:

- `docs/microservices-grundlagen.md`
- `docs/kafka-grundlagen.md`
- `docs/sicherheit-grundlagen.md`
- `docs/docker-grundlagen.md`
- `docs/angular-grundlagen.md`
- `docs/tailwind-grundlagen.md`
  }
