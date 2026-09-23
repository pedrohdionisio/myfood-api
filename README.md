# MyFood API

[![CI](https://github.com/pedrohdionisio/myfood-api/actions/workflows/ci.yml/badge.svg)](https://github.com/pedrohdionisio/myfood-api/actions/workflows/ci.yml)

Backend of **MyFood**, an iFood-style food delivery platform: restaurants run their store from a web
dashboard, customers order from a mobile app, and drivers confirm each delivery with a code only the
customer holds.

It is one of three repositories:

| Repository | What it is |
|---|---|
| **myfood-api** (this one) | Fastify REST API, workers and Lambdas |
| [myfood-dashboard](https://github.com/pedrohdionisio/myfood-dashboard) | React dashboard for restaurant owners |
| [myfood-app](https://github.com/pedrohdionisio/myfood-app) | React Native (Expo) app for customers and drivers |

## Highlights

- **Clean architecture with dependency inversion.** `http` → `application` → `domain`, with `infra`
  implementing the ports. Use cases never import Drizzle, Fastify or the AWS SDK.
- **Order state machine** in a single domain module; every transition writes its history row in the
  same transaction.
- **Checkout never trusts the client.** Prices, availability, opening hours, delivery city and fee
  are recalculated from the database, and an `Idempotency-Key` makes a double tap place one order.
- **Delivery code that cannot leak.** Only the customer's own order routes declare it; the tests walk
  the OpenAPI spec and every restaurant and driver payload looking for it.
- **Pix payments** (AbacatePay) with webhooks verified twice, deduplicated, and reconciled by a
  worker when a webhook is lost.
- **Transactional outbox → SQS → idempotent consumers** keep the analytics aggregates exact.
- **Real time** for restaurants over SSE, push notifications for customers and drivers over Expo.
- **Images** go straight to S3 with a presigned POST; a Lambda produces three WebP variants.

The reasoning behind each decision is in [`docs/architecture.md`](docs/architecture.md). The API
reference is generated from the route schemas: open [`docs/api/index.html`](docs/api/index.html),
or `/docs` on a running API.

## Stack

Node.js 24 · TypeScript · Fastify + Zod · tsyringe · Drizzle ORM + PostgreSQL (`pg_trgm`,
`unaccent`) · AWS Cognito, S3, SQS, SES and Lambda via Serverless Framework · Pino · Vitest +
Testcontainers · Biome · Docker

## Running locally

Requirements: Node.js 24, pnpm, Docker and an AWS account (the pay-per-use services run for real in
development; there are no emulators).

```bash
pnpm install
cp .env.example .env

# Cognito pools, bucket, queues and Lambdas. Set SES_FROM_ADDRESS to an address verified in SES
# first, then copy the stack outputs into .env.
pnpm deploy

docker compose up -d        # Postgres, API on :3333 and the three workers
pnpm db:migrate
pnpm db:seed                # optional: restaurants, customers and order history
```

Always deploy with `pnpm deploy`: it rebuilds the `sharp` layer for Lambda first.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | API with reload, outside Docker |
| `pnpm worker:outbox` · `worker:orders` · `worker:payments` | The workers, outside Docker |
| `pnpm db:generate` · `db:migrate` | Create and apply migrations |
| `pnpm docs:openapi` | Regenerate `docs/api/` |
| `pnpm lint` · `pnpm typecheck` | Biome and `tsc` |
| `pnpm test` | Unit and feature tests |

## Tests

```bash
pnpm test:unit      # domain rules and use cases over fake ports, no dependencies
pnpm test:feature   # the whole app through app.inject(), against a real Postgres (Docker)
```

External services (Cognito, S3, AbacatePay, Expo) are faked; Postgres never is, because checkout
numbering, delivery confirmation and idempotency are enforced in SQL. The feature suite starts one
Postgres per run with Testcontainers and gives each worker its own database.

CI runs lint, typecheck, the whole suite, and fails if a migration or the OpenAPI spec is out of
date with the code.

## Project layout

```
src/
  domain/         pure rules: state machine, pricing, opening hours, delivery code
  application/    ports (interfaces) and one use case per operation
  infra/          Drizzle repositories and the Cognito, S3, SQS, AbacatePay and Expo adapters
  http/           Fastify app, plugins and routes
  schemas/        Zod schemas: the HTTP contract
  db/             Drizzle schema and migrations
  di/             composition root
  workers/        outbox publisher, order events consumer, payments sweeper
  lambda/         image processing and the Cognito e-mail trigger
tests/
  unit/  feature/  support/
```
