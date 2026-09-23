---
paths:
  - "src/http/**"
  - "src/schemas/**"
---

# HTTP layer: routes, plugins and the contract

## Routes

- One `register<Resource>Routes(app, container)` per file in `src/http/routes/`, registered in
  `buildApp()`. Use cases are resolved from the container **once, at registration**, and the
  handler only calls `execute()` and maps the result. A route never touches a repository or the
  database (the one exception is `/ready`).
- Every route declares Zod schemas for `params`, `querystring`, `body` **and `response`**, plus
  `tags` (one of the tags declared in `plugins/swagger.ts` — add a new one there when a resource
  is new) and a `summary` in Portuguese.
- Creation answers `201` through `reply.status(201).send(...)`; everything else answers `200`
  with the returned value. There is no `204`: deletes and archives return the resource or the
  updated list, which is what the frontends use to refresh.
- **Never declare error responses in a route schema.** The swagger `transform` deduces 401, 403,
  422, 429 and 500 from the preHandlers and the schema; declaring them would make Fastify
  serialize errors through them and turn a mismatch into a 500.

## Authentication and authorization

- Customer routes: `preHandler: [app.authenticateCustomer]`, then `requireCustomer(request)`.
- Restaurant-scoped routes live under `/restaurants/:restaurantId/...` with
  `preHandler: [app.authenticateRestaurantUser, app.requireMembership('OWNER')]`, then
  `requireRestaurantUser(request)` / `requireMembershipContext(request)`. Every route under that
  prefix is owner-only; drivers reach their work through `/me/deliveries` and
  `/orders/:orderId/...`.
- Keep the preHandler function names (`authenticateCustomer`, `authenticateRestaurantUser`,
  `requireMembershipPreHandler`): the OpenAPI `transform` finds them by name to document the
  security scheme, the 401 and the 403.
- Fastify validates the request **before** preHandlers run, so an unauthenticated request with a
  bad body gets 422, not 401. That is expected.

## Schemas (`src/schemas/`)

- Schemas are the HTTP contract, never domain types. One file per resource, `camelCase` fields,
  names ending in `BodySchema`, `QuerySchema`, `ParamsSchema` or `ResponseSchema`.
- Mapping from the port shape to the response lives next to the schema as
  `to<Thing>Response(...)`, typed `z.infer<typeof schema>`. Image keys become URLs there, with
  `buildImageUrls(mediaBaseUrl, key)`.
- Responses are serialized only from declared fields — that is what keeps `deliveryCode` out of
  restaurant and driver routes. **Only the customer's own order routes may declare it.**
- Dates in responses are ISO strings (`z.iso.datetime()`), money is `z.int()` cents.

## Errors

- Throw the domain errors (`NotFoundError`, `ForbiddenError`, `ConflictError`, `DomainError`,
  `TooManyRequestsError`, `UnauthorizedError`); the error handler turns them into
  `{ code, message, details?, requestId }`. `message` in the body is the `userMessage`.
- `DomainError` (422) is a violated business rule; put in `details` what a screen needs to render
  it (`{ missing: [...] }`, `{ productIds: [...] }`).

## The contract

- `myfood-dashboard` and `myfood-app` write their HTTP modules by hand against `docs/api/`.
  Removing or renaming a response field, or tightening a request, breaks them: before doing it,
  search both repos (`../myfood-dashboard/src`, `../myfood-app/src`) for the route and say who is
  affected.
- After any route or schema change, run `pnpm docs:openapi` and commit `docs/api/` with the change.
  CI fails when the committed spec differs from the routes.
- Rate limits are per route in `config.rateLimit`; auth, checkout and delivery confirmation have
  their own. Webhooks and health checks turn it off.
