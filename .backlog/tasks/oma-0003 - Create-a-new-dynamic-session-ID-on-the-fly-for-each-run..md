---
id: OMA-0003
title: Create a new dynamic session ID on-the-fly for each run.
status: To Do
assignee: []
created_date: '2026-08-13 14:34'
updated_date: '2026-08-14 09:22'
labels: []
milestone: m-0
dependencies: []
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
- [ ] #1 If backlog ID is provided in the goal,, e.g. oma-0003, then prefix the session ID with oma-0003-
- [ ] #2 If there's no backlog ID provided in the goal, then don't prefix the session ID with backlog ID. Use a random ID instead.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 All unit tests pass
- [ ] #2 Unit test coverage stays above 80%
- [ ] #3 The `knip` linter shows no errors or issues to fix
- [ ] #4 README.md documentation is updated
<!-- DOD:END -->
