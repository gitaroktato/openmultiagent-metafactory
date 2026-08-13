---
id: OMA-0002
title: Execute `knip` goal after agent execution is finished.
status: Done
assignee: []
created_date: '2026-08-13 13:58'
updated_date: '2026-08-13 14:21'
labels: []
dependencies: []
modified_files:
  - src/index.ts
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Goal**
Execute `knip` npm goal after agent execution is finished in `index.ts`.  The output should be fed back to the agent execution unless there are no errors.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 If the `knip` execution returns any items to fix, feed back the execution results to the team to resolve.
- [x] #2 If the `knip` execution returns no items to fix, continue with post-execution steps.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added `runKnip()` helper using `spawnSync` from `node:child_process` and a `KNIP_MAX_RETRIES = 3` constant. After the initial `oma.runTeam` call, a `while` loop runs knip up to `KNIP_MAX_RETRIES` times. If knip exits cleanly (status 0) the loop breaks and execution falls through to the existing trace-flush and dashboard-write steps. If knip reports issues, the combined stdout+stderr is embedded in a follow-up goal message and `oma.runTeam` is called again with the same team. After exhausting retries the loop also exits, logging a warning. `result` was changed from `const` to `let` to allow reassignment inside the loop.
<!-- SECTION:FINAL_SUMMARY:END -->
