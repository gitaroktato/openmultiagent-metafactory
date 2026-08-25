# Multi-agent DAG demo

This teaching starter turns one onboarding goal into a coordinator-generated task DAG.

## No-key demo

```bash
npm install
npm run demo
```

The demo uses deterministic scripted model responses, makes no model request, and labels its terminal output and dashboard as simulated. OMA still runs the coordinator path, task DAG, scheduler, aggregation, and dashboard locally for real.

## Real model run

For a Cloud scaffold, copy `.env.example` to `.env`, add the provider key, then run `npm run dev`.

For an Ollama scaffold, start Ollama first and run `npm run dev`. The starter selects `OMA_MODEL` when set, otherwise the first installed model. No source files are read and agents receive no tools.

## Testing and checks

```bash
npm test            # run unit tests (node --test via tsx)
npm run typecheck   # tsc --noEmit
npx knip            # detect unused files, dependencies, and exports
```

All three must pass before a change is considered done.

## Team agents

The `hybrid-dev` team is composed of three OpenCode-backed agents: **planner**, **coder**, and **typescript-reviewer**.

- The **typescript-reviewer** is a TypeScript-specialized, read-only review agent. It never edits files and only produces review recommendations. Its system prompt instructs it to load the predefined `typescript-pro` skill (`.agents/skills/typescript-pro/SKILL.md`, auto-discovered by opencode ACP subprocesses — no config change needed) and apply its constraints when reviewing TypeScript code: strict mode, no explicit `any`, type guards, discriminated unions, branded types.
- The coordinator routes only TypeScript-related goals/tasks to the **typescript-reviewer**. Non-TS goals receive no review step (there is no generic reviewer fallback).

## Technology Stack

- <https://github.com/MrLesk/Backlog.md>
- <https://www.skills.sh>
- <https://arize.com/docs/phoenix/>
- <https://knip.dev>

## How to use?

### Opening the backlog

```bash
backlog browser
```

### Implementing a backlog item

```bash
npm run dev -- --goal='Implement oma-0002
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

