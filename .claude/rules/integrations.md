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
- A worker may touch Postgres; a Lambda may not.

## Lambdas (`src/lambda/`)

- **Only work that never touches Postgres may be a Lambda** while the database is local. Today:
  image processing and the Cognito `CustomMessage` trigger.
- A Lambda is a thin shell over a use case. It must not build the DI container or import
  `config/env.ts` (both need `DATABASE_URL`); it validates its own env with Zod and builds its
  adapters by hand.
- SQS-triggered handlers return `batchItemFailures` so one bad message does not requeue the batch.
- `sharp` comes from the layer built by `scripts/build-layers.sh`. Deploy with `pnpm deploy`.

## Serverless

- Pay-per-use resources only, every name carrying `${sls:stage}`. Never RDS, ECS, NAT Gateways or
  anything always-on.
