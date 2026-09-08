---
id: OMA-0009
title: Add LSP support
status: In Progress
assignee:
  - opencode
created_date: '2026-08-14 14:42'
updated_date: '2026-09-08 09:33'
labels: []
dependencies: []
type: enhancement
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable TypeScript LSP support for the OpenCode-backed agents using OpenCode's built-in `typescript` language server (no new npm dependency — `typescript` is already a devDependency). Add `"lsp": true` to `opencode.jsonc`, which activates all built-in LSP servers whose requirements are met (in this repo: `typescript`; `yaml-ls` auto-installs; eslint/oxlint stay off since those deps aren't present). The OpenCode runtime auto-downloads the language-server binary on first use. All three agents (planner, coder, typescript-reviewer) launch via `opencode acp` from the project root, so the project config applies to all of them. Language-server diagnostics are fed back into the agent loop when `.ts` files are opened.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 opencode.jsonc contains "lsp": true and still validates against the opencode config schema
- [ ] #2 Running a goal that edits .ts files shows the typescript LSP starting (visible in `opencode acp --print-logs` output) and diagnostics available to the agents
- [ ] #3 `npm test`, `npm run typecheck`, and `npx knip` all pass
- [ ] #4 README.md documents the LSP config, which servers are active, and how diagnostics feed agent feedback
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All unit tests pass
- [ ] #2 Unit test coverage stays above 80%
- [ ] #3 The `knip` linter shows no errors or issues to fix
- [ ] #4 README.md documentation is updated
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan (OMA-0009: Add LSP support)

### Approach
Add `"lsp": true` to `opencode.jsonc`. This is a top-level config key validated by the official OpenCode schema (`anyOf: boolean | object`; `true` enables all built-in LSP servers whose requirements are met). No code changes needed — agents launch via `opencode acp` from project root (src/team.ts:11-21), so the project config applies to planner, coder, and typescript-reviewer.

### Steps
1. Add `"lsp": true` to opencode.jsonc (top level, after "experimental").
2. Validate opencode.jsonc against https://opencode.ai/config.json schema (JSONC parse + JSON Schema validation via ajv if available in node_modules).
3. Verify typescript LSP actually starts: check `opencode lsp` CLI / run a minimal ACP session that opens a .ts file and inspect --print-logs output for the typescript language server starting.
4. Run `npm test`, `npm run typecheck`, `npx knip` — all must pass.
5. Update README.md: document LSP config, which servers are active (typescript via existing devDependency; yaml-ls auto-installs; eslint/oxlint off), and how diagnostics feed agent feedback when .ts files are opened.

### Key files
- opencode.jsonc (config change)
- README.md (docs)

### Risks / checkpoints
- Schema validation must pass after the edit (AC #1).
- LSP startup verification (AC #2) may require a model endpoint; if unavailable, verify via `opencode lsp` listing + config-driven activation and document evidence.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-09-08 09:33
---
https://blog.konst.kiwi/neovim-with-the-typescript-language-server-lsp
---
<!-- COMMENTS:END -->
