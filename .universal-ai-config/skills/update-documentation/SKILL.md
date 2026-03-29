---
name: update-documentation
description: >
  Update project documentation after feature changes. Uses conversation context
  and optional dev pointers to update repo guide, README, extension description,
  and in-app help modal. Invoke after implementing user-visible changes.
argumentHint: "[optional pointers: what changed, which docs to focus on]"
---

# Update Documentation

Update all relevant documentation to reflect recent changes. Use the current conversation context plus any extra pointers from $ARGUMENTS to determine what changed and which docs need updates.

## Documentation Targets

Each target has a distinct audience and style. Update only those affected by the changes.

### 1. Repo Guide (developer-facing)

**File:** `<%= instructionPath('repo-guide') %>`
**Audience:** Future developers and AI assistants working on this codebase.
**Contains:** Architecture, key constraints, conventions, build info, directory structure.
**Style:** Technical, precise, imperative. No marketing language.

Update when: internal architecture, build system, conventions, directory structure, store instances, bridge message types, or AI config workflows change.

Do NOT duplicate content from README or extension-description.txt. If the change is only user-facing, skip this file.

**Important:** After editing the repo guide, run `pnpm uac generate` to regenerate target-specific config files.

### 2. README (developer + user-facing)

**File:** `README.md` (project root)
**Audience:** Users and developers visiting the repo.
**Contains:** Features, setup, usage instructions.
**Style:** Concise, friendly, practical.

Update when: user-visible features, setup steps, or usage instructions change.

Do NOT add architectural details, internal patterns, or implementation notes — those belong in the repo guide.

### 3. Extension Description (storefront)

**File:** `extension-description.txt` (project root)
**Audience:** Users browsing Chrome Web Store / Firefox Add-ons / Edge Add-ons.
**Contains:** What the extension does and why it's useful.
**Style:** Plain text only (no markdown/HTML). Sales-oriented, concise. Simple bullet lists (with a bullet character prefix) are OK.

Update when: user-visible features, controls, or filtering capabilities change.

Do NOT include developer details, architecture, or setup instructions.

### 4. Help Modal (in-app user manual)

**File:** `src/content-script/help-modal.ts`
**Audience:** End users of the extension, accessed via the ? button.
**Contains:** HTML content explaining all features, search syntax, and controls.
**Style:** HTML sections with h2/h3/h4 headings, ul/li lists, code tags for syntax. Matches existing structure.

Update when: user-facing features, search syntax, controls, settings, or behavior change.

Keep structure consistent with existing sections. Add new sections for new feature categories; extend existing sections for enhancements.

## Process

1. **Identify what changed.** Use conversation context and $ARGUMENTS. If unclear, ask.
2. **Determine affected docs.** Not every change touches all four targets. Skip unaffected files.
3. **Read current state** of each affected file before editing.
4. **Make minimal, targeted edits.** Add/update/remove only what the changes require. Preserve existing structure and tone.
5. **Cross-check consistency.** Ensure the same feature is described consistently across all updated docs (names, behavior, defaults).
6. **Run verification** if repo guide was changed: `pnpm uac generate`

## Principles

- Match each file's existing tone and structure — do not rewrite sections that haven't changed.
- Keep docs in sync — if a feature name or behavior differs between files, that's a bug.
- When removing a feature, remove it from all docs.
- When adding a feature, add it to all relevant docs (not all four necessarily apply).
- Storefront description and README should never contain internal/developer details.
- Repo guide should never contain user-facing marketing language.
