---
paths:
  - "src/domain/**"
  - "src/application/**"
  - "src/di/**"
---

# Domain, use cases and dependency injection

## Domain (`src/domain/`)

- Pure functions, constants and types. It imports nothing outside `src/domain/` — no Drizzle, no
  Fastify, no tsyringe, no `node:` modules except `crypto` for code and hash generation.
- A business rule lives here once and is reused: the state machine (`order-status.ts`), pricing
  (`calculateLineTotal`), opening hours (`isOpenAt`), notification texts, image keys. Never
  re-implement one of them in a use case or a query.
- Enums are `as const` arrays with a derived type (`ORDER_STATUSES` / `OrderStatus`); the Drizzle
  `pgEnum`s are built from them.
- Errors are the classes in `errors.ts`. The technical `message` names ids and states; the
  `userMessage` is Portuguese, written for the screen.

## Ports (`src/application/interfaces/`)

- One `I<Name>Repository` or `I<Name>Gateway` per file, plus the data shapes it takes and returns
  (`ICreateProductData`, `IProduct`). Dates cross the port as ISO strings.
- A port describes what the use case needs, not how the adapter works: no Drizzle types, no SQL
  words, no AWS names.
- A port method that must report an outcome without rolling back a transaction returns it
  (`boolean`, a union like `ConfirmDeliveryOutcome`, or `null`) instead of throwing.

## Use cases (`src/application/useCases/<resource>/`)

- One class per operation, `@injectable()`, a single `execute()`. Input is one object typed
  `I<UseCase>Input` when there is more than one value.
- **Every constructor parameter carries `@inject(TOKENS.X)`.** esbuild emits no
  `design:paramtypes`, so a missing decorator fails at runtime, not at compile time.
- Order of work: load → check authorization-dependent existence (`NotFoundError` when the caller
  may not see it) → apply domain rules → write through the port → notify.
- **Check-then-write races.** When a rule is "only if the current state allows", the check must
  happen inside the write: a conditional `UPDATE ... WHERE status = $from`, or a count taken in
  the same transaction with the row locked. Reading first and writing later lets concurrent
  requests all pass the check. A write that matched nothing becomes a `ConflictError`.
- Status changes go through `assertCanTransition` and `timestampFieldsFor`, and every order change
  ends in `NotifyOrderChangeUseCase` after the commit.
- Helpers shared by use cases of one resource live beside them (`product-guards.ts`,
  `resolveDriverMembership.ts`), as plain functions taking the ports they need.

## Dependency injection (`src/di/`)

- A new use case or repository needs a `Symbol` in `tokens.ts` and a row in `SINGLETONS` in
  `container.ts`. External adapters go in `IAdapters` / `buildAdapters(env)`, which is how the
  tests swap them for fakes.
- `tests/unit/di/container.test.ts` resolves every token; it is what catches a missing
  registration or `@inject`.
