---
name: refactor-audit
description: >
  Audit a codebase scope for tech debt, generate a prioritized refactoring plan.
  Covers dead code, complexity hotspots, DRY violations, dependency health,
  type safety gaps, test coverage, architecture/coupling issues, security smells,
  and naming/readability problems. Outputs an actionable plan at the requested
  detail level — from high-level subtasks to precise file-and-function changes
  for immediate execution.
---

# Refactor Audit

Systematic codebase audit and refactoring plan generator. Run periodically to
identify and reduce tech debt.

## When to use

- Periodic tech debt sweeps
- Before a major feature push (clean the area you'll be working in)
- After a big feature lands (clean up what it left behind)
- When onboarding to an unfamiliar area of the codebase
- When something "feels wrong" but you can't pinpoint it

---

## Phase 0 — Scope & Configuration

Before doing any analysis, ask the user for these inputs. Present them as
questions, don't assume defaults silently.

### 0.1 Target scope

Ask: **"What should I audit?"**

Accept any of:

- A directory path (e.g. `src/shared`)
- A glob pattern (e.g. `src/content-script/**`)
- "everything" (audits the entire `src/` directory)

If the user gives a vague answer like "the auth stuff", use grep/find to locate
the relevant directories and confirm with them before proceeding.

### 0.2 Plan detail level

Ask: **"How detailed should the refactoring plan be?"**

Two modes:

| Mode          | When to use                                                                  | What you produce                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Subtask**   | Plan will be split into subtasks for multiple agent sessions                 | High-level task descriptions with context, goals, and acceptance criteria. Subtask agents will do their own file-level research. |
| **Execution** | You or the user will implement changes immediately in this session           | Precise file paths, function names, line ranges, exact changes to make, and execution order. Like plan mode output.              |

### 0.3 Audit categories

Ask: **"Run all checks or focus on specific areas?"**

Default is all. If the user wants to focus, let them pick from:

1. Dead code & unused exports
2. Complexity hotspots
3. DRY violations & duplication
4. Dependency health
5. Type safety gaps
6. Test coverage gaps
7. Architecture & coupling
8. Security smells
9. Naming & readability

---

## Phase 1 — Discovery

Gather context about the target scope before analyzing anything.

### 1.1 Structural survey

```bash
# File inventory
find <scope> -type f \( -name "*.ts" -o -name "*.css" \) -not -path "*/node_modules/*" | head -200

# Size distribution — find the big files first
find <scope> -type f -name "*.ts" -exec wc -l {} \; | sort -rn | head -30

# Directory structure (2 levels)
find <scope> -type d -maxdepth 3 | head -50
```

### 1.2 Available tooling

This project uses:

- **Package manager:** pnpm
- **Build:** vite-plus (Vite 8 + Rolldown + Oxc), configured in `vite.config.ts`
- **Test:** vitest (via `pnpm test`)
- **Type checker:** TypeScript strict mode (`pnpm typecheck`)
- **Dead code:** knip (`pnpm check:unused` — two-pass: production + full)
- **Formatter:** vite-plus built-in (`pnpm fmt`)
- **Linter:** vite-plus built-in (`pnpm check`)

### 1.3 Existing standards

Check for:
<% if (target === 'claude') { -%>

- `CLAUDE.md` / `.claude/rules/` — project-level AI instructions
- `.claude/skills/` — reusable AI workflows and slash commands
  <% } else if (target === 'copilot') { -%>
- `.github/copilot-instructions.md` / `.github/instructions/` — project-level AI instructions
- `.github/skills/` — reusable AI workflows and slash commands
  <% } else if (target === 'cursor') { -%>
- `.cursor/rules/` — project-level AI instructions
- `.cursor/skills/` — reusable AI workflows and slash commands
  <% } else { -%>
- Project-level AI configuration files and skill directories
  <% } -%>
- `CONTRIBUTING.md` — team conventions
- `.editorconfig`
- AI instructions/skills
- Custom lint rules or eslint plugins

Note any project-specific patterns or conventions so your recommendations
don't fight the existing codebase style.

### 1.4 Recent churn (optional but valuable)

If git is available:

```bash
# Most frequently changed files (last 3 months) — high churn = high debt risk
git log --since="3 months ago" --name-only --pretty=format: -- <scope> | sort | uniq -c | sort -rn | head -20

# Files with the most authors — coordination cost indicator
git log --since="6 months ago" --pretty=format:%an -- <scope> | sort | uniq -c | sort -rn | head -10
```

---

## Phase 2 — Analysis

Run each enabled audit category. For each finding, record:

- **What:** the specific issue
- **Where:** file path and line range (or function/component name)
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Effort:** S (< 30 min) / M (30 min – 2 hrs) / L (2+ hrs)
- **Why it matters:** one sentence on the concrete risk or cost

### Category 1: Dead code & unused exports

**Goal:** Find code that can be deleted with zero behavior change.

Techniques:

- Run knip: `pnpm check:unused` (two-pass — production for unused files/deps, full for unused exports/types)
- For targeted analysis: `pnpm check:unused:prod` or `pnpm check:unused:full`
- Look for commented-out code blocks (>3 lines of comments that look like code)
- Check for entire files with no importers
- Look for feature flags or environment checks that are always true/false
- Note: exports tagged `@knipignore` are intentionally kept (e.g., SC API types in `src/shared/types.ts`)

**Severity guide:**

- CRITICAL: Dead files (entire modules with no importers)
- HIGH: Unused exported functions/components
- MEDIUM: Unused local variables, unreachable branches
- LOW: Commented-out code, unused type definitions

### Category 2: Complexity hotspots

**Goal:** Find functions and components that are too complex to maintain safely.

Techniques:

- File size scan: flag files over 300 lines (WARNING), over 500 lines (CRITICAL)
- Function length: flag functions over 50 lines (WARNING), over 100 lines (CRITICAL)
- Nesting depth: flag anything nested >3 levels deep
- Cyclomatic complexity: count branches (if/else/switch/ternary/&&/||/catch)
  - 1-5: fine
  - 6-10: WARNING — consider splitting
  - 11+: CRITICAL — must split
- Look for functions with >4 parameters (use options object)

**Prioritization formula:**
`(lines / 100) + (branch_count × 0.5) + (nesting_depth × 2)`

Score >5 = HIGH priority for refactoring.

### Category 3: DRY violations & duplication

**Goal:** Find duplicated logic that should be consolidated.

Techniques:

- Search for structurally similar code blocks (>10 lines that differ only in variable names)
- Look for repeated patterns:
  ```bash
  # Find suspiciously similar functions
  grep -rn "function\|const.*=.*=>" <scope> --include="*.ts" | \
    awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -20
  ```
- Check for copy-pasted error handling patterns
- Look for repeated API call patterns that should be a shared utility
- Check for duplicated type definitions across files
- Look for switch/case or if/else chains that repeat across files (→ strategy pattern, lookup table)

**Important distinction:** Structural similarity is NOT always a DRY violation.
Two functions that look alike but serve different domains should stay separate.
Only flag duplication where the logic is genuinely shared knowledge.

**Severity guide:**

- HIGH: Same logic duplicated 3+ times, or duplicated logic that has diverged (bug in one copy, not others)
- MEDIUM: Same logic in 2 places
- LOW: Similar patterns that could share a utility but work fine as-is

### Category 4: Dependency health

**Goal:** Find outdated, vulnerable, or unnecessary dependencies.

Techniques:

- If npm/pnpm: `pnpm outdated` or check `package.json` for pinned ancient versions
- Look for dependencies that are only used in 1-2 files (could be replaced with a small utility)
- Check for multiple packages doing the same thing (e.g., both `axios` and `fetch` wrappers)
- Look for deprecated packages (check for deprecation notices in package.json or README)
- Check for packages that pull in huge transitive dependency trees for minor functionality
- Look for dependencies that should be devDependencies (or vice versa)

**Severity guide:**

- CRITICAL: Known security vulnerabilities (if `npm audit` / `pnpm audit` available, run it)
- HIGH: Deprecated packages, major version behind
- MEDIUM: Multiple packages for same purpose, unnecessary large dependencies
- LOW: Minor version behind, could-be-devDependency misplacements

### Category 5: Type safety gaps

**Goal:** Find places where TypeScript's type system is being bypassed.

Techniques:

```bash
# Count type safety escapes
grep -rn "as any\|: any\|<any>" <scope> --include="*.ts" | wc -l

# Find specific occurrences
grep -rn "as any" <scope> --include="*.ts"
grep -rn ": any" <scope> --include="*.ts"
grep -rn "@ts-ignore\|@ts-expect-error\|@ts-nocheck" <scope> --include="*.ts"

# Non-null assertions (risky)
grep -rn "!\." <scope> --include="*.ts" | grep -v "!=\|!=="
```

- Also look for: untyped function parameters, `Object` or `{}` as types, excessive use of type assertions
- Note: this project uses `PartialDeep` from type-fest for SC API types — `?.` chains and `as` casts in that area are expected, not type safety gaps
- Check `tsconfig.json` for permissive settings (`strict: false`, `noImplicitAny: false`)

**Severity guide:**

- HIGH: `any` in function signatures (spreads through the call chain), `@ts-nocheck` on entire files
- MEDIUM: `as any` type assertions, non-null assertions in complex logic
- LOW: `@ts-expect-error` with explanation comments (at least they're documented)

### Category 6: Test coverage gaps

**Goal:** Find critical code paths that lack test coverage.

Techniques:

- Run tests: `pnpm test`
- Heuristic approach for coverage gaps:
  ```bash
  # Find source files with no corresponding test file
  # Tests are colocated (e.g., filters.test.ts next to filters.ts)
  find <scope> -name "*.ts" -not -name "*.test.*" -not -path "*/node_modules/*" -not -path "*/test/*" | while read src; do
    base=$(basename "$src" .ts)
    dir=$(dirname "$src")
    test_count=$(find "$dir" -name "${base}.test.*" | wc -l)
    if [ "$test_count" -eq 0 ]; then echo "NO TESTS: $src"; fi
  done
  ```
- Cross-reference with complexity hotspots: complex + untested = highest risk
- Check for test files that exist but only test the happy path (look for test files with <3 test cases for complex modules)
- Look for mocked-everything tests that don't actually validate behavior

**Severity guide:**

- CRITICAL: Business logic with no tests AND high complexity
- HIGH: Public API functions/components with no tests
- MEDIUM: Utility functions with no tests, test files with very few assertions
- LOW: Type-only files, pure config files without tests

### Category 7: Architecture & coupling

**Goal:** Find structural problems that make the codebase hard to change.

Techniques:

- **Circular dependencies:** trace import chains looking for cycles
  ```bash
  # Quick circular dependency check
  # For each file, check if any of its imports also import it back
  grep -rn "^import" <scope> --include="*.ts"
  ```
  (Or use `madge --circular` if available)
- **Layer violations:** content-script should not import from injected (and vice versa) — both import from shared only
- **God modules:** files that are imported by >15 other files (high fan-in = risky to change)
  ```bash
  # Most-imported files
  grep -rn "from.*['\"]" <scope> --include="*.ts" | \
    grep -oP "from ['\"]([^'\"]+)['\"]" | sort | uniq -c | sort -rn | head -20
  ```
- **Coupling indicators:** files that always change together in git history
- **Misplaced logic:** content-script containing filter/search logic that belongs in shared, injected script containing UI concerns

**Severity guide:**

- CRITICAL: Circular dependency cycles
- HIGH: God modules (>20 importers), layer violations
- MEDIUM: Barrel file bloat, high coupling between unrelated modules
- LOW: Minor structural inconsistencies

### Category 8: Security smells

**Goal:** Find patterns that could lead to security issues.

Techniques:

```bash
# Hardcoded secrets
grep -rn "password\|secret\|api_key\|apikey\|token\|private_key" <scope> --include="*.ts" | grep -v "test\|\.d\.ts\|type\|interface"

# XSS risks (this is a browser extension that injects into SC's DOM)
grep -rn "innerHTML" <scope> --include="*.ts"

# Eval and friends
grep -rn "eval(\|new Function(" <scope> --include="*.ts"

# Unsafe DOM manipulation — extension injects HTML via innerHTML, check for unsanitized user input
grep -rn "\.innerHTML\s*=" <scope> --include="*.ts"
```

- Check for user-controlled input being inserted into DOM without escaping
- Look for `postMessage` handlers that don't validate message origin/type
- Check for unsafe URL construction from filter state (query param injection)

**Severity guide:**

- CRITICAL: Hardcoded secrets, eval with user input, unsanitized innerHTML from user input
- HIGH: XSS vectors via DOM injection, postMessage handlers without origin validation
- MEDIUM: URL construction from user input without encoding
- LOW: innerHTML with static/trusted content (still worth noting for a browser extension)

### Category 9: Naming & readability

**Goal:** Find names that mislead or confuse.

Techniques:

- Single-letter variables outside of loop indices and arrow function shorthands
- Boolean variables/functions not starting with `is`/`has`/`can`/`should`/`will`
- Functions >30 chars (probably doing too much if you need that many words)
- Inconsistent naming conventions within the scope (mixing camelCase and snake_case)
- Misleading names: function named `getX` that has side effects, or `isX` that returns non-boolean
- Abbreviated names that aren't universally known (`mgr`, `proc`, `val`, `tmp`, `cb`)
- Generic names: `data`, `info`, `result`, `item`, `stuff`, `thing`, `handler`, `manager`, `service`, `utils`, `helpers`

**Severity guide:**

- HIGH: Misleading names (function behavior contradicts its name)
- MEDIUM: Generic names on important domain concepts
- LOW: Minor inconsistencies, slightly too-long names

---

## Phase 3 — Prioritization

After all checks complete, sort all findings into a prioritized list.

### Scoring formula

For each finding, compute:

```
priority_score = severity_weight + effort_bonus + churn_bonus + coupling_bonus

severity_weight:
  CRITICAL = 10
  HIGH     = 7
  MEDIUM   = 4
  LOW      = 1

effort_bonus (favor quick wins):
  S (< 30 min)    = +3
  M (30 min–2 hr) = +1
  L (2+ hr)       = +0

churn_bonus (if git data available):
  File changed >10 times in 3 months = +3
  File changed 5–10 times            = +1
  File changed <5 times              = +0

coupling_bonus (more importers = higher risk):
  >15 importers = +3
  5–15 importers = +1
  <5 importers   = +0
```

Sort descending by `priority_score`. Group into tiers:

- **Tier 1 (Do first):** score ≥ 12
- **Tier 2 (Do soon):** score 8–11
- **Tier 3 (Do eventually):** score 4–7
- **Tier 4 (Nice to have):** score < 4

---

## Phase 4 — Plan Generation

Generate the refactoring plan in the requested detail level.

### Subtask mode output

For each tier (starting from Tier 1), generate task descriptions like:

```markdown
## Task: [short descriptive title]

**Category:** [which audit category]
**Tier:** [1-4]
**Estimated effort:** [S/M/L]
**Findings addressed:** [count]

### Context

[2-3 sentences explaining what the problem is and why it matters.
Include enough info for a fresh agent session to understand the situation.]

### Goal

[1-2 sentences on what "done" looks like]

### Scope

[List the files/directories involved — just names, the executing agent will read them]

### Acceptance criteria

- [ ] [Specific, verifiable criterion]
- [ ] [Another criterion]
- [ ] All existing tests still pass
- [ ] No new lint errors introduced
```

Group related findings into single tasks where they touch the same files.
Aim for tasks that take 15-60 minutes each. Split anything larger.

### Execution mode output

For each tier, generate precise instructions:

```markdown
## Refactoring: [short title]

**Priority score:** [X] | **Severity:** [X] | **Effort:** [S/M/L]

### Changes

1. **`path/to/file.ts` (lines 45-78):**
   - Extract the nested if/else block in `processPayment()` into a separate
     `validatePaymentMethod(method: PaymentMethod): ValidationResult` function
   - Move it to `path/to/payment-validation.ts`
   - Update imports in `path/to/file.ts` and `path/to/other-consumer.ts`

2. **`path/to/another-file.ts` (lines 12-15):**
   - Replace `as any` with proper generic: `Record<string, PaymentConfig>`
   - The type definition exists in `path/to/types.ts` line 34

### Verification

- Run: `pnpm test`
- Run: `pnpm typecheck`
- Run: `pnpm check:unused`
- Confirm no new lint errors: `pnpm check`
```

---

## Phase 5 — Summary

After the plan is generated, present a brief summary:

```markdown
## Audit Summary

**Scope:** [what was analyzed]
**Files scanned:** [count]
**Total findings:** [count]
**Breakdown:**

- Tier 1 (critical): [count] findings → [count] tasks
- Tier 2 (high): [count] findings → [count] tasks
- Tier 3 (medium): [count] findings → [count] tasks
- Tier 4 (low): [count] findings → [count] tasks

**Top 3 systemic issues:**

1. [Pattern that appears across multiple findings]
2. [Another pattern]
3. [Another pattern]

**Quick wins (< 30 min, high impact):**

- [Task name] — [one-line description]
- [Task name] — [one-line description]

**Estimated total effort:** [rough range in hours]
```

---

## Principles

These principles guide the analysis. When in conflict, earlier items take
precedence:

1. **Don't break things.** Every recommended change must preserve existing behavior unless explicitly flagged as a behavior change.
2. **Tests first.** If a refactoring target has no tests, the first task is always "write characterization tests" before changing anything.
3. **Small, safe changes.** Prefer many small refactorings over fewer large ones. Each task should be independently shippable.
4. **Duplication is better than the wrong abstraction.** Don't recommend DRY consolidation unless the duplicated logic is genuinely shared knowledge, not just structurally similar.
5. **Existing conventions win.** Recommendations should follow the project's existing patterns. Don't suggest a complete architectural overhaul when the issue is localized.
6. **Delete before refactor.** If code can be deleted instead of refactored, prefer deletion.
7. **Tooling over judgment.** When a linter, type checker, or test runner can verify a finding, use it. LLM judgment is the fallback, not the primary detector.
