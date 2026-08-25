---
id: OMA-0001
title: Add a new review agent with Typescript features
status: To Do
assignee: []
created_date: '2026-08-11 14:59'
updated_date: '2026-08-25 07:54'
labels: []
milestone: m-0
dependencies: []
modified_files:
  - src/index.ts
  - src/team.ts
  - src/team.test.ts
  - README.md
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the existing `reviewer` agent with a TypeScript-specialized review agent that uses the predefined `typescript-pro` skill (`.agents/skills/typescript-pro/SKILL.md`, auto-discovered by opencode ACP subprocesses — no config change needed).

The new agent reviews TypeScript code and makes recommendations. It is read-only: it never edits files. The coordinator routes to it only for TypeScript-related goals/tasks; non-TS goals get no review step (no generic reviewer fallback).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The team in src/index.ts defines a single review agent (old generic `reviewer` removed) whose system prompt instructs it to load the `typescript-pro` skill and apply its constraints when reviewing TypeScript code
- [x] #2 The new agent's name and system prompt carry TypeScript keywords so the coordinator routes TS-related goals/tasks to it; non-TS goals dispatch no review task
- [ ] #3 A run with a TypeScript goal produces review output referencing typescript-pro guidance (e.g. strict mode, no `any`, type guards) and dashboard.html shows the new agent node in the DAG
- [ ] #4 The new agent is read-only: it makes no file modifications during a run
- [x] #5 `npm test` passes and `npx knip` reports no issues
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 All unit tests pass
- [x] #2 Unit test coverage stays above 80%
- [x] #3 The `knip` linter shows no errors or issues to fix
- [x] #4 README.md documentation is updated
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-25 07:54
---
Implementation complete: generic `reviewer` replaced by read-only `typescript-reviewer` (src/team.ts:34) with typescript-pro skill instructions; team config extracted to src/team.ts for testability; 19/19 tests pass, tsc --noEmit clean, knip exit 0; README.md documents the new agent and TS-only routing.
---

created: 2026-08-25 07:54
---
Reviewer verdict: code changes correct and clean. AC #3 (live TS-goal run evidence in dashboard.html) and AC #4 (observed read-only behavior) remain unverified — no live run was performed. Known limitations: read-only is prompt-only (backend permission is auto-approve), and TS routing relies on LLM judgment with no deterministic guard.
---
<!-- COMMENTS:END -->
