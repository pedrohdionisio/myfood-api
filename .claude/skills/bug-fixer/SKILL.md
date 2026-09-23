---
name: bug-fixer
description: Fixes a bug in the MyFood API test-first — locate the cause, reproduce it with a failing test through test-writer, fix it (directly or through api-builder), verify and review with code-reviewer. Use when something in the API behaves wrongly.
when_to_use: 'Relatos como "tem um bug", "está quebrando", "retorna errado" ou "não funciona".'
argument-hint: "[the wrong behavior, and how to trigger it]"
---

# Bug fixer

A bug is fixed when a test that failed because of it passes, and nothing else broke.

Bug: $ARGUMENTS

## 1. Locate the cause

Read the route, use case and repository on the path of the bug, and the rules for those layers.
State the root cause in one or two sentences, with `file:line`. If the evidence points to more
than one cause, say which you believe and why before going on. If the "bug" is behavior the
architecture documents on purpose, stop and tell the user.

## 2. Reproduce — `test-writer`

Delegate with the wrong behavior, the expected behavior and the cause you found. It writes the
smallest failing test, runs it, and confirms it fails for the reason of the bug. Read the failure
yourself: a setup error is not a reproduction.

## 3. Fix

- Fix at the layer that owns the rule (see `.claude/rules/`), the smallest change that makes the
  test pass. No refactor on the way.
- A few lines in one layer: fix it yourself. Across layers: delegate to `api-builder` with the
  cause, the failing test and the expected behavior.
- If the fix changes a route or schema, run `pnpm docs:openapi` and check the frontends.

## 4. Verify

`pnpm lint && pnpm typecheck && pnpm test`. The new test passes, and so does everything else.
If Docker is down, say the feature tests could not run.

## 5. Review — `code-reviewer`

Delegate with the cause, the test and the changed files. Apply confirmed findings, then verify
again.

## 6. Report

In Portuguese: the root cause with `file:line`, the fix, the test that proves it, the verification
result, and that nothing was committed.
