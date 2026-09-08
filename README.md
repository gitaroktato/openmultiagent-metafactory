# Open Multi-Agent metafactory

A coding agent orchestrator that's building itself based on Open Multi-Agent, ACP, OpenTelemetry, Phoenix and many more.

## Testing and checks

```bash
npm test            # run unit tests (node --test via tsx)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint . (flat config in eslint.config.js)
npx knip            # detect unused files, dependencies, and exports
```

All four must pass before a change is considered done.

### TypeScript 7 + typescript-eslint side-by-side

`typescript-eslint` does not support the TS 7 native compiler (no JS API yet), so the project runs both compilers side by side via npm aliases:

- `typescript` → `npm:@typescript/typescript6` (TS 6 API, used by `typescript-eslint`)
- `@typescript/native` → `npm:typescript@^7` (native TS 7, provides the `tsc` binary used by `npm run typecheck`)

## Team agents

The `hybrid-dev` team is composed of three OpenCode-backed agents: **planner**, **coder**, and **typescript-reviewer**.

- The **typescript-reviewer** is a TypeScript-specialized, read-only review agent. It never edits files and only produces review recommendations. Its system prompt instructs it to load the predefined `typescript-pro` skill (`.agents/skills/typescript-pro/SKILL.md`, auto-discovered by opencode ACP subprocesses — no config change needed) and apply its constraints when reviewing TypeScript code: strict mode, no explicit `any`, type guards, discriminated unions, branded types.
- The coordinator routes only TypeScript-related goals/tasks to the **typescript-reviewer**. Non-TS goals receive no review step (there is no generic reviewer fallback).

## Technology Stack

- <https://github.com/MrLesk/Backlog.md>
- <https://www.skills.sh>
- <https://arize.com/docs/phoenix/>
- <https://knip.dev>
- <https://eslint.org>

## How to use?

### Opening the backlog

```bash
backlog browser
```

### Implementing a backlog item

```bash
npm run dev -- --goal='Implement oma-0002'
```

### Run modes

The entrypoint supports three run modes, selected via CLI flags (see `src/plan.ts`):

#### Default team mode

No mode flags. The coordinator decomposes the goal into a task DAG, the team executes it, and a knip feedback loop re-runs the team up to three times until knip is clean. A `dashboard.html` is rendered for every run.

```bash
npm run dev -- --goal='Implement oma-0002'
```

#### Plan-only preview (`--plan-only`)

Runs the coordinator only: it decomposes the goal into a task DAG but **no task agents execute and knip is skipped**. The result is frozen as a serializable plan artifact (JSON with `version`, `goal`, and `tasks` including ids, titles, descriptions, and dependencies) written to `plan.json` by default, or to a custom path via `--plan-file <path>`. A DAG summary is printed and `dashboard.html` is still rendered from the preview result.

```bash
npm run dev -- --goal='Implement oma-0014' --plan-only
npm run dev -- --goal='Implement oma-0014' --plan-only --plan-file preview.json
```

#### Replay (`--replay <path>`)

Loads a previously saved plan artifact and executes it via `runFromPlan` **without invoking the coordinator**. The replay pins the task graph (ids, dependencies, assignees, titles, descriptions) exactly as stored, but not the outputs — agents still run and may produce different results. There is no coordinator synthesis step. After execution, knip runs once in **report-only** mode: issues are printed but there is no retry loop. `dashboard.html` is rendered for the replayed run.

```bash
npm run dev -- --goal='Implement oma-0014' --replay plan.json
```

## Session IDs

Each run generates a unique session ID that is used for tracing and observability.

- When the `--goal` argument references a backlog task ID (e.g. `oma-0003`), the session ID is prefixed with that ID:

  ```
  oma-0003_00483fd3fffeimpuP4sriCWYXb
  ```

- When no backlog ID is found in the goal, a plain random token is used:

  ```
  00483fd3fffeimpuP4sriCWYXb
  ```

The session ID is attached to all OpenTelemetry spans as `session.id` and propagated to child agents via `OPENCODE_SPAN_ATTRIBUTES`.
