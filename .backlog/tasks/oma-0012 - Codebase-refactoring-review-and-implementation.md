---
id: OMA-0012
title: Codebase refactoring review and implementation
status: Done
assignee: []
created_date: '2026-08-25 08:30'
updated_date: '2026-08-25 08:46'
labels: []
dependencies: []
type: chore
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Identify items worth refactoring in the codebase, review the recommendations, and implement the approved refactoring changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Codebase analyzed for refactoring opportunities
- [x] #2 Recommendations reviewed by typescript-reviewer
- [x] #3 Approved refactoring implemented by coder
- [x] #4 All existing tests pass after changes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 All unit tests pass
- [ ] #2 Unit test coverage stays above 80%
- [x] #3 The `knip` linter shows no errors or issues to fix
- [x] #4 README.md documentation is updated
<!-- DOD:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: typescript-reviewer
created: 2026-08-25 08:41
---
## typescript-pro review (read-only)

Verification: `npm test` PASS (19/19), `npx tsc --noEmit` PASS (exit 0), `npx knip` PASS (exit 0). No explicit `any`, no enums, strict mode enabled.

### Findings & recommendations

**HIGH — src/logger.ts:9 switch on `event.type` is non-exhaustive.**
`OrchestratorEvent.type` has 13 variants; only 6 are handled. The library docs explicitly warn that consumers with exhaustive switches must handle the additive variants (`task_skipped`, `warning`, ...). Fix: add a `default:` branch with an `assertNever(event)` helper (type predicate `event is never`) so future variants become compile errors, or at minimum log unhandled event types. This is the core discriminated-union pattern from the skill.

**HIGH — src/index.ts:118 non-null assertion `result.identity!.runId`.**
Violates 'no `as`/assertions without necessity'. Fix: guard with `if (!result.identity) { ... }` before use (e.g. skip dashboard render or throw a descriptive error).

**MEDIUM — src/index.ts:16 fragile arg parsing.**
`goalArg.split('=')[1]` is unsafe under `noUncheckedIndexedAccess` and drops everything after the second `=`. Fix: `const goal = goalArg.slice('--goal='.length); if (!goal) throw ...`.

**MEDIUM — src/index.ts:42-43 duplicated model constants (existing FIXME).**
`defaultModel`/`defaultProvider` in index.ts and `OPENCODE_MODEL` in team.ts repeat the same value. Extract a shared constant module so they cannot drift.

**MEDIUM — src/session.ts:14 biased token generation.**
`ALPHABET[b % ALPHABET.length]` with 62-char alphabet biases output (64 % 62 = 2). Use rejection sampling or `crypto.randomInt(0, ALPHABET.length)` per char.

**LOW — tsconfig.json missing strict flags.**
Add `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedParameters`, `noFallthroughCasesInSwitch` (the switch in logger.ts would then require the exhaustive default). Note: enabling these will surface the findings above as errors, so apply code fixes first.

**LOW — src/team.ts:16 hardcoded `user.id=gitaroktato`.**
Derive from env (e.g. `process.env.USER`) or make it a parameter.

**LOW — DoD #2 'coverage > 80%' is unmeasurable.**
No coverage tooling (c8/v8) is configured; the test script runs bare `node --test`. Either add `NODE_V8_COVERAGE`/c8 to the test script or adjust the DoD item. README.md has no mention of tests/coverage either (DoD #4).

### Verdict
Checks pass, so OMA-0012 can be marked done after coder applies at least the HIGH items (exhaustive switch + remove `!` assertion) and re-runs npm test / tsc / knip. MEDIUM/LOW items are optional follow-ups.
---

author: coordinator
created: 2026-08-25 08:46
---
## Follow-up fixes applied (all reviewer findings except coverage tooling)

- HIGH: src/logger.ts switch on event.type is now exhaustive via assertNever default branch (library emits additive variants like task_skipped/warning; unhandled types now throw instead of silently dropping).
- HIGH: result.identity! non-null assertion in src/index.ts already replaced with an explicit runId guard (dashboard renders with run: undefined + warning when missing).
- MED: --goal parsing hardened to slice('--goal='.length) so goals containing '=' survive.
- MED: model/provider/URL constants deduplicated into src/constants.ts (previously done; FIXME resolved).
- MED: session token generation switched from biased b % 62 mapping to crypto.randomInt(0, ALPHABET.length).
- LOW: tsconfig now also enables noUncheckedIndexedAccess and noImplicitOverride; all resulting errors fixed (session.ts match guard, team.test.ts reviewAgents[0] guard).
- LOW: hardcoded user.id=gitaroktato in src/team.ts replaced with process.env.USER fallback 'unknown'.
- README.md gained a Testing and checks section (npm test / npm run typecheck / npx knip).

Verification: npm test 19/19 pass, tsc --noEmit exit 0, knip exit 0.

Remaining DoD gap: 'coverage > 80%' is unmeasurable — no c8/v8 coverage tooling is configured. Flagging for a follow-up task rather than blocking this one.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactoring review + implementation complete. New modules: src/constants.ts (deduplicated model/provider/URL constants, resolves the FIXME) and src/adapter.ts (AcpBackendAdapter extracted from index.ts with constructor-injected backend). index.ts knip retry loop restructured to an explicit for-loop; result.identity! non-null assertion replaced with a runId guard. logger.ts startTimes leak fixed (entries cleared on error/complete, stale-start warning) and the event switch made exhaustive via assertNever. session.ts token generation de-biased to crypto.randomInt. team.ts user.id now from process.env.USER. tsconfig tightened (noUnusedParameters, noFallthroughCasesInSwitch, noImplicitReturns, forceConsistentCasingInFileNames, noUncheckedIndexedAccess, noImplicitOverride); new npm run typecheck script; README documents test/typecheck/knip commands. Verified: npm test 19/19 pass, tsc --noEmit clean, knip clean. Open gap: DoD 'coverage > 80%' unmeasurable without c8/v8 tooling — needs a follow-up task.
<!-- SECTION:FINAL_SUMMARY:END -->
