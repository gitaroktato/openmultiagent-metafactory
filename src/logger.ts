import { OrchestratorEvent } from "@open-multi-agent/core"


function assertNever(value: never): never {
  throw new Error(`Unhandled orchestrator event type: ${JSON.stringify(value)}`)
}

const startTimes = new Map<string, number>()

export function handleProgress(event: OrchestratorEvent): void {
  const ts = new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm

  switch (event.type) {
    case 'agent_start': {
      const agent = event.agent ?? ''
      if (startTimes.has(agent)) {
        console.warn(`[${ts}] AGENT START  → ${event.agent}: overwriting stale start time (previous run never completed)`)
      }
      startTimes.set(agent, Date.now())
      console.log(`[${ts}] AGENT START  → ${event.agent}`)
      break
    }

    case 'agent_complete': {
      const agent = event.agent ?? ''
      const startedAt = startTimes.get(agent)
      startTimes.delete(agent)
      const elapsed = Date.now() - (startedAt ?? Date.now())
      console.log(`[${ts}] AGENT DONE   ← ${event.agent} (${elapsed}ms)`)
      break
    }

    case 'task_start':
      console.log(`[${ts}] TASK START   ↓ ${event.task}`)
      break

    case 'task_complete':
      console.log(`[${ts}] TASK DONE    ↑ ${event.task}`)
      break

    case 'message':
      console.log(`[${ts}] MESSAGE      • ${event.agent} → (team)`)
      break

    case 'error': {
      const agent = event.agent ?? ''
      startTimes.delete(agent)
      console.error(`[${ts}] ERROR        ✗ agent=${event.agent} task=${event.task} -- event: ${JSON.stringify(event)}`)
      if (event.data instanceof Error) {
        console.error(`               ${event.data.message}`)
      }
      break
    }

    default:
      assertNever(event as never)
  }
}

