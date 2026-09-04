# Open Multi-Agent metafactory

A coding agent orchestrator that's building itself based on Open Multi-Agent, ACP, OpenTelemetry, Phoenix and many more.

<!-- BACKLOG.MD MCP GUIDELINES START -->
<!-- backlog.md-instructions-version: 1.50.1 -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_backlog_instructions()` to load the tool-oriented overview. Use the `instruction` selector when you need `task-creation`, `task-execution`, or `task-finalization`.

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:

- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and finalization
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->

## Project Description

A multi-agent orchestration demo built on `@open-multi-agent/core` (OMA). Given a `--goal` argument, a coordinator decomposes the goal into a task DAG and dispatches it to a hybrid team of three OpenCode-backed agents: **planner**, **coder**, and **reviewer**. Each agent runs as an ACP (Agent Communication Protocol) subprocess. After the team finishes, a Knip feedback loop checks for unused exports/imports and re-runs the team up to three times to fix any issues. All traces are captured via Arize Phoenix (OpenTelemetry) and a local HTML dashboard (`dashboard.html`) is rendered for every run. Session IDs are derived from Backlog.md task IDs embedded in the goal string.

## Testing and checks

```bash
npm test            # run unit tests (node --test via tsx)
npm run typecheck   # tsc --noEmit
npx knip            # detect unused files, dependencies, and exports
```

All three must pass before a change is considered done.

## Folder forbidden for editing

Never apply changes on the `node_modules` folder.

## Searching and navigation rules

Use `rg` instead of `grep` for searching faster between files.

## Project Documentation

`README.md` should contain all changes related to

- Project structure and files
- Component diagram using Mermaid diagrams
- How to build and run the project
- How to execute tests
- URL samples for the Docker and API endpoints

After implementation, always check if the `README.md` is up-to-date and extend it with necessary information related to the list above.
