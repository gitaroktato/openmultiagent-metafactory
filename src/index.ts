import { argv } from 'process';
import { BatchingTraceSink, CoordinatorConfig, InMemoryTraceStore, LLMAdapter, LLMChatOptions, LLMMessage, LLMResponse, LLMStreamOptions, ModelRoutingPolicy, OpenMultiAgent, OrchestratorConfig, OrchestratorEvent, renderRunViewer, RunResult, RunTeamOptions, StoredRun, StreamEvent, TraceStoreExporter } from '@open-multi-agent/core'
import { ExternalAgentBackendConfig } from '@open-multi-agent/core'
import { writeFileSync } from 'node:fs'
import { handleProgress } from './logger'
import { createAcpBackend } from '@open-multi-agent/core/acp'

function getGoalFromArgs() {
  const goalArg = argv.find(arg => arg.startsWith('--goal='));
  const goal = goalArg ? goalArg.split('=')[1] : undefined;
  if (!goal) { throw new Error("Goal parameter is required. Please provide one using --goal=<your goal>."); }
  return goal;
}

// Required to have trace on dashboards
const store = new InMemoryTraceStore()
const sink = new BatchingTraceSink(new TraceStoreExporter(store))
const config: OrchestratorConfig = {
  defaultModel: 'claude-sonnet-4.6',
  defaultProvider: 'copilot',
  onProgress: handleProgress,
  observability: { sinks: [sink] },
  // Use deterministic strategy if no model available as router
  // executionRouting: { strategy: 'deterministic' },
}

const oma = new OpenMultiAgent(config)

const backend: ExternalAgentBackendConfig = {
  kind: 'acp',
  command: 'opencode',
  env: {
    "OPENCODE_MODEL": "github-copilot/claude-sonnet-4.6",
    "OPENCODE_ENABLE_TELEMETRY": "1",
    "OPENCODE_OTLP_ENDPOINT": "http://localhost:4317",
    "OPENCODE_OTLP_PROTOCOL": "grpc",
    "OPENCODE_OTLP_HEADERS": "x-project-name=default",
    // Example of controlling sessionID and userID for ACP delegated calls
    "OPENCODE_SPAN_ATTRIBUTES": "session.id=slugify-02,user.id=gitaroktato"
  },
  args: ['acp', '--print-logs'],
  permission: 'auto-approve'
}

const team = oma.createTeam('hybrid-dev', {
  name: 'hybrid-dev',
  agents: [
    { name: 'planner', systemPrompt: 'Break the task into a short plan. Do not write code.', backend: backend },
    {
      name: 'coder',
      systemPrompt: 'Writes and edits code by running an external coding CLI.',
      backend: backend,
    },
    { name: 'reviewer', systemPrompt: 'Review the change and summarize risks. Do not edit files.', backend: backend },
  ],
  sharedMemory: true,
})

// Create custom LLMAdapter as a coordinator
const acpBackendInstance = createAcpBackend({ command: backend.command, args: backend.args, env: backend.env })
class AcpBackendAdapter implements LLMAdapter {
  name = 'AcpBackendAdapter';

  chat(messages: LLMMessage[], options: LLMChatOptions): Promise<LLMResponse> {
    return acpBackendInstance.run(messages, options).then((runResult: RunResult) => {

      // Conversion logic: Translate RunResult to LLMResponse
      let result: LLMResponse = {
        id: runResult.identity?.runId ?? '',
        content: runResult.messages.flatMap(record => record.content),
        usage: runResult.tokenUsage,
        model: 'dummy-model',
        stop_reason: runResult.aborted ? 'aborted' : 'completed'
      };
      return result;
    });
  }

  stream(messages: LLMMessage[], options: LLMStreamOptions): AsyncIterable<StreamEvent> {
    return acpBackendInstance.stream(messages, options)
  }
}
const coordinatorConfig: CoordinatorConfig = {
  adapter: new AcpBackendAdapter()
}

// Configuring team
const runTeamOptions: RunTeamOptions = { revealCoordinator: true, mode: 'team', coordinator: coordinatorConfig }

// Parse goal from command line argument
const goal = getGoalFromArgs();
console.log(`Executing goal - ${goal}`)
const result = await oma.runTeam(team, goal, runTeamOptions)
console.log(`\nRouting decision - ${JSON.stringify(result.routingDecision, null, 2)}`)

// Flushing traces
await sink.forceFlush({ timeoutMs: 5_000 }) // exporter → FileTraceStore
const run: StoredRun | undefined = (await store.getRun(result.identity!.runId, { includeRecords: true })) ?? undefined

writeFileSync('dashboard.html', renderRunViewer({ result, run }))
console.log(`\nDAG dashboard → dashboard.html`)

