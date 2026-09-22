# Sprit-Scan

Sprit-Scan is a web application for scanning and exploring alcoholic drinks such as wine or whiskey. A user can scan a bottle (by uploading an image), receive AI-generated details about the drink, keep a personal scan history, manage their profile, and chat with an AI expert for recommendations.

The project is a full-stack application split into two parts:

- **Frontend** – an Angular single-page application (the user interface).
- **Backend** – a NestJS microservice architecture behind a single API Gateway.

Everything can be run together with **Docker Compose**.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Frontend](#frontend)
- [Backend](#backend)
- [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)

---

## Architecture Overview

```
                    ┌──────────────┐
                    │   Frontend   │  Angular SPA (port 4200)
                    └──────┬───────┘
                           │  REST / HTTP
                    ┌──────▼───────┐
                    │ API Gateway  │  NestJS (port 3000) – only public entry
                    └──────┬───────┘
          ┌────────────────┼────────────────┬─────────────────┐
          │ REST           │ REST           │ REST            │ REST
   ┌──────▼─────┐   ┌──────▼──────┐   ┌─────▼──────┐   ┌──────▼─────┐
   │   auth     │   │  profile    │   │  history   │   │     ai     │
   │  service   │   │  service    │   │  service   │   │  service   │
   │  (3001)    │   │   (3002)    │   │   (3003)   │   │   (3004)   │
   └──────┬─────┘   └──────┬──────┘   └─────┬──────┘   └────────────┘
          │                │                │
     ┌────▼───┐       ┌────▼────┐      ┌────▼─────┐
     │auth-db │       │profile- │      │history-  │      ┌─────────┐
     │(Postgres)      │db       │      │db        │      │  Redis  │
     └────────┘       └─────────┘      └──────────┘      └─────────┘
```

- The **frontend** only ever talks to the **API Gateway**.
- The **API Gateway** is the single public entry point. It forwards each request to the correct microservice over **REST (HTTP + JSON)**.
- Each microservice is isolated on an **internal** Docker network and (where needed) owns its **own PostgreSQL database**.
- **Redis** is shared for sessions / caching.

---

## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | Angular 21 (standalone components, Signals), TypeScript |
| Styling      | Tailwind CSS 4, DaisyUI                                 |
| Backend      | NestJS 11 (Node.js 20), TypeScript                      |
| Gateway HTTP | `@nestjs/axios` (Axios) for REST calls                  |
| Config       | `@nestjs/config` (env-based)                            |
| Databases    | PostgreSQL 15 (one per stateful service)                |
| Cache / Bus  | Redis 7                                                 |
| Container    | Docker & Docker Compose                                 |

---

## Project Structure

```
Sprit-Scan/
├── docker-compose.yml          # Orchestrates frontend, gateway, services, DBs, redis
├── README.md
└── sprit-scan/
    ├── Dockerfile              # Frontend image
    ├── package.json            # Frontend dependencies
    ├── src/
    │   ├── app/                # Root app + routes
    │   ├── features/           # Page-level feature components
    │   │   ├── login/
    │   │   ├── register/
    │   │   ├── home/
    │   │   ├── scan/
    │   │   ├── history/
    │   │   ├── profile/
    │   │   └── ai-expert/
    │   └── shared/             # Reusable UI components & services
    │       ├── button/
    │       ├── chatbubble/
    │       ├── dock/
    │       ├── input-email/
    │       ├── input-password/
    │       ├── modal/
    │       ├── navbar/
    │       ├── notification/   # Global notification service + component
    │       ├── result/
    │       ├── scananimation/  # Scan light-beam animation
    │       └── template-page/
    └── backend/
        ├── Dockerfile          # Shared backend image
        ├── package.json
        ├── .env                # Local env (git-ignored)
        ├── .env.example        # Documented env template
        └── src/
            ├── api-gateway/    # The only implemented service so far
            │   ├── main.ts
            │   ├── api-gateway-module.ts
            │   ├── api-gateway.controller.ts   # GET /health
            │   ├── api-gateway.service.ts
            │   ├── config/
            │   │   └── services.config.ts      # Reads service URLs from env
            │   ├── proxy/
            │   │   └── proxy.service.ts         # Generic REST forwarder
            │   └── routes/
            │       ├── auth.controller.ts       # /api/auth/*
            │       ├── profile.controller.ts    # /api/profile/*
            │       ├── history.controller.ts    # /api/history/*
            │       └── ai.controller.ts         # /api/ai/*
            ├── auth-microservice/      # (planned – empty)
            ├── profile-microservice/   # (planned – empty)
            ├── history-microservice/   # (planned – empty)
            └── ai-microservice/        # (planned – empty)
```

---

## Frontend

The frontend is an **Angular 21** single-page application using modern standalone components and **Signals** for reactive state.

### Features (Pages)

| Route        | Component         | Description                                                      |
| ------------ | ----------------- | --------------------------------------------------------------- |
| `/login`     | `LoginFeature`    | Email/password login with reactive validation.                  |
| `/register`  | `RegisterFeature` | Account creation.                                               |
| `/home`      | `HomeFeature`     | Landing page; start a scan and see the last scans.              |
| `/scan`      | `ScanFeature`     | Handles file upload and shows the scan animation overlay.       |
| `/history`   | `HistoryFeature`  | Searchable list of past scans with a details modal.             |
| `/profile`   | `ProfileFeature`  | View/edit email & password, delete account (modal-based flows). |
| `/ai-expert` | `AiExpertFeature` | Chat interface with an AI expert, including image upload.        |

Unknown routes and `/` redirect to `/login`.

### Shared Components & Services

- **`button`** – reusable button with optional SVG icon, sizes, disabled/loading states.
- **`chatbubble`** – chat message bubble (text + optional image), aligned left/right.
- **`navbar` / `dock`** – top navigation and bottom dock; highlight the active route.
- **`modal`** – generic dialog wrapper driven by a toggle input/output.
- **`input-email` / `input-password`** – form fields with validation and a password visibility toggle.
- **`notification`** – a global `NotificationService` (Signals) plus a component rendered once in the app root, so any feature can show success/error/info toasts.
- **`scananimation`** – a full-screen modal-style overlay that dims the screen and animates a red scanning light beam over the uploaded image.
- **`template-page`** – shared page layout with configurable navbar/dock.

### Key Patterns

- **Signals** (`signal`, `computed`, `effect`) for state and reactivity.
- **`input()` / `output()`** for component communication.
- **Object URLs** (`URL.createObjectURL`) to preview uploaded images.
- **Tailwind + DaisyUI** utility-first styling.

### Frontend Commands

```bash
cd sprit-scan
npm install
npm start        # ng serve → http://localhost:4200
npm run build    # production build
npm test         # unit tests (Vitest)
```

---

## Backend

The backend follows a **microservice architecture** built with **NestJS**. Currently, only the **API Gateway** is implemented; the individual microservices are scaffolded but intentionally left empty for now.

### API Gateway

The gateway is the **single public entry point**. It:

1. Reads each microservice base URL from **environment variables** (see [`services.config.ts`](sprit-scan/backend/src/api-gateway/config/services.config.ts)).
2. Exposes a public REST surface under `/api/*`.
3. Forwards every request to the matching microservice over **REST** using a generic [`ProxyService`](sprit-scan/backend/src/api-gateway/proxy/proxy.service.ts).
4. Translates downstream errors into proper HTTP status codes (e.g. `502 Bad Gateway` when a service is unreachable).
5. Enables **CORS** for the Angular frontend.

### Routing Map

| Gateway route    | Forwarded to              | Env variable          |
| ---------------- | ------------------------- | --------------------- |
| `/api/auth/*`    | auth-service (`:3001`)    | `AUTH_SERVICE_URL`    |
| `/api/profile/*` | profile-service (`:3002`) | `PROFILE_SERVICE_URL` |
| `/api/history/*` | history-service (`:3003`) | `HISTORY_SERVICE_URL` |
| `/api/ai/*`      | ai-service (`:3004`)      | `AI_SERVICE_URL`      |
| `/health`        | gateway itself            | –                     |

### Planned Microservices

| Service                | Responsibility                               | Database   |
| ---------------------- | -------------------------------------------- | ---------- |
| `auth-microservice`    | Registration, login, JWT/session management  | auth-db    |
| `profile-microservice` | User profile CRUD (email, password, deletion)| profile-db |
| `history-microservice` | Storing and querying a user's scan history   | history-db |
| `ai-microservice`      | AI-based drink recognition & expert chat     | – (Redis)  |

> These folders exist under `backend/src/*-microservice` but are not implemented yet.

### Backend Commands

```bash
cd sprit-scan/backend
npm install
npm run start:dev    # watch mode
npm run build        # compile → dist/api-gateway/main.js
npm run start:prod   # node dist/api-gateway/main
```

---

## Running the Project

The easiest way to run everything is **Docker Compose** from the repository root:

```bash
docker compose up -d --build
```

This starts:

- **frontend** → http://localhost:4200
- **api-gateway** → http://localhost:3000
- **auth / profile / history / ai** services (internal network only)
- **PostgreSQL** databases and **Redis**

Verify the gateway is up:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "gateway": "api-gateway",
  "services": {
    "auth": "http://auth-service:3001",
    "profile": "http://profile-service:3002",
    "history": "http://history-service:3003",
    "ai": "http://ai-service:3004"
  }
}
```

> **Tip:** After changing backend dependencies, recreate the anonymous
> `node_modules` volumes so the container picks up the new packages:
>
> ```bash
> docker compose up -d --build --renew-anon-volumes
> ```

To stop everything:

```bash
docker compose down          # keep database data
docker compose down -v       # also remove database volumes
```

---

## Environment Variables

The gateway is configured via `sprit-scan/backend/.env` (a documented template lives in `.env.example`):

| Variable              | Default                 | Description                                  |
| --------------------- | ----------------------- | -------------------------------------------- |
| `NODE_ENV`            | `development`           | Runtime environment.                         |
| `PORT`                | `3000`                  | Port the gateway listens on.                 |
| `CORS_ORIGIN`         | `http://localhost:4200` | Allowed frontend origin(s), comma-separated. |
| `AUTH_SERVICE_URL`    | `http://localhost:3001` | Base URL of the auth service.                |
| `PROFILE_SERVICE_URL` | `http://localhost:3002` | Base URL of the profile service.             |
| `HISTORY_SERVICE_URL` | `http://localhost:3003` | Base URL of the history service.             |
| `AI_SERVICE_URL`      | `http://localhost:3004` | Base URL of the AI service.                  |
| `HTTP_TIMEOUT`        | `5000`                  | Timeout (ms) for outgoing service requests.  |

> In Docker Compose these URLs use the service names (e.g. `http://auth-service:3001`) instead of `localhost`.

---

## API Overview

All requests from the frontend go through the gateway under `/api`:

```
GET  /health                     → gateway health + configured services

ANY  /api/auth/*                 → auth-microservice
ANY  /api/profile/*              → profile-microservice
ANY  /api/history/*              → history-microservice
ANY  /api/ai/*                   → ai-microservice
```

Because the microservices are not implemented yet, calls under `/api/*`
currently return `502 Bad Gateway` (the gateway is working correctly, but the
target service is not running). Once a microservice is implemented and reachable,
the gateway will transparently forward the request and return its response.
