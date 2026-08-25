---
id: OMA-0001
title: Add a new review agent with Typescript features
status: To Do
assignee: []
created_date: '2026-08-11 14:59'
updated_date: '2026-08-25 07:26'
labels: []
milestone: m-0
dependencies: []
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
- [ ] #1 The team in src/index.ts defines a single review agent (old generic `reviewer` removed) whose system prompt instructs it to load the `typescript-pro` skill and apply its constraints when reviewing TypeScript code
- [ ] #2 The new agent's name and system prompt carry TypeScript keywords so the coordinator routes TS-related goals/tasks to it; non-TS goals dispatch no review task
- [ ] #3 A run with a TypeScript goal produces review output referencing typescript-pro guidance (e.g. strict mode, no `any`, type guards) and dashboard.html shows the new agent node in the DAG
- [ ] #4 The new agent is read-only: it makes no file modifications during a run
- [ ] #5 `npm test` passes and `npx knip` reports no issues
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All unit tests pass
- [ ] #2 Unit test coverage stays above 80%
- [ ] #3 The `knip` linter shows no errors or issues to fix
- [ ] #4 README.md documentation is updated
<!-- DOD:END -->
