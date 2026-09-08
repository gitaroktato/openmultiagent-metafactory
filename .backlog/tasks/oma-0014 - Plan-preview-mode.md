---
id: OMA-0014
title: Plan preview mode
status: In Progress
assignee: []
created_date: '2026-08-25 09:37'
updated_date: '2026-09-08 10:00'
labels: []
dependencies: []
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a preview plan based on this documentation:

https://open-multi-agent.com/reference/plan-replay/

Steps to take:

1. plan-only mode with orchestrator
2. freeze the plan as tasks
3. execute the tasks
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All unit tests pass
- [ ] #2 Unit test coverage stays above 80%
- [ ] #3 The `knip` linter shows no errors or issues to fix
- [ ] #4 README.md documentation is updated
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
# Implementation Plan — OMA-0014 Plan preview mode

Basis: https://open-multi-agent.com/reference/plan-replay/ — `runTeam(planOnly)` → `createPlanArtifact` → `runFromPlan`. Verified: installed `@open-multi-agent/core@1.15.0` exports `PlanArtifact`, `PlanTaskArtifact`; `orchestrator.createPlanArtifact(result)` and `orchestrator.runFromPlan(team, plan, options?)` exist in dist (orchestrator.d.ts:139,148).

## Decisions (user-approved 2026-09-08)
- CLI shape: **separate flags** — `--plan-only` and `--replay <path>`; default behavior unchanged.
- Knip on replay: **report only, no retry loop**.

## Steps
1. New module `src/plan.ts` (pure, testable):
   - `parseRunModeArgs(argv)` → `{ mode: 'team' | 'plan-only' | 'replay', planFile?: string }`; parses `--plan-only`, `--plan-file <path>`, `--replay <path>`; throws on conflicting flags or `--replay` without a path.
   - `savePlanArtifact(plan: PlanArtifact, path)` / `loadPlanArtifact(path): PlanArtifact` — JSON round-trip + validation (`version === 1`, non-empty `tasks`, each task has `id`/`title`/`description`).
2. `src/index.ts` — three modes:
   - default (no flags): unchanged `runTeam` flow with existing knip feedback loop.
   - `--plan-only [--plan-file <path>]`: `runTeam(team, goal, { ...runTeamOptions, planOnly: true })` → `oma.createPlanArtifact(preview)` → write to `plan.json` (default) via `savePlanArtifact`; print DAG summary; no task agents, no knip; still render `dashboard.html` from the preview result.
   - `--replay <path>`: `loadPlanArtifact(path)` → `oma.runFromPlan(team, plan)` (coordinator not invoked); after execution run knip once, report only, no retry.
3. Tests `src/plan.test.ts` (node:test, matching existing test style):
   - arg parsing: default mode, each flag, missing path for `--replay`, conflicting flags.
   - artifact save/load round-trip + validation failures (bad version, empty tasks, missing description).
4. README.md — new section documenting the three run modes with command examples (`npm run dev -- --goal=... --plan-only`, `--replay plan.json`); note replay pins the graph but not outputs and has no coordinator synthesis step.

## Key files
- src/index.ts (entrypoint, runTeam at line 65, knip loop lines 68–92, dashboard in finally)
- src/plan.ts (new), src/plan.test.ts (new)
- README.md

## Verification (DoD)
- `npm test` green; coverage stays >80% (new code is pure logic, fully covered).
- `npm run typecheck` green.
- `npx knip` clean.
- README updated.
<!-- SECTION:PLAN:END -->
