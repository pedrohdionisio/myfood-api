# MyFood API

Backend of MyFood, an iFood-style food delivery platform. Portfolio project built to production standards (mid/senior level).

MyFood is split into three independent repositories:

- `myfood-api` (this repo): Fastify REST API
- `myfood-dashboard`: React web dashboard for restaurant owners
- `myfood-app`: React Native (Expo) app for customers and drivers

Read `docs/architecture.md` before making non-trivial changes. The database schema lives in `docs/myfood-schema.dbml`.

## Stack

- Node.js + TypeScript (strict, legacy decorators enabled)
- Fastify with `fastify-type-provider-zod` and `@fastify/swagger`
- tsyringe for dependency injection
- Drizzle ORM with the `postgres.js` driver
- PostgreSQL (`pg_trgm` and `unaccent` extensions)
- Docker / docker-compose for local development
- AWS via Serverless Framework: Cognito, S3, SQS and Lambda only
- Pino for logging

## Runtime model

- The API runs locally in a Docker container. There is no deployed environment yet.
- Keep the API deployment-agnostic: `buildApp()` builds the Fastify instance; `server.ts` calls `listen`, and a future `lambda.ts` may wrap it. Never put AWS runtime assumptions inside `buildApp()`.
- The database is only reached through `DATABASE_URL`. Do not use Neon-specific drivers.
- Serverless Framework provisions pay-per-use resources (Cognito, S3, SQS) and the Lambdas under `src/lambda/`. Do not provision RDS, ECS, NAT Gateways or any always-on infrastructure.
- **Only asynchronous work that never touches Postgres may become a Lambda** while the database is a local container. Today that is image processing alone; the consumers under `src/workers/` stay as containers. A Lambda entry point is a thin shell over a use case — it must not build the DI container or import `config/env.ts`, both of which require `DATABASE_URL`.
- `sharp` runs from a Lambda layer built by `scripts/build-layers.sh` (linux/arm64/glibc). Deploy with `pnpm deploy`, never `sls deploy` alone, or the layer goes up stale.

## Workflow

- **Tests are Vitest, in two projects.** `unit` (`tests/unit/`) covers pure domain rules and use cases that only orchestrate external ports; `feature` (`tests/feature/`) drives the real app through `app.inject()` against a real Postgres started by Testcontainers. Only external services are faked — Postgres never is, because the invariants live in SQL. New behavior gets tests; reuse `tests/support/` (fakes, factories, scenarios) instead of building setup inline. Docker must be running for `pnpm test:feature`.
- **After finishing any action or phase, run `pnpm lint && pnpm typecheck && pnpm test`** and report the result.
- **Almost no comments.** Do not narrate what the code does, and do not write JSDoc as a matter of course. A comment is justified only when the code alone would lead someone to make a wrong change — a non-obvious constraint, or a workaround that looks like a mistake. Explain everything else to the user in conversation instead.
- **Comments, when they exist, are written in Portuguese.** This is the one exception to the English rule below: identifiers, table and column names, commit messages and documentation stay in English.

## Architecture

Clean architecture with dependency inversion. Dependencies point inwards only: `http` → `application` → `domain`, with `infra` implementing `application`
interfaces. Nothing in `application` or `domain` imports Drizzle, Fastify or the AWS SDK.

```
src/
  domain/        pure rules and types; imports nothing from the other layers
  application/
    interfaces/  ports (I*.ts) — what the use cases need from the outside world
    useCases/    one class per operation, with an execute() method
  infra/
    repositories/  Drizzle implementations of the repository ports
    gateways/      Cognito, S3 and SQS implementations of the gateway ports
  di/            tokens.ts (Symbols) and container.ts (the composition root)
  http/          app.ts, error-handler.ts, plugins/, routes/
  schemas/       Zod schemas — the HTTP contract, never reused as domain types
  db/            client.ts, schema/, migrations/
```

- **Every constructor parameter needs an explicit `@inject(TOKENS.X)`.** esbuild does not emit
  `design:paramtypes`, so tsyringe cannot resolve a dependency by its type — omitting the decorator
  fails at runtime with `TypeInfo not known`, never at compile time.
- **Routes resolve use cases from the container** at registration time and call `execute()`.
  A route never touches a repository or the database. The one exception is `/ready`, which pings
  the database directly because a health check is infrastructure, not domain.
- **Every `interface` is named with an `I` prefix**, without exception — ports (`ITokenVerifier`),
  data shapes (`IAuthenticatedCustomer`, `ICreateCustomerData`) and infrastructure types
  (`IDatabaseConnection`) alike. Type aliases (`type App`, `type Env`) keep their plain names.
- **Repositories return plain objects defined by their interface**, never Drizzle row types, and
  select columns explicitly so a new column is not leaked by accident.
- **Errors carry two messages**: `message` is technical and goes to the log; `userMessage` is what
  the app and the dashboard display, and defaults to a generic string.

## Conventions

- All identifiers (tables, columns, enums, code) are in English.
- IDs are UUIDv7 generated in the application.
- Money is always `integer` cents, with a `_cents` suffix. Never use floats for money.
- Timestamps are `timestamptz`. Business-day aggregation uses the `America/Sao_Paulo` time zone.
- Every route declares Zod schemas for params, query, body **and response**. Responses are serialized only from declared fields.
- The OpenAPI spec is generated from route schemas and served at `/docs`. The two frontends write their HTTP modules by hand against it — nobody generates a client — so the spec is the written contract, not a code source. Treat response schema changes as contract changes anyway: `myfood-dashboard` and `myfood-app` already consume these routes.
- Products, categories and anything referenced by past orders are archived (`archived_at`), never deleted.

## Authentication

The client never calls Cognito directly. `POST /auth/.../sign-up`, `sign-in` and `refresh` are API
routes; the API owns every call to the User Pool through `IAuthGateway`.

**Sign-up is a saga**: create in Cognito, then in the database, and delete the Cognito account if
the database write fails. An account that exists in Cognito and not in the database can
authenticate but has no identity here, which is a broken state, not a degraded one.

## Non-negotiable rules

1. **`orders.delivery_code` is visible only to the customer who owns the order.** It must never appear in restaurant or driver routes, SSE/event payloads, push notification text or logs (keep it in Pino `redact`). The guarantee is structural — only the customer's own order route may declare the field in a response schema, and Fastify serializes nothing that is not declared — and `tests/feature/invariants/` enforces it: one test walks the OpenAPI spec for routes declaring the field, another reads every restaurant and driver payload looking for the code.
2. **Never trust totals from the client.** Checkout recalculates prices, availability, delivery city, delivery fee and opening hours from the database.
3. **Order status changes go through the state machine** (`docs/architecture.md`) and always write a row to `order_status_history` in the same transaction.
4. **Delivery confirmation is atomic**: a single conditional `UPDATE ... WHERE status = 'OUT_FOR_DELIVERY' AND delivery_code = $code`, with a per-order attempt limit and every attempt recorded in `delivery_confirmation_attempts`.
5. **Authorization checks restaurant membership and role in the database on every request** (`restaurant_members.active`), not only Cognito token claims. Restaurant-scoped routes live under `/restaurants/:restaurantId/`, and `requireMembership` resolves the membership from that path param.
6. **SQS consumers are idempotent** via `processed_messages`.
7. **Order item prices use `calculateLineTotal`**, a single function shared across the codebase. `order_items.unit_price_cents` is the final per-unit price of the line.
8. **Payment webhooks are verified twice** — `webhookSecret` query param and the `X-Webhook-Signature` HMAC, both in constant time — and deduplicated by event id in `payment_webhook_events`. The route answers 401 on a failed check and **500 on a processing failure**, because that is what makes AbacatePay retry.
9. **`ORDER_CREATED` is only enqueued once the order is really placed.** For `ONLINE` that is when the payment confirms, not at checkout — otherwise the aggregates count revenue that never arrived.

## Out of scope for now

- Product add-ons (`option_groups`, `options`): not in the MVP, but the code must stay ready for them (see architecture doc)
- Paying the restaurant: AbacatePay has no split, so settlement happens outside the system (D15)
- Real-time driver location on a map
