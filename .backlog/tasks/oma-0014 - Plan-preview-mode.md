---
id: OMA-0014
title: Plan preview mode
status: Done
assignee: []
created_date: '2026-08-25 09:37'
updated_date: '2026-09-08 10:33'
labels: []
dependencies: []
modified_files:
  - src/index.ts
  - src/plan.ts
  - README.md
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
- [x] #1 All unit tests pass
- [x] #2 Unit test coverage stays above 80%
- [x] #3 The `knip` linter shows no errors or issues to fix
- [x] #4 README.md documentation is updated
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Step 1 complete (2026-09-08): src/plan.ts implemented with parseRunModeArgs (--goal= passthrough, --plan-only, --plan-file <path>, --replay <path>; throws on conflicting flags and missing paths), savePlanArtifact/loadPlanArtifact with JSON round-trip + validation (version===1, non-empty tasks, id/title/description per task). Types from @open-multi-agent/core. Module is pure — importable without spawning agents. src/plan.test.ts added (18 tests). npm test 41/41 green, typecheck clean, knip clean.

Step 2 complete (2026-09-08): src/index.ts now branches on parseRunModeArgs. plan-only mode: runTeam(planOnly:true) -> createPlanArtifact -> savePlanArtifact (default plan.json or --plan-file path), prints DAG summary, skips knip, renders dashboard.html in finally. replay mode: loadPlanArtifact -> runFromPlan (no coordinator), renders dashboard, then runs knip once report-only (no retry). Default mode unchanged (runTeam + 3-attempt knip feedback loop). Trace/sink setup and session ID derivation work for all modes; renderDashboard extracted as shared async helper. Also fixed a pre-existing eslint preserve-caught-error in src/plan.ts (JSON.parse catch now uses { cause: err }). All checks green: lint, npm test 41/41, typecheck, knip.

Step 4 complete (2026-09-08): README.md extended with a 'Run modes' section under 'How to use?' documenting all three modes: default team mode (runTeam + knip feedback loop, unchanged), plan-only preview (--plan-only / --plan-file <path> — coordinator only, frozen plan.json DAG, no task agents, no knip, dashboard still rendered), and replay (--replay <path> — runFromPlan without coordinator, pins graph not outputs, no synthesis step, knip report-only). Command examples follow existing npm run dev conventions. Also fixed a pre-existing broken code fence in the 'Implementing a backlog item' example (missing closing quote/backticks). All plan steps now complete.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented plan-preview mode (OMA-0014) per the approved plan.

Changes:
- src/plan.ts (new): pure module exporting parseRunModeArgs (--goal= passthrough, --plan-only, --plan-file <path>, --replay <path>; throws on conflicting flags and missing paths), savePlanArtifact/loadPlanArtifact with JSON round-trip + validation (version===1, non-empty tasks, id/title/description per task). Importable without spawning agents.
- src/index.ts: branches on parseRunModeArgs into three modes. Default = unchanged runTeam + 3-attempt knip feedback loop. plan-only = runTeam(planOnly:true) -> createPlanArtifact -> save to plan.json (or --plan-file), prints DAG summary, skips knip, renders dashboard.html. replay = loadPlanArtifact -> runFromPlan (no coordinator), renders dashboard, then knip once report-only (no retry). renderDashboard extracted as shared helper; trace/sink + session ID work for all modes.
- src/plan.test.ts (new): 18 tests covering arg parsing (defaults, each flag, missing paths, both conflict orders) and validation failures (bad version, empty/non-array tasks, missing id/title/description, malformed JSON, missing file).
- README.md: new 'Run modes' section documenting all three modes with command examples; notes replay pins the graph but not outputs and has no coordinator synthesis step. Also fixed a pre-existing broken code fence.

Verification (all gates green): npm test 41/41 pass; coverage 100% lines / 100% branches / 100% funcs (>80% DoD); npm run typecheck clean; npx knip clean; npm run lint clean.
<!-- SECTION:FINAL_SUMMARY:END -->
