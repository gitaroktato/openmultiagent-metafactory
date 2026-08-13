---
id: OMA-0002
title: Execute `knip` goal after agent execution is finished.
status: To Do
assignee: []
created_date: '2026-08-13 13:58'
updated_date: '2026-08-13 13:59'
labels: []
dependencies: []
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
- [ ] #1 If the `knip` execution returns any items to fix, feed back the execution results to the team to resolve.
- [ ] #2 If the `knip` execution returns no items to fix, continue with post-execution steps.
<!-- AC:END -->
