# MyFood API — Implementation plan

Step-by-step build order. Read `architecture.md` for the *why* behind each decision; this file is the *when*.

**Review this file at the end of every phase:** check the boxes, record anything that turned out differently, and re-read the next phase before starting it.

**Current phase:** Phase 2 — Authentication. Blocked on the AWS deploy (see Phase 0). Phase 1 is done.

---

## Ground rules for every phase

- **No tests for now.** No unit, integration or e2e tests, and no test tooling. Everything that was going to be proven by a test is listed in Phase 12 so nothing is lost; real verification is manual and belongs to the user.
- **Automated verification after every action is `pnpm lint && pnpm typecheck`.** Nothing else. Phase 0 must create those two scripts, since every later phase depends on them.
- A phase is done when its "Done when" line holds and both checks pass.
- Every route declares Zod schemas for params, query, body **and response**.
- No phase leaves the build red or the OpenAPI spec broken — the two frontends generate clients from it.

> **What deferring tests costs.** Response schemas are the only thing keeping `delivery_code` out of restaurant and driver payloads (non-negotiable rule 1). Fastify serializes only declared fields, so the guarantee is structural and holds — but nothing will *catch a regression* until Phase 12. Same for the concurrency invariants in Phases 6 and 7: the code is written to be correct, not proven correct. Treat those spots as the ones to re-read when the suite arrives.

---

## Phase 0 — Foundation

No business logic. The goal is a repository where the next phase can be written without detours.

- [x] `package.json` (ESM), `tsconfig.json` with `strict` + `noUncheckedIndexedAccess`, `@/` path alias
- [x] Lint and format (Biome) exposed as `pnpm lint`
- [x] `pnpm typecheck` running `tsc --noEmit`
- [x] `docker-compose.yml`: Postgres 16 + PostGIS 3.5 + API container running `tsx watch`
- [x] `serverless.yml` provisioning **AWS resources only**, all names carrying `${sls:stage}`:
  - [x] two Cognito User Pools (customers, restaurant users) + app clients
  - [x] S3 bucket with CORS allowing browser `PUT` to presigned URLs
  - [x] SQS queue for order events + dead-letter queue
  - [ ] **deploy the `dev` stage and record the outputs in `.env`** — needs AWS credentials and a
        Serverless Framework v4 login; run `pnpm dlx serverless deploy --stage dev`. Phase 2 is
        blocked until this is done.
- [x] `src/config/env.ts` — Zod-validated environment, failing at boot
- [x] `src/app.ts` exporting `buildApp()`; `src/server.ts` calling `listen`. **No AWS assumption inside `buildApp()`.**
- [x] Plugins: `fastify-type-provider-zod`, `@fastify/swagger` + UI, cors, helmet, rate-limit
- [x] Pino with `redact` covering `req.headers.authorization`, `*.delivery_code`, `*.deliveryCode` — from day one, not retrofitted
- [x] Central error handler: `AppError` hierarchy (`NotFound`, `Forbidden`, `Conflict`, `DomainError`) → consistent body; Zod failures → 422; `requestId` on every response
- [x] `GET /health` including a database ping
- [x] Drizzle: `drizzle.config.ts`, `postgres.js` client, `pnpm db:migrate` runner
- [x] Migration `0000`: `CREATE EXTENSION postgis, pg_trgm, unaccent` + an `immutable_unaccent(text)` wrapper
      (`unaccent()` is `STABLE`; an expression index needs an `IMMUTABLE` function)
- [x] `uuidv7()` helper

**Done when:** `docker compose up` boots, `/health` is green, `/docs` renders, and both checks pass. ✅

### Notes from Phase 0

- **PostGIS image:** `postgis/postgis` publishes amd64 only. On Apple Silicon the stack uses
  `imresamu/postgis:16-3.5`, the community multi-arch rebuild of the same Postgres 16 + PostGIS 3.5.
- **TypeScript 7** removed `baseUrl`; path aliases must be relative (`"@/*": ["./src/*"]`).
- **pnpm is pinned** through `packageManager` in `package.json`. Without it, Corepack installed a
  newer pnpm inside the container whose supply-chain policy rejected the lockfile.
- **Verified by hand:** `/health` returns 200 with `x-request-id`, and 503 with
  `{"status":"degraded","database":"down"}` while Postgres is stopped; `/docs` renders; `/docs/json`
  carries the health schema; an unknown route returns the standard error body; migrations are
  idempotent; `immutable_unaccent('Açaí')` returns `Acai` and is registered `IMMUTABLE`.

---

## Phase 1 — Schema and migrations

- [x] Every table from `myfood-schema.dbml` as Drizzle schema; enums as `pgEnum`
- [x] `CHECK` constraints declared on the tables themselves, not in hand-written SQL — Drizzle
      supports `check()`, so the invariant sits next to the column it constrains
- [x] Hand-written SQL migration for the one thing Drizzle cannot express:
      `GIN (immutable_unaccent(...) gin_trgm_ops)` on `restaurants.trade_name` and `products.name`
- [ ] ~~Seed for `cuisine_categories`~~ — dropped on purpose: the database gets filled by exercising
      each endpoint as it is built, so the data is always something a real request produced

**Done when:** migrations apply against an empty database, and a hand-run accent-insensitive search in psql returns what it should. ✅

### Notes from Phase 1

- **No `geography` (D13).** drizzle-kit quotes unknown column types, so `geography(Point,4326)`
  came out as a type name Postgres rejects. See architecture.md §9.
- **drizzle-kit does not order statements by dependency.** Twice a generated migration put
  `ADD CONSTRAINT ... UNIQUE` *after* the composite foreign key that references it, and the
  migration failed. Check statement order whenever a migration adds both a constraint and a
  target for it; reordering the generated file is enough.
- **Composite foreign keys guard the denormalised columns.** `products`, `orders` and `reviews`
  each carry a redundant id for authorization or querying, and each is pinned to its parent by a
  composite FK so the two can never disagree. This is why `menu_categories`, `restaurant_members`
  and `orders` carry extra `UNIQUE` constraints that look redundant against their primary key.
- **Verified by hand:** wrong order total, malformed delivery code, change on a non-cash order,
  a driver from another restaurant, a duplicate display number within one restaurant, a second
  review on the same order, a review pointing at the wrong restaurant, rating 6, negative price,
  a product in another restaurant's category, two default addresses, `day_of_week = 7`, and a
  replayed SQS message — all rejected. Accent-insensitive search matched "Açaí do Zé" for "acai"
  and "Pizzaria São João" for "sao joao".

> **D13 — no geolocation.** No coordinates anywhere: `restaurants` serves its own city for a flat
> `delivery_fee_cents`; `delivery_fee_ranges`, `delivery_radius_m` and `orders.distance_m` are gone.
> The partial unique on `customer_addresses` and the `(city, status)` index are declared in the
> Drizzle schema, so they need no hand-written SQL. See architecture.md §9 for the reasoning and
> what coming back to geo would cost.
>
> The Docker image and the `postgis` extension are left in place: they cost nothing while unused,
> and dropping them would mean recreating the volume now and again when geo returns.

---

## Phase 2 — Authentication and authorization

- [ ] `TokenVerifier` port with the Cognito adapter (`aws-jwt-verify`)
- [ ] `requireCustomer` — resolves `customers` by `cognito_sub`
- [ ] `requireRestaurantUser` — resolves `restaurant_users` by `cognito_sub`
- [ ] `requireMembership(role)` — **reads `restaurant_members.active` from the database on every request** (non-negotiable rule 5), never from token claims
- [ ] `POST /customers/me` and `POST /restaurant-users/me` creating the local row on first login (D5)
- [ ] `POST /restaurants/:id/members` — Cognito `AdminCreateUser` + `restaurant_users` + `restaurant_members` in one operation

**Done when:** a real Cognito token reaches a protected route, and the four rejection paths — no token, wrong pool, `active = false`, wrong role — each return the intended status when exercised by hand.

---

## Phase 3 — Restaurant (owner)

- [ ] `POST /restaurants` — creates a `DRAFT` restaurant, the `OWNER` membership and the `restaurant_order_counters` row in one transaction
- [ ] `PATCH /restaurants/:id`, including `delivery_fee_cents` and `min_order_cents`
- [ ] `opening_hours` bulk CRUD, rejecting overlapping shifts on the same weekday
- [ ] `restaurant_cuisines`
- [ ] `POST /uploads/presign` → client uploads to S3 → `PATCH` stores `logo_key` / `banner_key`
- [ ] `PATCH /restaurants/:id/status` enforcing the activation checklist (D6), listing what is missing on rejection
- [ ] `PATCH /restaurants/:id/accepting-orders`

**Done when:** an incomplete restaurant is refused `ACTIVE` with the missing items named, and an owner cannot touch a restaurant they are not a member of.

---

## Phase 4 — Menu

- [ ] `menu_categories` CRUD
- [ ] `products` CRUD
- [ ] `PATCH /reorder` — bulk position updates in one transaction
- [ ] `PATCH /availability` for sold-out items
- [ ] `DELETE` sets `archived_at`; nothing is ever hard-deleted

**Done when:** an archived product disappears from the menu response while an existing order still shows its snapshot name and price.

---

## Phase 5 — Discovery (customer)

- [ ] `customer_addresses` CRUD, including the single-default rule
- [ ] `GET /restaurants` — filtered by the customer's city and `status = 'ACTIVE'`, with `is_open_now` computed
- [ ] `GET /restaurants/:slug` and `GET /restaurants/:id/menu`
- [ ] `GET /search` using `pg_trgm` + `immutable_unaccent`
- [ ] `GET /cuisine-categories`

**Done when:** "acai" matches a seeded "Açaí" restaurant, and one seeded in another city does not come back.

---

## Phase 6 — Checkout and orders

The core. Build the pure domain first — it is the part that will be tested hardest in Phase 12.

### 6.1 Domain (no I/O)

- [ ] `calculateLineTotal(product, options)` — the single pricing function (non-negotiable rule 7); ignores `options` for now
- [ ] `isOpenAt(openingHours, date, tz)` — handles shifts crossing midnight
- [ ] `resolveDeliveryFee(restaurant)` — flat fee today; the seam where distance-based pricing returns
- [ ] `canTransition(from, to, actor)` + the status → timestamp map
- [ ] `generateDeliveryCode()` using `crypto.randomInt`

### 6.2 `POST /orders`

One transaction:

- [ ] reject `payment_method = 'ONLINE'` until a gateway exists (D1)
- [ ] claim the `Idempotency-Key`; a replay returns the original order (D2)
- [ ] load the restaurant; validate `ACTIVE`, `is_accepting_orders`, opening hours
- [ ] load products by id; validate ownership, `archived_at IS NULL`, `is_available`
- [ ] recompute the subtotal with `calculateLineTotal` — **client totals are ignored** (rule 2)
- [ ] validate that the address city matches the restaurant city, resolve the fee, validate `min_order_cents`
- [ ] draw `display_number` from `restaurant_order_counters` (D8) and generate `delivery_code`
- [ ] snapshot the address into `delivery_*` and the items into `order_items`
- [ ] insert `orders`, `order_items` and the first `order_status_history` row (`from_status` null)
- [ ] publish the order event

### 6.3 Routes

- [ ] Customer: `GET /orders`, `GET /orders/:id` — **the only response schema in the codebase that declares `deliveryCode`** — and `POST /orders/:id/cancel` (allowed from `PENDING` only, D11)
- [ ] Restaurant: `GET /restaurants/:id/orders` and `confirm` / `reject` / `preparing` / `ready` / `dispatch` / `cancel`, every one going through the state machine and writing `order_status_history` in the same transaction (rule 3), using DTOs **without** `deliveryCode`

**Done when:** `grep -ri "deliverycode" src/` shows the field in exactly one response schema (rule 1), and a hand-run script firing concurrent checkouts at one restaurant leaves no duplicate `display_number` — verify with `SELECT display_number, count(*) FROM orders GROUP BY 1 HAVING count(*) > 1`.

---

## Phase 7 — Delivery

- [ ] `GET /me/deliveries` — only `OUT_FOR_DELIVERY` orders whose `driver_member_id` is the caller; money fields only for `CASH` (D9)
- [ ] `POST /orders/:id/confirm-delivery`:
  - [ ] count recent failures in `delivery_confirmation_attempts`; over the limit → 429
  - [ ] one conditional `UPDATE ... WHERE id = $1 AND status = 'OUT_FOR_DELIVERY' AND delivery_code = $2 RETURNING id` (rule 4)
  - [ ] record the attempt **whether it succeeded or not**
  - [ ] on success: status history + event
- [ ] `POST /orders/:id/delivery-failed` — no code required, so orders never get stuck in `OUT_FOR_DELIVERY`

**Done when:** repeated wrong codes start returning 429 and every attempt shows up in `delivery_confirmation_attempts`; two confirmations fired together leave exactly one `DELIVERED` and one status-history row.

---

## Phase 8 — Reviews

- [ ] `POST /orders/:id/review` — `DELIVERED` orders only, owner of the order only, one per order
- [ ] `POST /reviews/:id/reply` for the restaurant owner
- [ ] `rating_avg` / `rating_count` recomputed in the same transaction (D10)

**Done when:** a second review on the same order is refused, and `rating_avg` matches `SELECT avg(rating) FROM reviews`.

---

## Phase 9 — Events and analytics

- [ ] `EventPublisher` port with the SQS adapter
- [ ] SQS consumer worker under `src/workers/`, started separately from `buildApp()`
- [ ] `processed_messages` written in the **same commit** as the aggregate (rule 6)
- [ ] Upserts into `restaurant_daily_stats` and `product_daily_sales`, with the day resolved in `America/Sao_Paulo`
- [ ] `GET /restaurants/:id/analytics?from&to` reading only from the aggregates, averages computed at read time

**Done when:** re-sending the same message to the queue by hand leaves the aggregate row untouched.

---

## Phase 10 — Notifications and real-time

- [ ] `push_tokens` registration
- [ ] Expo push on every status change — **the text never contains the delivery code** (rule 1)
- [ ] `GET /restaurants/:id/orders/stream` over SSE (D3)

**Done when:** a new order reaches an open stream (`curl -N`) without a refresh.

---

## Phase 11 — Hardening

- [ ] OpenAPI pass: `operationId`s, tags, examples, error shapes — this is the frontends' contract
- [ ] Rate limits on auth, checkout and delivery confirmation
- [ ] CI: lint and typecheck
- [ ] README covering setup, the `serverless deploy` step and required environment variables

**Done when:** a clean clone reaches a running API by following the README alone.

---

## Phase 12 — Test suite (deferred)

Not scheduled. Listed so the deferred verification is not lost, roughly in order of what is worth writing first.

- [ ] Vitest + Testcontainers (real PostGIS per suite, migrations applied, truncation between tests)
- [ ] `buildTestApp()` using `app.inject()` — no network port
- [ ] Fake adapters for the three ports: `TokenVerifier`, `EventPublisher`, `FileStorage`
- [ ] **Rule 1:** walk the JSON of every restaurant and driver route asserting `deliveryCode` / `delivery_code` is absent
- [ ] **Rule 4:** brute-force the delivery code until blocked; two concurrent confirmations → one `DELIVERED`
- [ ] **D8:** N concurrent checkouts at one restaurant → no `display_number` collision
- [ ] **D2:** replaying an `Idempotency-Key` returns the original order
- [ ] **Rule 6:** processing the same SQS message twice leaves aggregates unchanged
- [ ] **Rule 2:** a checkout with tampered client totals is priced from the database
- [ ] Domain unit tests: `calculateLineTotal`, `isOpenAt` (including the midnight-crossing shift), `resolveDeliveryFee`, `canTransition`
- [ ] Authorization matrix: no token, wrong pool, inactive member, wrong role
- [ ] Archived product stays resolvable in a historical order
- [ ] One test against a real SQS queue, run outside the default suite
