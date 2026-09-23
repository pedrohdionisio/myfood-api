---
paths:
  - "tests/**"
  - "vitest.config.ts"
---

# Tests

## Which kind

- **Unit** (`tests/unit/`, mirrors `src/`): pure domain rules, helpers, and use cases that only
  orchestrate external ports (sign-up saga, notifications, image variants). No database.
- **Feature** (`tests/feature/`, one file per route module): the real app through
  `app.inject()` against a real Postgres. Anything whose correctness depends on SQL — a query, a
  transaction, a constraint, a conditional update — is a feature test. Never mock a repository.
- **Invariants** (`tests/feature/invariants/`): cross-cutting rules checked for every route at
  once, usually by walking the OpenAPI spec (`listOperations`). A new non-negotiable rule gets one.

## Writing them

- Titles start with `should`: `it('should refuse a driver from another restaurant', ...)`.
- A feature file starts with `const t = setupTestApp()`: it builds the app once per file,
  truncates the database and resets the fakes before each test.
- Reuse `tests/support/` before writing setup inline:
  - `factories.ts` — rows straight into the database (`createRestaurant` is active, accepting
    orders and open 24/7 by default; `createStaff` returns user, membership and token).
  - `scenarios.ts` — `createOrderingScenario`, `placeOrder`, `advanceOrderTo`, `deliverOrder`,
    `ownerAction`, `confirmDelivery`, `statusHistory`, `outboxTypes`.
  - `payments.ts`, `events.ts` (`drainOutbox`), `openapi.ts`, `assertions.ts`
    (`expectNoDeliveryCode`).
  - `fakes/` — one fake per external port; tokens are `tokenFor('customer' | 'restaurant', sub)`.
  When two tests need the same setup, it goes into `support/`, not into a local helper.
- `t.request(method, url, { token, body, query, headers, ip })` gives every request a random IP so
  rate limits do not interfere; pass `ip` only when testing a limit.
- Time: factories make restaurants open all week. For opening-hours cases use
  `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(...)`, never a clock port.
- Assert on the database (history rows, outbox events, attempts) when the rule is about what gets
  written, not only on the response.
- A bug fix starts with a test that fails for the reason of the bug, and passes after the fix.
- Concurrency rules are tested with `Promise.all` over real requests.

## Running

- `pnpm test:unit` needs nothing; `pnpm test:feature` needs Docker (Testcontainers starts
  `postgres:16` once per run and gives each worker its own database).
