# API Gateway – Detailed Documentation

This document explains the **API Gateway** of the Sprit-Scan backend in detail:
what it is, why it exists, how each file works, how a request flows through it,
and how to configure and extend it.

---

## 1. What is the API Gateway?

The API Gateway is the **single public entry point** of the backend. Instead of
exposing four separate microservices (auth, profile, history, ai) to the
internet, the frontend only ever talks to **one** service: the gateway.

The gateway then **forwards** each incoming request to the correct microservice
over **REST (HTTP + JSON)** and returns the microservice's answer back to the
client.

```
Frontend (Angular)
      │  HTTP request  e.g. POST /api/auth/login
      ▼
┌───────────────────────────┐
│        API Gateway        │  (NestJS, port 3000)
│                           │
│  1. CORS check            │
│  2. Rate limit check      │
│  3. Match route /api/...  │
│  4. Forward via REST      │
└──────────┬────────────────┘
           │ REST  http://auth-service:3001/login
           ▼
   auth-microservice
```

### Benefits

- **One public port** → smaller attack surface, easier CORS/TLS handling.
- **Central cross-cutting concerns** → CORS, rate limiting, validation, logging,
  and error normalization all live in one place.
- **Loose coupling** → the frontend does not need to know where each
  microservice lives; only the gateway does (via environment variables).
- **Independent services** → microservices stay on a private network and can be
  scaled, deployed, or replaced independently.

---

## 2. File Overview

```
src/api-gateway/
├── main.ts                    # Bootstrap: creates the app, CORS, validation, listen
├── api-gateway-module.ts      # Root module: wires everything together
├── api-gateway.controller.ts  # Health endpoint (GET /health)
├── api-gateway.service.ts     # Health payload logic
├── config/
│   └── services.config.ts     # Typed, env-based configuration
├── proxy/
│   └── proxy.service.ts       # Generic REST forwarder + error handling
└── routes/
    ├── auth.controller.ts     # /api/auth/*    → auth service
    ├── profile.controller.ts  # /api/profile/* → profile service
    ├── history.controller.ts  # /api/history/* → history service
    └── ai.controller.ts       # /api/ai/*      → ai service
```

---

## 3. Configuration – `config/services.config.ts`

All configuration is read from **environment variables** so the same code works
locally, in Docker, and in production without changes.

The file uses Nest's `registerAs()` to create two **namespaced** config objects:

### `services` namespace – microservice URLs

```ts
export const servicesConfig = registerAs('services', (): ServiceUrls => ({
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  profile: process.env.PROFILE_SERVICE_URL ?? 'http://localhost:3002',
  history: process.env.HISTORY_SERVICE_URL ?? 'http://localhost:3003',
  ai: process.env.AI_SERVICE_URL ?? 'http://localhost:3004',
}));
```

Each value is the **base URL** of one microservice. If the env variable is not
set, a sensible `localhost` default is used.

The `ServiceName` type (`'auth' | 'profile' | 'history' | 'ai'`) is used
throughout the code to guarantee — at compile time — that you can only reference
a service that actually exists.

### Why a dedicated config file? (Why not hard-code the URLs?)

A fair question is: _why not just write the service URLs directly where we call
`axios.request(...)`?_ The dedicated config module exists for several concrete
reasons:

- **Single source of truth.** Every URL is defined **once**. If a service moves
  or a port changes, you edit one place instead of hunting through every
  controller for a hard-coded string.
- **Environment-independence.** The exact same compiled code runs locally
  (`http://localhost:3001`), in Docker (`http://auth-service:3001`), and in
  production (a real hostname) — only the environment variables change. Hard-
  coded URLs would force code changes (and a rebuild) per environment.
- **No secrets/infra details in the code.** URLs (and later credentials) belong
  in configuration, not in the source tree. This keeps the repo portable and
  safe to share.
- **Type safety.** The `ServiceName` union + `ServiceUrls` interface make it
  impossible to forward to a service that doesn't exist — the compiler catches
  the typo. A raw string passed to `axios` would only fail at runtime.
- **Validated, typed defaults.** Parsing/`??` defaults live in one factory, so
  every reader gets already-parsed numbers and sane fallbacks instead of raw
  `process.env` strings scattered around.
- **Testability.** Config can be overridden in tests without touching the code
  that consumes it.

### `gateway` namespace – gateway behavior

```ts
export const gatewayConfig = registerAs('gateway', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200').split(',').map((o) => o.trim()),
  httpTimeout: parseInt(process.env.HTTP_TIMEOUT ?? '5000', 10),
  rateTtl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
  rateLimit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
}));
```

| Key           | Env var          | Default                 | Meaning                                  |
| ------------- | ---------------- | ----------------------- | ---------------------------------------- |
| `port`        | `PORT`           | `3000`                  | Port the gateway listens on.             |
| `corsOrigin`  | `CORS_ORIGIN`    | `http://localhost:4200` | Allowed frontend origin(s), comma-split. |
| `httpTimeout` | `HTTP_TIMEOUT`   | `5000`                  | Timeout (ms) for outgoing service calls. |
| `rateTtl`     | `RATE_LIMIT_TTL` | `60000`                 | Rate-limit window in ms.                 |
| `rateLimit`   | `RATE_LIMIT_MAX` | `100`                   | Max requests per client (IP) per window. |

---

## 4. Root Module – `api-gateway-module.ts`

The module is the "wiring diagram" that tells NestJS which pieces exist and how
they depend on each other.

### Imported modules

- **`ConfigModule.forRoot({ isGlobal: true, load: [...] })`**
  Loads the `.env` file **once**, globally, and registers the `services` and
  `gateway` config namespaces. `isGlobal: true` means every provider can inject
  `ConfigService` without re-importing the module.

- **`HttpModule.registerAsync(...)`**
  Configures the Axios-based HTTP client used to call the microservices. It is
  configured _asynchronously_ so it can read the `httpTimeout` from config:

  ```ts
  useFactory: (config: ConfigService) => ({
    timeout: config.get<number>('gateway.httpTimeout') ?? 5000,
    maxRedirects: 5,
  });
  ```

- **`ThrottlerModule.forRootAsync(...)`**
  Configures rate limiting from config (`rateTtl` / `rateLimit`).

### Controllers

All five controllers are registered:

- `ApiGatewayController` (health)
- `AuthController`, `ProfileController`, `HistoryController`, `AiController`
  (the proxy routes)

### Providers

- `ApiGatewayService` – builds the health payload.
- `ProxyService` – the generic REST forwarder (shared by all route controllers).
- **Global rate-limit guard**:

  ```ts
  { provide: APP_GUARD, useClass: ThrottlerGuard }
  ```

  Using `APP_GUARD` applies the `ThrottlerGuard` to **every route** in the app,
  so the limit protects all endpoints automatically.

---

## 5. Bootstrap – `main.ts`

`main.ts` is the entry point that actually starts the server.

```ts
const app = await NestFactory.create(ApiGatewayModule);

const configService = app.get(ConfigService);
const port       = configService.get<number>('gateway.port') ?? 3000;
const corsOrigin = configService.get<string[]>('gateway.corsOrigin') ?? [...];

app.enableCors({ origin: corsOrigin, credentials: true });      // 1
app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true })); // 2

await app.listen(port);                                          // 3
```

Steps:

1. **CORS** – only the configured origin(s) (the Angular frontend) may call the
   gateway from a browser. `credentials: true` allows cookies/auth headers.
2. **Global `ValidationPipe`** –
   - `transform: true` converts incoming payloads to their DTO types.
   - `whitelist: true` strips properties that are not defined in a DTO,
     protecting the services from unexpected fields.
3. **Listen** – start accepting requests on the configured port.

---

## 6. Health Endpoint – `api-gateway.controller.ts` + `api-gateway.service.ts`

A simple, unauthenticated endpoint used for monitoring / smoke tests.

- **Controller**: maps `GET /health` to the service.
- **Service**: returns the gateway status **and** the currently configured
  microservice URLs (handy to verify the environment is wired correctly):

```json
{
  "status": "ok",
  "gateway": "api-gateway",
  "timestamp": "2026-09-22T11:29:01.118Z",
  "services": {
    "auth": "http://auth-service:3001",
    "profile": "http://profile-service:3002",
    "history": "http://history-service:3003",
    "ai": "http://ai-service:3004"
  }
}
```

---

## 7. The Proxy – `proxy/proxy.service.ts`

This is the heart of the gateway. It forwards a request to a microservice and
returns the response, translating any failure into a proper HTTP status code.

### Why a `ProxyService`? (Why not call `axios.request()` directly in each controller?)

We _could_ import Axios into every route controller and call
`axios.request(...)` inline. We deliberately don't, because that would spread
the same tricky logic across four (soon more) controllers and make it easy for
them to drift apart. Centralizing it in one service gives us:

- **DRY / no duplication.** URL building, timeout, header handling, and — most
  importantly — **error translation** are written **once** and reused by all
  controllers. Adding a service is a one-line `forward('xyz', …)` call.
- **Consistent error handling.** `handleError()` turns Axios failures into the
  _correct_ HTTP status every time: re-throw the microservice's real status, or
  `502 Bad Gateway` when it's unreachable. With inline `axios.request`, an
  unhandled rejection would leak as a generic `500` and the true cause would be
  lost — and each controller would have to re-implement this correctly.
- **Dependency injection & configuration.** `ProxyService` receives NestJS'
  `HttpService` (Axios wrapped as an injectable), which is already configured
  with the `HTTP_TIMEOUT` from config and participates in Nest's lifecycle.
  Calling the raw `axios` singleton would bypass that shared configuration.
- **A single seam for cross-cutting concerns.** Retries, circuit breakers,
  request logging, tracing headers, or auth-header forwarding can be added in
  **one** method later, and every route benefits instantly.
- **Type-safe service selection.** `forward(service, …)` takes a `ServiceName`,
  so the controller can't accidentally target a non-existent service.
- **Testability & mockability.** Controllers depend on the `ProxyService`
  abstraction, so they can be unit-tested by mocking one method instead of
  stubbing the global Axios module.

In short: the controllers stay tiny and declarative ("forward auth traffic to
the auth service"), while all the fragile networking/error logic lives in one
well-tested place.

### `ProxyRequestOptions`

A small interface describing a forwarded request:

| Field     | Type                       | Description                            |
| --------- | -------------------------- | -------------------------------------- |
| `method`  | `Method`                   | HTTP method (GET, POST, …).            |
| `path`    | `string`                   | Path relative to the service base URL. |
| `data`    | `unknown?`                 | Request body.                          |
| `params`  | `Record<string, unknown>?` | Query parameters.                      |
| `headers` | `Record<string, string>?`  | Optional headers.                      |

### `getServiceUrl(service)` (private)

Looks up the base URL of a service from the `services` config. If a service is
not configured, it throws `500 Internal Server Error` — a clear signal that the
environment is misconfigured.

### `forward<T>(service, options)`

The public method used by every route controller:

```ts
const baseUrl = this.getServiceUrl(service); // e.g. http://auth-service:3001
const url = `${baseUrl}${options.path}`; // + /login → full URL

const config: AxiosRequestConfig = {
  url,
  method,
  data,
  params,
  headers,
};

const response = await firstValueFrom(this.httpService.request<T>(config));
return response.data; // return only the body
```

- `HttpService.request()` returns an **RxJS Observable**; `firstValueFrom()`
  turns it into a `Promise` so we can `await` it.
- On success, only the **response body** (`response.data`) is returned to the
  client.
- On failure, control jumps to `handleError()`.

### `handleError(service, error)` (private)

Converts an Axios error into a meaningful `HttpException`:

- **The service responded with an error status** (`error.response` exists):
  the gateway **re-throws the same status and body** the microservice returned,
  so the client sees the real error (e.g. `401 Unauthorized` from auth).
- **The service could not be reached at all** (no response — it's down or the
  URL is wrong): the gateway returns **`502 Bad Gateway`** with a friendly
  message.

This means the client always gets a correct HTTP status instead of a generic
`500`.

---

## 8. Route Controllers – `routes/*.controller.ts`

There is one controller per microservice. They are almost identical; only the
base path and the target service name differ.

Example — `auth.controller.ts`:

```ts
@Controller('api/auth')
export class AuthController {
  constructor(private readonly proxy: ProxyService) {}

  @All('*path')
  forward(@Req() req: Request, @Param('path') path: string, @Query() query: Record<string, unknown>, @Body() body: unknown) {
    return this.proxy.forward('auth', {
      method: req.method as Method,
      path: `/${path ?? ''}`,
      data: body,
      params: query,
    });
  }
}
```

Key points:

- **`@Controller('api/auth')`** – all routes here start with `/api/auth`.
- **`@All('*path')`** – a **catch-all**:
  - `@All` matches **every** HTTP method (GET, POST, PUT, DELETE, …).
  - `'*path'` is a wildcard capturing everything after `/api/auth/` into the
    `path` parameter. So `/api/auth/login` → `path = 'login'`,
    `/api/auth/users/42` → `path = 'users/42'`.
- The handler reads the original **method**, **query**, and **body** and hands
  them to `ProxyService.forward()` together with the target service name
  (`'auth'`).

The other three controllers (`profile`, `history`, `ai`) work the same way with
their respective base path and service name.

| Controller          | Base path      | Target service |
| ------------------- | -------------- | -------------- |
| `AuthController`    | `/api/auth`    | `auth`         |
| `ProfileController` | `/api/profile` | `profile`      |
| `HistoryController` | `/api/history` | `history`      |
| `AiController`      | `/api/ai`      | `ai`           |

---

## 9. End-to-End Request Flow

Example: the frontend calls `POST /api/auth/login` with a JSON body.

1. **CORS** – the browser's origin is checked against `CORS_ORIGIN`.
2. **Rate limit** – `ThrottlerGuard` checks the client hasn't exceeded
   `RATE_LIMIT_MAX` requests within `RATE_LIMIT_TTL`. If it has → `429`.
3. **Validation** – the global `ValidationPipe` sanitizes the payload.
4. **Routing** – `AuthController.forward()` matches (`@All('*path')`),
   `path = 'login'`.
5. **Proxy** – `ProxyService.forward('auth', { method: 'POST', path: '/login',
data, params })`:
   - resolves the base URL `http://auth-service:3001`,
   - builds `http://auth-service:3001/login`,
   - sends the REST request with the original body/query.
6. **Response**:
   - success → the auth service's response body is returned to the frontend,
   - service returned an error → same status/body is propagated,
   - service unreachable → `502 Bad Gateway`.

---

## 10. Cross-Cutting Concerns Summary

| Concern        | Where it lives                             | Configured by   |
| -------------- | ------------------------------------------ | --------------- |
| CORS           | `main.ts` (`enableCors`)                   | `CORS_ORIGIN`   |
| Validation     | `main.ts` (`ValidationPipe`)               | (always on)     |
| Rate limiting  | `api-gateway-module.ts` (`ThrottlerGuard`) | `RATE_LIMIT_*`  |
| HTTP timeout   | `api-gateway-module.ts` (`HttpModule`)     | `HTTP_TIMEOUT`  |
| Service URLs   | `config/services.config.ts`                | `*_SERVICE_URL` |
| Error handling | `proxy/proxy.service.ts` (`handleError`)   | (built-in)      |

---

## 11. How to Extend

### Add a new microservice

1. Add the URL to `ServiceName`, `ServiceUrls`, and `servicesConfig` in
   [`services.config.ts`](config/services.config.ts).
2. Add the env variable (e.g. `NEW_SERVICE_URL`) to `.env` and Docker Compose.
3. Create a new controller in `routes/` (copy an existing one, change the
   `@Controller('api/xyz')` path and the `this.proxy.forward('xyz', …)` name).
4. Register the controller in `api-gateway-module.ts`.

### Add a stricter limit for a sensitive route

Use the `@Throttle()` decorator on a specific controller/handler, e.g. a much
lower limit for `/api/auth/login` to slow down brute-force attacks:

```ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests / minute
@All('*path')
forward(/* … */) { /* … */ }
```

### Forward authentication headers

If the microservices need the `Authorization` header, pass it through in the
controller:

```ts
return this.proxy.forward('profile', {
  method: req.method as Method,
  path: `/${path ?? ''}`,
  data: body,
  params: query,
  headers: { authorization: req.headers.authorization ?? '' },
});
```
