# MyFood API

Backend of MyFood, an iFood-style food delivery platform. Portfolio project built to production
standards (mid/senior level).

MyFood is split into three independent repositories, checked out side by side:

- `myfood-api` (this repo): Fastify REST API, workers and Lambdas
- `../myfood-dashboard`: React web dashboard for restaurant owners
- `../myfood-app`: React Native (Expo) app for customers and drivers

Read `docs/architecture.md` before making non-trivial changes: it holds the reasoning behind every
decision (D1–D18). The database schema is `src/db/schema/`, mirrored in `docs/myfood-schema.dbml`.

## How to work here

- **Do only what was asked.** No extra steps, refactors or files the request did not call for.
  When a change reveals a problem elsewhere, report it instead of fixing it on the way.
- **Talk to the user in Portuguese.** Code, identifiers, commit messages and documentation stay in
  English; code comments are the one exception (below).
- **Commit only when asked, on the current branch.** Never create a branch, push or amend unless
  told to.
- **Verification after every change is `pnpm lint && pnpm typecheck && pnpm test`**, reported with
  its result. `pnpm test:feature` needs Docker running; if it is not, say so instead of skipping
  silently.
- **Almost no comments.** Do not narrate what the code does. A comment is justified only when the
  code alone would lead someone to make a wrong change — a non-obvious constraint, or a workaround
  that looks like a mistake. Comments are written in **Portuguese**, with `//`; `/** */` only on a
  port member, where it shows up on hover.

## Where the rules live

Layer-specific rules are in `.claude/rules/` and load when a matching file is read:

| Rule | Covers |
|---|---|
| `http.md` | routes, plugins, Zod schemas, the OpenAPI contract |
| `application.md` | domain, ports, use cases, dependency injection |
| `persistence.md` | Drizzle schema, migrations, repositories, transactions |
| `integrations.md` | AWS and payment gateways, queues, workers, Lambdas, Serverless |
| `testing.md` | Vitest, fakes, factories, feature and invariant tests |

The workflows are skills that orchestrate specialist subagents:

- `/feature-builder` — a feature end to end: plan → `api-builder` → `test-writer` → verification →
  `code-reviewer` → docs.
- `/bug-fixer` — reproduce with a failing test first, then fix, verify and review.

## Stack

- Node.js 24 + TypeScript (strict, legacy decorators) · Fastify + `fastify-type-provider-zod` ·
  `@fastify/swagger`
- tsyringe · Drizzle ORM with `postgres.js` · PostgreSQL 16 (`pg_trgm`, `unaccent`)
- AWS through Serverless Framework: Cognito, S3, SQS, SES and Lambda · AbacatePay (Pix) · Expo push
- Pino · Vitest + Testcontainers · Biome · Docker Compose

## Runtime model

- The API and Postgres run locally in Docker. There is no deployed environment yet.
- Keep the API deployment-agnostic: `buildApp()` builds the Fastify instance and `server.ts` calls
  `listen`. Never put AWS runtime assumptions inside `buildApp()`.
- The database is reached only through `DATABASE_URL`. No provider-specific drivers.
- Serverless provisions pay-per-use resources only. Never RDS, ECS, NAT Gateways or anything
  always-on.

## Architecture

Clean architecture with dependency inversion: `http` → `application` → `domain`, with `infra`
implementing `application` ports and `di/container.ts` as the only place that knows both sides.
Nothing in `application` or `domain` imports Drizzle, Fastify or the AWS SDK.

```
src/
  domain/        pure rules and types; imports nothing from the other layers
  application/   interfaces/ (ports, I*.ts) and useCases/ (one class per operation)
  infra/         repositories/ (Drizzle), gateways/ (Cognito, S3, AbacatePay, Expo), queues/ (SQS)
  di/            tokens.ts and container.ts, the composition root
  http/          app.ts, error-handler.ts, plugins/, routes/
  schemas/       Zod schemas — the HTTP contract, never reused as domain types
  config/        env, logger and AWS credentials
  db/            client.ts, schema/, migrations/
  workers/       outbox publisher, order events consumer, payments sweeper
  lambda/        image processing, Cognito e-mail trigger
```

## Conventions

- All identifiers (tables, columns, enums, code) are in English.
- **Every `interface` has an `I` prefix**, without exception. Type aliases keep plain names.
- IDs are UUIDv7 generated in the application.
- Money is always `integer` cents with a `_cents` suffix. Never floats.
- Timestamps are `timestamptz`. Business days use `America/Sao_Paulo`.
- Products, categories and anything referenced by past orders are archived (`archived_at`), never
  deleted.
- **Errors carry two messages**: `message` is technical and goes to the log; `userMessage` is what
  the frontends display.

## Non-negotiable rules

1. **`orders.delivery_code` is visible only to the customer who owns the order.** Never in
   restaurant or driver routes, SSE payloads, push text or logs (keep it in the Pino `redact`).
   Only the customer's own order routes may declare it in a response schema;
   `tests/feature/invariants/` enforces it.
2. **Never trust totals from the client.** Checkout recalculates prices, availability, city, fee
   and opening hours from the database.
3. **Order status changes go through the state machine** and write `order_status_history` in the
   same transaction.
4. **Delivery confirmation is atomic**: one conditional `UPDATE ... WHERE status =
   'OUT_FOR_DELIVERY' AND delivery_code = $code`, with the attempt limit counted in the same
   transaction and every attempt recorded in `delivery_confirmation_attempts`.
5. **Authorization checks membership and role in the database on every request.**
   Restaurant-scoped routes live under `/restaurants/:restaurantId/` and are owner-only.
6. **SQS consumers are idempotent** via `processed_messages`.
7. **Line prices come from `calculateLineTotal`**, the single pricing function.
   `order_items.unit_price_cents` is the final per-unit price.
8. **Payment webhooks are verified twice** (query secret and HMAC, constant time), deduplicated in
   `payment_webhook_events`, and answer 401 on a failed check and 500 on a processing failure.
9. **`ORDER_CREATED` is only enqueued once the order is really placed** — for `ONLINE`, when the
   payment confirms.

## Local environment

- The user's API container owns port **3333**. To run an API of your own, publish another port
  (`docker compose run --rm -p 3334:3333 api`) and stop it when done.
- After adding a dependency, the container keeps its old `node_modules` volume: rebuild with
  `docker compose build --no-cache api`.
- In `.env`, a value starting with `$` must be quoted, or Docker Compose interpolates it to empty.
- Authenticated routes take the Cognito **access** token (`session.accessToken`), not the ID token.
- Deploy with `pnpm deploy`, never `sls deploy` alone: it rebuilds the `sharp` Lambda layer first.

## Out of scope for now

- Product add-ons (`option_groups`, `options`): not in the MVP, but pricing stays ready for them.
- Paying the restaurant: AbacatePay has no split, so settlement happens outside the system (D15).
- Real-time driver location on a map.
