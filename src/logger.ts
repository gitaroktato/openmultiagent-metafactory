import { OrchestratorEvent } from "@open-multi-agent/core"


const startTimes = new Map<string, number>()

export function handleProgress(event: OrchestratorEvent): void {
  const ts = new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm

  switch (event.type) {
    case 'agent_start':
      startTimes.set(event.agent ?? '', Date.now())
      console.log(`[${ts}] AGENT START  → ${event.agent}`)
      break

    case 'agent_complete': {
      const elapsed = Date.now() - (startTimes.get(event.agent ?? '') ?? Date.now())
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

    case 'error':
      console.error(`[${ts}] ERROR        ✗ agent=${event.agent} task=${event.task} -- event: ${JSON.stringify(event)}`)
      if (event.data instanceof Error) {
        console.error(`               ${event.data.message}`)
      }
      break
  }
}

