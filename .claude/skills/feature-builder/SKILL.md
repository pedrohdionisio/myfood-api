---
name: feature-builder
description: Builds a MyFood API feature end to end — spec, implementation, tests, verification, review and docs — by orchestrating the api-builder, test-writer and code-reviewer subagents. Use for a new endpoint, a new business rule or a change to an existing flow.
when_to_use: 'Pedidos como "cria o endpoint", "implementa a feature", "adiciona a rota" ou "quero que a API faça...".'
argument-hint: "[what the feature must do]"
---

# Feature builder

You orchestrate; the subagents do the specialist work. Subagents start without this conversation,
so every delegation message must carry what they need: the spec, the acceptance criteria and the
files involved. They do load `CLAUDE.md` and the rules in `.claude/rules/`.

Request: $ARGUMENTS

## 0. Size it

If the change is a few lines in one layer (a new field in a response, a message, a limit), do it
yourself following the same checklist — spec, clarify, change, test, verification — without
subagents.
Subagents pay off when the change crosses layers.

## 1. Spec

Read the parts of `docs/architecture.md` the feature touches and the closest existing feature.
Then write the spec in the conversation:

- **Routes** — method, path, who calls it (customer, owner, driver, public), request, response,
  status codes, errors with their `userMessage`.
- **Rules** — the business rules, where each is enforced (domain, SQL, route), and which
  non-negotiable rules from `CLAUDE.md` apply.
- **Data** — tables, columns, indexes, migration.
- **Contract impact** — search `../myfood-dashboard/src` and `../myfood-app/src` for anything that
  changes; list who breaks.
- **Acceptance criteria** — numbered, each one observable through the API or the database. These
  drive the tests.

## 2. Clarify with the user

With the spec written and before any code, list what is still open. A doubt is real when:

- the request, the code and `docs/architecture.md` do not settle it;
- different answers lead to different code, contract, data or tests.

A doubt is not real when a convention or an existing feature already answers it. Decide those
yourself and record the decision in the spec.

If real doubts remain, ask them in one round with AskUserQuestion, up to four questions:

- each one concrete, with 2–4 options and the trade-off of each;
- your recommendation first, marked "(Recomendado)";
- include what a good answer depends on — who uses the feature, which screen calls it, what
  happens in the edge case — so the answer brings context, not just a choice.

Fold the answers into the spec, then go on. With no real doubts, skip this step silently: do not
ask for confirmation of the spec.

## 3. Implement — `api-builder`

Delegate with the full spec. Wait for its report and read it: the files, the contract, the
migrations and its decisions. If it stopped with a question, answer it (or ask the user) and
continue it with SendMessage.

## 4. Test — `test-writer`

Delegate with the spec, the numbered acceptance criteria and the file list from step 3. It writes
and runs the tests and never edits `src/`.

## 5. Verify

Run `pnpm lint && pnpm typecheck && pnpm test` yourself. For each failure decide who is wrong:

- production code → continue `api-builder` with SendMessage, quoting the failing assertion;
- the test → continue `test-writer` the same way.

Repeat until green. If Docker is down, the feature tests cannot run — say so and do not call the
feature verified.

## 6. Review — `code-reviewer`

Delegate with the spec and the list of changed files. For each finding, check it against the code
before acting. Send confirmed ones to the agent that owns the file (SendMessage), then rerun step 5.
At most two review rounds; anything left goes into the report.

## 7. Docs and tools

- `docs/api/` regenerated (`pnpm docs:openapi`) whenever a route or schema changed.
- `docs/architecture.md` updated when a decision or flow changed; a new decision gets a `D<n>` row.
- `docs/myfood-schema.dbml` updated when the schema changed.
- Add every new endpoint to the Yaak workspace (`mcp__yaak__*`), copying the folders, names,
  headers and `{{ }}` variables of the existing requests. If the Yaak server is not connected,
  say so in the report.

## 8. Report

In Portuguese, to the user:

- what was built, route by route;
- contract changes and which frontend files they affect;
- migrations;
- the verification result, with counts;
- review findings you did not fix, and why;
- that nothing was committed.

Do not commit unless the user asks.
