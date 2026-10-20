---
paths:
  - "src/infra/gateways/**"
  - "src/infra/queues/**"
  - "src/infra/streams/**"
  - "src/workers/**"
  - "src/lambda/**"
  - "src/config/**"
  - "serverless.yml"
  - "scripts/build-layers.sh"
---

# External services, workers and Lambdas

## Gateways

- Each external service sits behind a port in `src/application/interfaces/` and has a real adapter
  here plus a fake in `tests/support/fakes/`. A new port needs both, and an entry in
  `IAdapters`.
- The adapter translates the provider's errors into domain errors (`UnauthorizedError`,
  `ConflictError`, `DomainError`, `TooManyRequestsError`) and never lets an SDK exception type
  cross the port.
- Auth routes must not reveal whether an account exists: a wrong code and an unknown user map to
  the same error, and `forgotPassword` swallows "user not found".
- Push is best effort: `IPushGateway.send` never rejects.
- AWS clients take credentials from `awsCredentials(env)` (`src/config/aws.ts`); without keys the
  SDK uses the default chain.

## Queues and outbox

- Events leave through the outbox: a row in `outbox_events` written in the business transaction,
  published by `workers/outbox-publisher.ts`. Never publish to SQS from a request.
- Consumers are idempotent by message id (`processed_messages`), because SQS delivers at least once
  and the publisher retries.

## Workers (`src/workers/`)

- Long-running containers, one entry point each, built on `runtime.ts`:
  `createWorkerLogger(env, name)` (same `redact` as the API), `shutdownSignal(logger)` and
  `sleep(ms, signal)`. Loops check `signal.aborted` and close the database on the way out.
- Workers still run only in Docker; moving them to Lambdas is the next step of the migration.

## Lambdas (`src/lambda/`)

- The database is Neon (D19), so Lambdas may touch Postgres. `http.ts` is the API: it builds the
  container and the app once per instance, at module load, and hands them to
  `@fastify/aws-lambda`.
- Lambdas that do not need the database (image processing, the Cognito `CustomMessage` trigger)
  stay thin shells over a use case: no DI container, no `config/env.ts`; they validate their own
  env with Zod and build their adapters by hand, so they boot without `DATABASE_URL`.
- `sharp` is imported lazily inside `SharpImageProcessor`. Its JS is bundled, but its native
  binary exists only in the image Lambda's layer and loads as soon as the module is evaluated;
  a static import would break every other Lambda at startup.
- SQS-triggered handlers return `batchItemFailures` so one bad message does not requeue the batch.
- `sharp` comes from the layer built by `scripts/build-layers.sh`. Deploy with `pnpm deploy`.

## Serverless

- Pay-per-use resources only, every name carrying `${sls:stage}`. Never RDS, ECS, NAT Gateways or
  anything always-on.
