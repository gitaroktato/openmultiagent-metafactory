---
id: OMA-0015
title: 'Refactor orchestrator entrypoint for reliability, testability, and type safety'
status: In Progress
assignee:
  - opencode
created_date: '2026-08-28 13:52'
updated_date: '2026-08-28 14:02'
labels:
  - refactor
  - type-safety
dependencies: []
documentation:
  - .agents/skills/typescript-pro/SKILL.md
priority: medium
type: task
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The project currently passes tsc --noEmit, npm test, and knip, so this is improvement work with no intended behavior change. The entrypoint (src/index.ts) runs the hybrid-dev team, then a Knip feedback loop (up to 3 retries), flushes traces, and renders dashboard.html. Known gaps to fix:

1. Reliability: the initial oma.runTeam() call in src/index.ts executes outside the try/finally that wraps only the knip loop, so if the first run throws, traces are never flushed and no dashboard is written. The entrypoint must guarantee trace flush + dashboard rendering on every failure path.
2. Dead flag: package.json defines "demo": "tsx src/index.ts --demo", but argument parsing in src/index.ts only understands --goal=; the --demo flag is silently ignored. Implement it or remove the script so no dead scripts remain.
3. Untestable core loop: the knip feedback loop (retry budget, follow-up goal construction) is inline top-level code in src/index.ts and cannot be unit tested without spawning npx knip. Extract its logic into a pure exported function with injectable dependencies.
4. Untestable logger: src/logger.ts keeps mutable module-level state (startTimes Map) and writes straight to console; agent start/complete elapsed-time and stale-start warning behavior have zero test coverage. Encapsulate it in a testable unit with injectable clock/output.
5. Type design (apply typescript-pro constraints): model the knip result as a discriminated union instead of a { clean: boolean; output: string } flag; introduce a branded SessionId type so session IDs are not interchangeable with arbitrary strings; hoist magic strings ('dummy-model' in src/adapter.ts, 'opencode' command in src/team.ts, '--goal=' prefix) into named constants; use import type for type-only imports (e.g. OrchestratorEvent in src/logger.ts).

Constraints: no behavior change to the happy path; existing tests in src/session.test.ts and src/team.test.ts must keep passing unmodified where possible; node_modules is off-limits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing initial team run still flushes traces and renders dashboard.html (covered by a test of the extracted entrypoint flow)
- [ ] #2 The --demo flag is either implemented in argument parsing or removed from package.json; no dead scripts remain
- [ ] #3 The knip feedback loop logic lives in an exported pure function unit-tested with fake runTeam/runKnip dependencies (no subprocess spawned in tests)
- [ ] #4 Progress logging state is encapsulated in a testable unit; new tests cover agent start/complete elapsed time and the stale-start warning
- [ ] #5 The knip result is modeled as a discriminated union rather than a boolean flag
- [ ] #6 Session IDs use a branded type from creation in src/session.ts through consumption in the entrypoint and team config
- [ ] #7 Magic strings ('dummy-model', 'opencode' command, '--goal=' prefix) are named constants
- [ ] #8 npm test passes including all new tests; npm run typecheck and npx knip remain clean
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
## Plan

1. `src/goal.ts` (new): `parseGoal(args: readonly string[]): string` — extract `--goal=` parsing/validation from index.ts so it is unit-testable.
2. `src/knip.ts` (new):
   - `KnipResult` discriminated union: `{status:'clean',output} | {status:'issues',output} | {status:'failed',error}`
   - Type guards + `buildKnipFollowUpGoal(output)` + `KNIP_MAX_RETRIES = 3`
   - `runKnip(): KnipResult` — spawnSync wrapper; fatal spawn errors → `failed`
   - `runKnipFeedbackLoop(initial, deps: {runKnip, rerunTeam, maxRetries?, log?, logError?}): Promise<TeamRunResult>` — pure loop, exhaustive switch over KnipResult
3. `src/logger.ts`: refactor to `createProgressHandler(options?: {now?, logger?})` factory; state in closure (no module-level Map); handle all 13 OrchestratorEvent variants explicitly; keep assertNever default for future additions.
4. `src/index.ts`: single try/finally around initial runTeam + knip loop; set `process.exitCode = 1` on failure; dashboard always rendered (`RunViewerInput.result` is optional — confirmed); traceChain applied to runKnip at composition site (pure knip module stays OTEL-free).
5. `package.json`: remove dead `"demo"` script.
6. New tests: `src/goal.test.ts`, `src/knip.test.ts`, `src/logger.test.ts`.
7. Verify: `npm test`, `npm run typecheck`, `npx knip` — all must pass.

## Confirmed API facts
- `RunViewerInput.result?: TeamRunResult` (optional) → dashboard renderable on failure paths.
- `traceChain<Fn extends AnyFn>(fn, options?): Fn` — signature-preserving wrapper.
- `TokenUsage = { input_tokens: number; output_tokens: number }`.
- `OrchestratorEvent` is one interface with 13 `type` values + optional agent/task/data.
<!-- SECTION:PLAN:END -->
