---
paths:
  - "src/infra/gateways/**"
  - "src/infra/queues/**"
  - "src/infra/streams/**"
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
  published by the `relayOutbox` Lambda (`RelayOutboxUseCase`). Never publish to SQS from a
  request: the request only wakes the relay, through `IOutboxRelayTrigger`, after the commit.
- Consumers are idempotent by message id (`processed_messages`), because SQS delivers at least once
  and the publisher retries.

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
- **No job polls the database on a short interval** (D22). Neon suspends its compute only after 5
  idle minutes, and a per-minute cron would keep it on all month. Background work is triggered by
  an event (an SQS message, an asynchronous invoke after a commit, a one-time EventBridge Scheduler
  schedule) and backed by an hourly sweep. A new job follows the same shape.
- Triggers fired from a request (`IOutboxRelayTrigger`, `IChargeExpiryScheduler`) never reject:
  the state is already committed, and the hourly sweep covers a trigger that failed.
- `sharp` comes from the layer built by `scripts/build-layers.sh`. Deploy with `pnpm run deploy`.

## Serverless

- Pay-per-use resources only, every name carrying `${sls:stage}`. Never RDS, ECS, NAT Gateways or
  anything always-on.
