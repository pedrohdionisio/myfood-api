---
paths:
  - "src/db/**"
  - "src/infra/repositories/**"
  - "drizzle.config.ts"
---

# Database: schema, migrations and repositories

## Schema (`src/db/schema/`)

- Columns in `camelCase` in TypeScript, `snake_case` in the database (the client uses
  `casing: 'snake_case'`). Ids with `primaryId()`, audit columns with `...timestamps`.
- Money is `integer` with a `Cents` suffix (`bigint` only for aggregate sums). Timestamps are
  `timestamp({ withTimezone: true })`.
- Invariants belong in the database when it can hold them: `check(...)` for ranges, partial unique
  indexes for "unique while active" (`WHERE archived_at IS NULL`), composite foreign keys to keep
  a child in its parent's restaurant.
- Name-matching indexes and checks use `immutable_unaccent(lower(...))`, so "Açaí" and "acai" are
  the same name.
- Keep `docs/myfood-schema.dbml` in step with every table or column you add.

## Migrations (`src/db/migrations/`)

- Generate with `pnpm db:generate`; for SQL Drizzle cannot express (extensions, expression
  indexes, data), use `pnpm drizzle-kit generate --custom --name <what>` and write it by hand,
  separating statements with `--> statement-breakpoint`.
- **Never edit a migration that is already on `main`.** Fix forward with a new one.
- CI runs `db:generate` and fails if it produces a file: a schema change always ships with its
  migration.

## Repositories (`src/infra/repositories/`)

- `Drizzle<Name>Repository implements I<Name>Repository`, `@injectable()`, with
  `@inject(TOKENS.Database) private readonly database: IDatabaseConnection`.
- **Select columns explicitly** with a `<THING>_COLUMNS` object, and return the plain shape of the
  port — never a Drizzle row. Convert `Date` to ISO strings in a `to<Thing>()` mapper.
- `ORDER_COLUMNS_WITHOUT_CODE` is what every restaurant or driver query selects. Only the
  customer's own order queries may select `deliveryCode`.
- Restaurant-facing order queries filter with `VISIBLE_TO_RESTAURANT`: an order waiting for payment
  does not exist for the restaurant.
- A multi-statement write is one `db.transaction(async (tx) => ...)`. Status changes write
  `order_status_history` and, when they affect aggregates, an `outbox_events` row in the same
  transaction. Import `Transaction` from `@/db/client.js`.
- Conditional writes return what happened (`boolean`, outcome, `null`); lock the row
  (`.for('update')`) when a rule must be counted and enforced in the same transaction.
- A unique violation becomes a `ConflictError` through `violatesUniqueConstraint(error, name)`,
  matched by constraint name. Anything else is rethrown.
