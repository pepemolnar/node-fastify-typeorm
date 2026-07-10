# Fastify + TypeORM Reference API

A sample REST API built to showcase how I approach backend software engineering. Rather than solving a novel business problem, this project deliberately implements a broad cross-section of the architectural concepts, standards, and patterns I use day to day — layered design, dependency injection, request validation, structured logging, authentication, transactional data access, event-driven background jobs, and a full testing pyramid — so it can serve as a compact, readable reference for the way I build and reason about services.

The domain itself is intentionally small (user management with authentication), which keeps the focus on _how_ the code is structured rather than _what_ it does.

---

## Tech stack

| Concern             | Choice                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| Runtime             | Node.js (ESM, native `--env-file`) + TypeScript                               |
| HTTP framework      | [Fastify](https://fastify.dev/)                                               |
| ORM / data access   | [TypeORM](https://typeorm.io/) + PostgreSQL                                   |
| Validation & typing | [Zod](https://zod.dev/) via `fastify-type-provider-zod`                       |
| Logging             | [Pino](https://getpino.io/) (built into Fastify)                              |
| Auth                | `@fastify/jwt` (access + refresh) + `bcrypt`                                  |
| Cache & queues      | [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis)    |
| Background jobs     | [BullMQ](https://docs.bullmq.io/)                                             |
| API docs            | `@fastify/swagger` + Swagger UI                                               |
| Testing             | [Vitest](https://vitest.dev/) + [Testcontainers](https://testcontainers.com/) |
| Tooling             | ESLint, Prettier, tsx                                                         |

---

## Architecture

Fastify is used deliberately as a **thin, low-level HTTP layer**. All higher-level structure — layering, business rules, persistence — is built on top of it with TypeORM, so the framework stays out of the way of the domain code.

### The four layers

Every request flows through four distinct layers, each with a single responsibility:

```
Request
  │
  ▼
┌───────────────┐   Routes        — declare paths, attach schemas & auth guards,
│    Routes     │                   decide where a request goes.
└───────┬───────┘
        ▼
┌───────────────┐   Controllers   — pull data out of the request and shape the
│  Controllers  │                   HTTP response. No business logic.
└───────┬───────┘
        ▼
┌───────────────┐   Services      — the business logic: normalization, hashing,
│   Services    │                   rules, orchestration.
└───────┬───────┘
        ▼
┌───────────────┐   Models        — the only layer that talks to the database
│    Models     │                   (TypeORM repositories, transactions).
└───────┬───────┘
        ▼
   PostgreSQL
```

This separation means each layer can be reasoned about — and tested — in isolation. A controller never runs a query; a model never inspects a JWT.

### A note on the current structure

`src/` currently groups code by **technical role** (`routes`, `controllers`, `services`, `models`), with the supporting infrastructure — adapters, resilience, guards, notifications, data source — collected under `src/extras/` so the four core layers stay legible as the project grows. This is deliberate but interim: the **final roadmap phase restructures the codebase around bounded contexts (Domain-Driven Design)** — grouping by _domain_ rather than by layer, promoting the persistence entity to a rich aggregate, and adding a second context to prove the module boundaries hold. It's sequenced last on purpose, so the reorganization happens once, after every collaborator exists.

### Cross-cutting concerns

- **Global error handling (RFC 7807)** — a single [`errorHandler`](src/middlewares/errorHandler.ts) maps a custom `HttpError`, Zod validation errors, serialization errors, guard rejections, unmatched routes, and unexpected failures onto a consistent [`application/problem+json`](https://datatracker.ietf.org/doc/html/rfc7807) body — `{ type, title, status, code, detail, instance, errors? }` — with a machine-readable `code` (e.g. `EMAIL_ALREADY_EXISTS`, `VALIDATION_ERROR`) clients can branch on. Business code just `throw`s; the handler decides the status and shape.
- **Request validation & typing** — every route declares Zod schemas for its body, params, query, and responses. Invalid input is rejected before it reaches a controller, and the same schemas drive TypeScript types _and_ the OpenAPI documentation — a single source of truth.
- **Structured logging** — Pino is wired in with per-request IDs (`x-request-id`), so every log line is correlatable and JSON-structured in production (pretty-printed in development).
- **Graceful shutdown** — SIGINT/SIGTERM drain in-flight requests and close the DB pool, with a hard timeout so a hung drain can't wedge a deploy. See [`index.ts`](src/index.ts).
- **Health & readiness probes** — `/health` (liveness) and `/ready` (checks DB connectivity) for orchestrators.

---

## Standards & patterns

### Dependency injection + composition root

All dependencies are constructor-injected and wired together in a single **composition root** — the [`container`](src/container.ts). Nothing reaches out for its own collaborators; everything is handed in:

```ts
const userRepository = new UserModel(AppDataSource.manager);
const unitOfWork = new TypeOrmUnitOfWork(AppDataSource);
const userService = new UserService(userRepository, unitOfWork);
const userController = new UserController(userService);
const userRoutes = new UserRoutes(userController);
```

This gives two concrete benefits:

- **Testability** — any layer can be tested with its dependencies replaced by fakes/mocks, no framework or DB required.
- **A single place to reason about wiring** — the whole object graph is constructed in one file, so the shape of the application is obvious at a glance.

### Design patterns

- **Factory** — [`NotifierFactory`](src/notifications/notifier.ts) constructs the right `Notifier` for a given channel.
- **Builder** — [`FindOptionsBuilder`](src/models/query/query-builder.ts) assembles query find-options fluently.
- **Strategy** — [`Notifier`](src/notifications/notifier.ts) with one implementation per channel (email / SMS / log).
- **Repository & Unit of Work** — [`IUserRepository`](src/types/user.types.ts) behind the service; [`UnitOfWork`](src/db/unit-of-work.ts) owns the transaction boundary.
- **Adapter** — the cache ([`RedisCache`](src/extras/adapters/redis.adapter.ts)), the outbound API client, and the email sender sit behind ports so the core stays framework-agnostic.
- **Observer / domain events** — an in-process [`EventBus`](src/extras/events/event-bus.ts) publishes domain events (`UserRegistered`) that decoupled handlers subscribe to; one event can fan out to several handlers.
- **Producer / Consumer** — the API enqueues [BullMQ](https://docs.bullmq.io/) jobs; a separate [worker](src/worker.ts) process consumes them, off the request path.

### Authentication & authorization

- **Access + refresh tokens** — login and registration issue a short-lived **access token** (a stateless JWT verified by signature alone) alongside a long-lived **refresh token**. The access token rides every request; the refresh token is only ever exchanged at `/auth/refresh`.
- **Rotation with reuse detection** — each refresh retires the presented token and issues a new one in the same _family_. Replaying an already-rotated token is treated as theft and revokes the whole family — an atomic compare-and-swap in Redis. `/auth/logout` revokes a session outright.
- **Passwords** are hashed with bcrypt and never returned or logged.
- **Login is enumeration-safe** — an unknown email and a wrong password produce the _same_ error, so an attacker can't probe which accounts exist.
- **Route guards** ([`auth.guards.ts`](src/extras/guards/auth.guards.ts)) — `authenticate` verifies the JWT (and rejects a refresh token used as an access token); `requireRole("admin")` enforces role-based access. Guards are declared per-route as Fastify `preHandler`s, so protection is visible right next to the route it protects.

### Data-access patterns

- **Migrations, not auto-sync** — the schema is versioned through TypeORM migrations (`synchronize: false`), the same discipline you'd use in production.
- **Transactions via Unit of Work** — bulk operations (e.g. creating many users) run inside a single transaction owned by the [`UnitOfWork`](src/db/unit-of-work.ts), so they're all-or-nothing.
- **Soft deletes** — records are flagged `isDeleted` rather than physically removed; the filter is centralized in [`BaseModel`](src/models/base.model.ts), so every read (list _and_ point lookups) excludes them.
- **Pagination, two ways** — validated **offset** paging returns a `{ data, total, limit, offset }` envelope; **cursor** (keyset) paging over `(createdAt, id)` returns `{ data, nextCursor }` for large, changing datasets.

### Async & eventing

- **Domain events (Observer)** — rather than doing side work inline, services publish domain events to an in-process [`EventBus`](src/extras/events/event-bus.ts). Registering a user publishes `UserRegistered`; independent handlers react, so the publisher stays ignorant of its consumers. A failing handler is isolated and logged — it can't break the others or the request.
- **Background jobs (producer/consumer)** — slow or unreliable work is offloaded to a [BullMQ](https://docs.bullmq.io/) queue on Redis, with retries and exponential backoff. The API is the _producer_; a separate **worker process** ([`worker.ts`](src/worker.ts)) is the _consumer_. So `UserRegistered` → a handler enqueues a job → the worker sends the welcome email, entirely off the request path and in its own process.
- **Email service** — transactional email sits behind a provider-agnostic [`EmailAdapter`](src/extras/adapters/console-email.port.ts) (a console implementation for local/dev), so swapping in a real provider touches one file.

---

## Testing

A layered test strategy mirrors the layered architecture:

- **Unit tests** for services, controllers, and models with injected fakes — fast, no I/O.
- **Route/app tests** that exercise the full Fastify stack in-process.
- **Integration tests** that run against a **real PostgreSQL instance spun up on the fly with Testcontainers** — no mocked database, so migrations and queries are verified against the actual engine.

```bash
npm test                 # unit + route tests
npm run test:integration # integration tests (requires Docker for Testcontainers)
npm run test:cov         # with coverage
```

---

## Roadmap

This project is a living showcase, so the list below is as much a part of it as the code — it maps out the components, patterns, and standards I'd add next, each chosen to demonstrate a specific technique. Items are grouped by what they exercise.

### Components & infrastructure

- [x] **JWT authentication** — register/login issuing signed tokens, bcrypt-hashed passwords
- [x] **Role-based authorization** — per-route `authenticate` / `requireRole` guards
- [x] **Structured logging** — Pino with per-request `x-request-id` correlation
- [x] **Health & readiness probes** — `/health` and `/ready` (DB check) for orchestrators
- [x] **Graceful shutdown** — drain in-flight requests, close the pool, hard-timeout backstop
- [x] **OpenAPI docs** — Swagger UI generated from the same Zod schemas
- [x] **Containerized** — multi-stage Dockerfile + Docker Compose
- [x] **Redis cache layer** — a cache-aside strategy in front of read-heavy endpoints (e.g. `GET /users/:id`), with explicit invalidation on write. Introduced behind a `Cache` interface so the store is swappable.
- [ ] **External API integration** — consume a third-party OpenAPI service and expose it through our own layers, demonstrating an **anti-corruption layer** that maps external contracts onto our domain types (plus timeouts and graceful degradation when it's down).
- [x] **Background jobs / message queue** — offload slow work (e.g. sending email) to a worker via BullMQ/Redis, showing async processing and the **producer/consumer** pattern.
- [x] **Rate limiting** — `@fastify/rate-limit` to protect auth endpoints from brute force.
- [x] **Refresh tokens & rotation** — short-lived access + long-lived refresh tokens with revocation, a more production-realistic auth flow.
- [x] **Email service** — transactional email (verification, password reset) behind a provider-agnostic interface.

### Design patterns

- [x] **Layered architecture** — Routes → Controllers → Services → Models, each single-responsibility
- [x] **Dependency injection + composition root** — all wiring in [`container.ts`](src/container.ts)
- [x] **Global error handling** — one handler mapping domain, validation & serialization errors ([`errorHandler.ts`](src/middlewares/errorHandler.ts))
- [x] **Factory pattern** — a factory for constructing domain entities/DTOs with sensible defaults, decoupling creation from the caller.
- [x] **Builder pattern** — a fluent query/filter builder for complex list endpoints, replacing ad-hoc `where` object assembly.
- [x] **Strategy pattern** — pluggable strategies for a varying policy (e.g. password-hashing algorithm, or notification channel) selected at runtime.
- [x] **Repository & Unit of Work** — formalize the model layer behind explicit repository interfaces and wrap multi-step writes in a Unit of Work.
- [x] **Adapter pattern** — wrap the external API client and the cache client behind adapters so the core stays framework-agnostic.
- [x] **Domain events / Observer** — emit events (`UserRegistered`) that decoupled handlers react to, paving the way toward event-driven design.

### Standards & practices

- [x] **Request validation & typing** — Zod schemas as the single source of truth for validation, types, and docs
- [x] **Enumeration-safe login** — identical error for unknown email vs. wrong password
- [x] **Migrations, not auto-sync** — versioned schema via TypeORM migrations
- [x] **Transactions** — all-or-nothing bulk writes
- [x] **Soft deletes** — `isDeleted` flag, filtered on every read
- [x] **Offset pagination** — validated `limit`/`offset` with a `{ data, total, … }` envelope
- [x] **Env validation** — Zod-checked configuration; the app refuses to boot when misconfigured
- [x] **Testing pyramid** — unit + route tests, plus real-Postgres integration tests via Testcontainers
- [x] **CI** — GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
- [x] **Lint & format** — ESLint + Prettier
- [ ] **Observability** — OpenTelemetry tracing + Prometheus metrics + a `/metrics` endpoint, so requests are traceable end-to-end.
- [x] **RFC 7807 error format** — return `application/problem+json` with machine-readable error codes, upgrading the current error envelope.
- [x] **API versioning** — a `/v1` prefix and a strategy for evolving the contract without breaking clients.
- [x] **Idempotency keys** — make unsafe POSTs safely retryable.
- [x] **Resilience** — retry with backoff and a circuit breaker around outbound calls to the external API.
- [x] **Security hardening** — `@fastify/helmet` for security headers and a considered CORS policy.
- [x] **Database seeding** — a seed script for realistic local/demo data.
- [x] **Pre-commit hooks** — Husky + lint-staged to run lint/format/typecheck before commits land.
- [x] **Cursor-based pagination** — offer keyset pagination alongside offset for large, changing datasets.

---

## Getting started

### Prerequisites

- Node.js 24+
- Docker (for the database, and for integration tests)

### 1. Configure environment

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

| Variable                                              | Notes                                        |
| ----------------------------------------------------- | -------------------------------------------- |
| `PORT`                                                | HTTP port (default `3000`)                   |
| `DATABASE_URL`                                        | Postgres connection string                   |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Used by Docker Compose                       |
| `REDIS_URL`                                           | Redis connection (cache, queue, token store) |
| `JWT_SECRET`                                          | **Min. 32 characters**                       |
| `JWT_ACCESS_EXPIRES_IN`                               | Access-token lifetime (default `15m`)        |
| `JWT_REFRESH_EXPIRES_IN`                              | Refresh-token lifetime (default `7d`)        |
| `EMAIL_FROM`                                          | From-address for transactional email         |
| `LOG_LEVEL`                                           | `fatal`…`trace` (default `info`)             |
| `NODE_ENV`                                            | `development` \| `production` \| `test`      |

Environment variables are themselves validated with Zod at startup ([`env.config.ts`](src/config/env.config.ts)) — the app refuses to boot with a misconfigured environment.

### 2. Run with Docker Compose (recommended)

Brings up Postgres, Redis, the API, and the background worker, running pending migrations first:

```bash
docker compose up --build
```

### 3. Or run locally

```bash
npm install

# start the database and Redis
docker compose up -d db redis

# apply migrations
npm run migration:run

# start the dev server (hot reload)
npm run dev

# in a second terminal, start the background job worker
npm run worker
```

The API is now at `http://localhost:3000`, with interactive docs at **`http://localhost:3000/docs`**.

---

## API overview

All application endpoints live under a `/v1` prefix so the contract can evolve without breaking clients; the infrastructure probes (`/health`, `/ready`) and the docs stay unversioned.

| Method   | Path                | Auth  | Description                                     |
| -------- | ------------------- | ----- | ----------------------------------------------- |
| `POST`   | `/v1/auth/register` | —     | Create an account                               |
| `POST`   | `/v1/auth/login`    | —     | Obtain an access + refresh token pair           |
| `POST`   | `/v1/auth/refresh`  | —     | Rotate: exchange a refresh token for a new pair |
| `POST`   | `/v1/auth/logout`   | —     | Revoke a refresh token (session)                |
| `GET`    | `/v1/users`         | user  | List users (offset-paginated, filterable)       |
| `GET`    | `/v1/users/cursor`  | user  | List users (cursor / keyset pagination)         |
| `GET`    | `/v1/users/:id`     | user  | Get one user                                    |
| `POST`   | `/v1/users`         | admin | Create a user                                   |
| `POST`   | `/v1/users/bulk`    | admin | Create many (transactional)                     |
| `PUT`    | `/v1/users/:id`     | admin | Update a user                                   |
| `DELETE` | `/v1/users/:id`     | admin | Soft-delete a user                              |
| `GET`    | `/health`           | —     | Liveness probe                                  |
| `GET`    | `/ready`            | —     | Readiness probe (DB check)                      |

The full, always-up-to-date contract is served from `/docs` (generated from the same Zod schemas the routes validate against).

---

## Useful scripts

```bash
npm run dev                 # dev server with hot reload
npm run worker              # background job worker (BullMQ consumer)
npm run build               # compile TypeScript to dist/
npm start                   # run the compiled build
npm run migration:generate  # generate a migration from entity changes
npm run migration:run       # apply pending migrations
npm run migration:revert    # roll back the last migration
npm run seed                # populate the DB with demo data (via the user factory)
npm run lint / lint:fix     # ESLint
npm run format / format:check  # Prettier
npm run typecheck           # type-check without emitting
```
