# MyFood API

Backend of MyFood, an iFood-style food delivery platform. Portfolio project built to production standards (mid/senior level).

MyFood is split into three independent repositories:

- `myfood-api` (this repo): Fastify REST API
- `myfood-dashboard`: React web dashboard for restaurant owners and drivers
- `myfood-app`: React Native (Expo) customer app

Read `docs/architecture.md` before making non-trivial changes. The database schema lives in `docs/myfood-schema.dbml`.

`docs/implementation-plan.md` is the build order. Consult it before starting a phase and update it — checkboxes and the "Current phase" line — at the end of each one.

## Stack

- Node.js + TypeScript (strict)
- Fastify with `fastify-type-provider-zod` and `@fastify/swagger`
- Drizzle ORM with the `postgres.js` driver
- PostgreSQL (`pg_trgm` and `unaccent` extensions)
- Docker / docker-compose for local development
- AWS via Serverless Framework: Cognito, S3, SQS only
- Pino for logging

## Runtime model

- The API runs locally in a Docker container. There is no deployed environment yet.
- Keep the API deployment-agnostic: `buildApp()` builds the Fastify instance; `server.ts` calls `listen`, and a future `lambda.ts` may wrap it. Never put AWS runtime assumptions inside `buildApp()`.
- The database is only reached through `DATABASE_URL`. Do not use Neon-specific drivers.
- Serverless Framework provisions AWS resources only (Cognito, S3, SQS). Do not provision RDS, ECS, NAT Gateways or any always-on infrastructure.

## Workflow

- **Do not write tests for now.** No unit, integration or e2e tests, and no test tooling. The test suite is deferred to a later phase (see the implementation plan); the user runs real verification manually in the meantime.
- **After finishing any action or phase, run the linter and `tsc`** (`pnpm lint && pnpm typecheck`) and report the result. That is the full automated verification for now — do not add other checks.
- **Almost no comments.** Do not narrate what the code does, and do not write JSDoc as a matter of course. A comment is justified only when the code alone would lead someone to make a wrong change — a non-obvious constraint, or a workaround that looks like a mistake. Explain everything else to the user in conversation instead.
- **Comments, when they exist, are written in Portuguese.** This is the one exception to the English rule below: identifiers, table and column names, commit messages and documentation stay in English.

## Conventions

- All identifiers (tables, columns, enums, code) are in English.
- IDs are UUIDv7 generated in the application.
- Money is always `integer` cents, with a `_cents` suffix. Never use floats for money.
- Timestamps are `timestamptz`. Business-day aggregation uses the `America/Sao_Paulo` time zone.
- Every route declares Zod schemas for params, query, body **and response**. Responses are serialized only from declared fields.
- The OpenAPI spec is generated from route schemas and consumed by the frontends to generate typed clients. Treat response schema changes as contract changes.
- Products, categories and anything referenced by past orders are archived (`archived_at`), never deleted.

## Non-negotiable rules

1. **`orders.delivery_code` is visible only to the customer who owns the order.** It must never appear in restaurant or driver routes, SSE/event payloads, push notification text or logs (keep it in Pino `redact`). While there are no tests, the guarantee is purely structural: only the customer's own order route may declare the field in a response schema, and Fastify serializes nothing that is not declared. Integration tests will assert its absence when the suite is written.
2. **Never trust totals from the client.** Checkout recalculates prices, availability, delivery city, delivery fee and opening hours from the database.
3. **Order status changes go through the state machine** (`docs/architecture.md`) and always write a row to `order_status_history` in the same transaction.
4. **Delivery confirmation is atomic**: a single conditional `UPDATE ... WHERE status = 'OUT_FOR_DELIVERY' AND delivery_code = $code`, with a per-order attempt limit and every attempt recorded in `delivery_confirmation_attempts`.
5. **Authorization checks restaurant membership and role in the database on every request** (`restaurant_members.active`), not only Cognito token claims.
6. **SQS consumers are idempotent** via `processed_messages`.
7. **Order item prices use `calculateLineTotal`**, a single function shared across the codebase. `order_items.unit_price_cents` is the final per-unit price of the line.

## Out of scope for now

- Product add-ons (`option_groups`, `options`): not in the MVP, but the code must stay ready for them (see architecture doc)
- Online payments: the gateway has not been chosen yet
- Real-time driver location on a map
