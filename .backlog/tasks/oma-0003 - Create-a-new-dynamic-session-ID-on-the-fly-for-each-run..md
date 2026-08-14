---
id: OMA-0003
title: Create a new dynamic session ID on-the-fly for each run.
status: Done
assignee: []
created_date: '2026-08-13 14:34'
updated_date: '2026-08-14 09:45'
labels: []
milestone: m-0
dependencies: []
modified_files:
  - src/session.ts
  - src/session.test.ts
  - src/index.ts
  - package.json
  - README.md
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Currently `session.id` is hardcoded as `slugify-03`. Create a separate function creating session ID, including the referenced backlog ID's name.

Examples for session IDs:

`oma-0003_00483fd3fffeimpuP4sriCWYXb`
`oma-0004_00481a896ffea0LKR3BVmfj1vO`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 If backlog ID is provided in the goal,, e.g. oma-0003, then prefix the session ID with oma-0003-
- [x] #2 If there's no backlog ID provided in the goal, then don't prefix the session ID with backlog ID. Use a random ID instead.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 All unit tests pass
- [x] #2 Unit test coverage stays above 80%
- [x] #3 The `knip` linter shows no errors or issues to fix
- [x] #4 README.md documentation is updated
<!-- DOD:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented `createSessionId` and `extractBacklogId` in `src/session.ts`. The session ID is prefixed with the backlog task ID (extracted from the goal string via regex) when present, otherwise a plain 26-char alphanumeric token is returned. Integrated into `src/index.ts` by moving goal parsing before session ID creation so all downstream code (`runKnipWithTrace`, `backend`) uses the dynamic ID. Added 11 unit tests using `node:test` (no new runtime dependencies). Added `npm test` script. Updated README.md with a Session IDs section. All tests pass; knip exits clean.
<!-- SECTION:FINAL_SUMMARY:END -->
