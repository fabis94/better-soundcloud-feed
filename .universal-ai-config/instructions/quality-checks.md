---
description: Verification checks and testing requirements for all code changes
alwaysApply: true
---

# Quality Checks

## Verification After Changes

After any batch of changes, run all checks before considering work done:

```
pnpm typecheck && pnpm check && pnpm test && pnpm check:unused
```

Fix all failures before proceeding.

## Testing Requirements

- All code must have unit tests. New files need colocated `.test.ts` files.
- Tests cover happy paths, edge cases, and error handling.
- When modifying existing code, update existing tests to match and add tests for new behavior.
- Aim for maximum coverage. Skip tests only when setup is prohibitively difficult (e.g. code is deeply entangled with side effects requiring extensive mocking). Document why when skipping.
- When writing new code, structure it to be testable: extract pure functions from side-effectful wrappers, keep business logic separate from DOM/browser API interactions.
