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
