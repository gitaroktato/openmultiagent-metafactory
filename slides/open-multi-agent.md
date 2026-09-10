---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  /* ---- Open Multi-Agent docs-inspired theme ---- */
  section {
    --oma-bg: #f5f2eb;
    --oma-surface: #fbf9f4;
    --oma-surface-2: #ece7dd;
    --oma-ink: #1c1917;
    --oma-ink-strong: #0a0908;
    --oma-muted: #6b655c;
    --oma-line: #ddd6ca;
    --oma-accent: #0f766e;      /* teal — brand accent */
    --oma-accent-soft: #14b8a6;
    --oma-amber: #b45309;       /* warm secondary */
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --font-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;

    font-family: var(--font-sans);
    font-size: 0.9em;           /* a bit smaller than the default */
    line-height: 1.5;
    color: var(--oma-ink);
    background-color: var(--oma-bg);
  }

  section h1, section h2, section h3 { color: var(--oma-ink-strong); }
  section h2 {
    border-bottom: 2px solid var(--oma-accent);
    padding-bottom: 0.35em;
  }
  section h3 { color: var(--oma-accent); }

  section a { color: var(--oma-accent); text-decoration: none; font-weight: 600; }
  section a:hover { text-decoration: underline; }

  /* monospace eyebrow feel for the "Ref:" line */
  section p:has(> a):last-child,
  section li:has(> a) { font-family: var(--font-sans); }

  /* code blocks — dark surface like the docs */
  section pre {
    background-color: #cccccc;
    color: #00;
    border-radius: 10px;
    font-family: var(--font-mono);
    box-shadow: 0 6px 18px rgba(10, 9, 8, 0.12);
  }
  section pre code { color: inherit; background: none; padding: 0; }
  section :not(pre) > code {
    font-family: var(--font-mono);
    background-color: var(--oma-surface-2);
    color: #7c2d12;
    border-radius: 5px;
  }

  /* tables */
  section table { border-collapse: collapse; width: 100%; font-size: 0.95em; }
  section th, section td { border: 1px solid var(--oma-line); padding: 0.45em 0.7em; text-align: left; }
  section thead th {
    background-color: var(--oma-surface-2);
    color: var(--oma-ink-strong);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.82em;
  }
  section tbody tr:nth-child(even) { background-color: var(--oma-surface); }

  /* lead (title) slide — dark */
  section.lead { background-color: var(--oma-ink-strong); color: #f5f2eb; }
  section.lead h1 { color: #f5f2eb; border-bottom: none; }
  section.lead p {
    color: #cbbfa8;
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
  }

  /* invert (sources) slide — dark */
  section.invert { background-color: var(--oma-ink-strong); color: #f5f2eb; }
  section.invert h1 { color: #f5f2eb; border-bottom-color: var(--oma-accent-soft); }
  section.invert a { color: #5eead4; }

  /* page number */
  section::after { color: var(--oma-muted); font-family: var(--font-mono); }
---

<!-- _class: lead -->

# Open Multi-Agent

Run modes · ACP · Budgets · Teams · Vercel AI SDK

`oma-metafactory` — September 2026

---

<!-- fit -->

## Agenda

1. Run modes — compare the tradeoffs
2. ACP features
3. Budget control
4. Team collaboration
5. Task pipeline
6. Vercel AI SDK integration

---

<!-- fit -->

## Choose a Run Mode

| | `runAgent()` | `runTeam()` | `runTasks()` |
| --- | --- | --- | --- |
| **You provide** | one agent + prompt | team + goal | tasks, assignees, `dependsOn` |
| **OMA handles** | model loop, tools, streaming | decompose → DAG, parallel, synthesize | ordering, parallel, retries |
| **Tradeoff** | lowest overhead, no collaboration | plan adapts; adds a planning call | you own & maintain the graph |

### Compare the tradeoffs

- Lowest setup & runtime overhead → `runAgent()`
- Least graph maintenance → `runTeam()`
- Most predictable topology → `runTasks()`
- One synthesized team answer → `runTeam()`
- Raw per-task outputs → `runTasks()` / `runFromPlan()`

Ref: [three-ways-to-run](https://open-multi-agent.com/getting-started/three-ways-to-run/#compare-the-tradeoffs)

---

## ACP in the Architecture

![](./assets/oma-architecture.png)

---

## ACP in the Architecture - Components

![](./assets/oma-architecture-components.png)

---

<!-- fit -->

## ACP Features

- **Agent Communication Protocol** — runs external coding agents (`Claude Code`, `OpenCode`, `Codex`) as managed subprocesses under OMA
- Lives in the **thin layer of abstraction** beside **OTEL**: the LLM drives **workflows**, which dispatch work over ACP and emit traces over OTEL
- Traces flow to observability backends — **Langfuse** and **Phoenix**
- Two entry points: **DevOps** via GitHub / GitLab (`invoke`), and **DEVs** interacting directly with the agents

Ref: [external-agents](https://open-multi-agent.com/reference/external-agents/)

---

<!-- fit -->

## Budget Control

Two run-level guardrails in `OrchestratorConfig`:

| Guardrail | Use when | Counts |
| --- | --- | --- |
| `maxTokenBudget` | a token ceiling is enough, or pricing unavailable | cumulative input + output tokens |
| `maxCostBudget` + `estimateCost` | models / providers have different prices | caller-defined cost per LLM result |

- **Circuit breaker, not a billing meter** — checked at turn & task boundaries; a run can exceed the ceiling by up to one model turn
- OMA ships **no price table** — keep pricing in your own config and fail closed on unknown models
- On exhaustion (`status.code === 'budget_exhausted'`): persist partial output, seek approval, or route to a cheaper model — don't auto-retry larger

```typescript
import { OpenMultiAgent } from '@open-multi-agent/core'

const oma = new OpenMultiAgent({
  maxTokenBudget: 100_000,
  onProgress(event) {
    if (event.type === 'budget_exceeded') {
      console.warn('OMA budget exhausted', event.data)
    }
  },
})
```

Ref: [cost-budget-control](https://open-multi-agent.com/guides/cost-budget-control/)

---

<!-- fit -->

## Team Collaboration

Three specialised agents — **architect**, **developer**, **reviewer** — collaborate on a shared goal. The `OpenMultiAgent` orchestrator breaks the goal into tasks, assigns them to the right agents, and collects the results.

- Build the team with `createTeam()` + `sharedMemory: true`
- Run with `runTeam(team, goal)` — the coordinator decomposes, schedules, and synthesizes
- Per-agent results and token usage are reported in the run result

Ref: [team-collaboration](https://open-multi-agent.com/examples/team-collaboration/)

---

<!-- fit -->

## Task Pipeline — Workflow Syntax

Explicit dependency chain: `design → implement → test + review (parallel)`

```typescript
const tasks = [
  { title: 'Design',    assignee: 'designer' },
  { title: 'Implement', assignee: 'implementer', dependsOn: ['Design'] },
  { title: 'Test',      assignee: 'tester',      dependsOn: ['Implement'] },
  { title: 'Review',    assignee: 'reviewer',    dependsOn: ['Implement'] }, // parallel with Test
]

const result = await orchestrator.runTasks(team, tasks)
```

Ref: [task-pipeline](https://open-multi-agent.com/examples/task-pipeline/)

---

<!-- fit -->

## Vercel AI SDK Integration

OMA sits **above** the AI SDK — complementary layers:

| | Vercel AI SDK | open-multi-agent |
| --- | --- | --- |
| Layer | LLM calls + streaming UI | multi-agent orchestration |
| Core strength | `useChat`, `streamText`, structured output | `runTeam()` decomposition, dependency scheduling, shared memory |

**Two-phase route:** (1) `runTeam()` runs a researcher + writer over shared memory → (2) the coordinator's output is piped into `streamText` and streamed to the browser via `useChat`.

Ref: [multi-agent-vercel-ai-sdk](https://open-multi-agent.com/blog/multi-agent-vercel-ai-sdk/)

---

## Vercel AI SDK — Web UI

![](./assets/vercel-ai-sdk-1.png)

Ref: [multi-agent-vercel-ai-sdk](https://open-multi-agent.com/blog/multi-agent-vercel-ai-sdk/)

---

<!-- _class: invert -->
<!-- fit -->

# Sources

- [Choose a Run Mode — tradeoffs](https://open-multi-agent.com/getting-started/three-ways-to-run/#compare-the-tradeoffs)
- [External agents over ACP](https://open-multi-agent.com/reference/external-agents/)
- [Control costs & budgets](https://open-multi-agent.com/guides/cost-budget-control/)
- [Team collaboration example](https://open-multi-agent.com/examples/team-collaboration/)
- [Task pipeline example](https://open-multi-agent.com/examples/task-pipeline/)
- [Vercel AI SDK integration](https://open-multi-agent.com/blog/multi-agent-vercel-ai-sdk/)
