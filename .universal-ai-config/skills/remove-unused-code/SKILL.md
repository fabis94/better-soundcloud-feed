---
name: remove-unused-code
description: Scan the codebase for unused files, dependencies, and exports using Knip and clean them up
---

## Goal

Identify and remove unused files, dependencies, exports, and types.

## Two-Pass Analysis

`check:unused` runs Knip **twice** (production then full):

1. **Production pass** (`knip --production`): Traces from production entry points only. Test files excluded from project scope. Checks **unused files and dependencies** only — export/type analysis is disabled (deferred to full pass where test context is available).

2. **Full pass** (`knip`): Includes test files as entries. Checks **everything** — unused exports, types, dead imports, etc.

**Why two passes:** Without the production pass, code imported only by tests appears "used." The production pass narrows scope to surface truly dead production code.

## Scripts

```bash
pnpm check:unused          # both passes (fail-fast)
pnpm check:unused:prod     # production pass only
pnpm check:unused:full     # full pass only
```

## Procedure

### 1. Run Knip

```bash
pnpm check:unused
```

If the combined script stops at the production pass, run `check:unused:prod` and `check:unused:full` separately to see both.

### 2. Analyze Output

Knip reports these categories:

- **Unused files** — not imported anywhere in the dependency graph
- **Unused dependencies** — in `package.json` but never imported
- **Unused exports** — exported values/functions never imported elsewhere
- **Unused types** — exported TypeScript types never imported
- **Unlisted dependencies** — imported but not in `package.json`

### 3. Verify Results

Knip can report false positives. Grep for each item before removing.

When false positives are found, add a `/** @knipignore */` JSDoc comment above the export. The knip config uses `tags: ["-knipignore"]` to exclude tagged items.

### 4. Handle Results

- **Unused files** — delete them
- **Unused dependencies** — `pnpm remove <package>`
- **Unused exports** — if used internally, remove `export` keyword; if truly unused, delete
- **Unused types** — remove unless part of a cohesive type set (see edge cases)
- **Unlisted dependencies** — `pnpm add <package>`

### 5. Verify

```bash
pnpm check:unused    # should be clean
pnpm test            # tests still pass
pnpm typecheck       # types still check
```

## Edge Cases

### Cohesive type sets

SC API types in `src/shared/types.ts` are exported as a complete set even if not all are consumed yet. These use `@knipignore` tags. Do not remove them — they document the full API surface.

### CLI-only / bundled dependencies

Some dependencies are tools not imported in source code (e.g., `universal-ai-config`) or are re-exported from another package (e.g., `@voidzero-dev/vite-plus-test` from `vite-plus`). These are listed in `ignoreDependencies` in `knip.ts`.

### Seemingly unnecessary ignores

Knip may flag items in `ignoreDependencies` as unnecessary. Do not remove them without verifying — they may be needed for reasons knip can't detect (CLI tools, bundled re-exports, global type augmentations).
