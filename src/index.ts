import { argv } from 'process';
import { spawnSync } from 'node:child_process';
import { BatchingTraceSink, CoordinatorConfig, InMemoryTraceStore, LLMAdapter, LLMChatOptions, LLMMessage, LLMResponse, LLMStreamOptions, OpenMultiAgent, OrchestratorConfig, renderRunViewer, RunResult, RunTeamOptions, StoredRun, StreamEvent, TraceStoreExporter } from '@open-multi-agent/core'
import { ExternalAgentBackendConfig } from '@open-multi-agent/core'
import { writeFileSync } from 'node:fs'
import { handleProgress } from './logger'
import { createAcpBackend } from '@open-multi-agent/core/acp'
import { register, traceChain } from '@arizeai/phoenix-otel';

// Phoenix OTEL configuration
register({ projectName: "default", url: "http://localhost:6006" });
const CURRENT_SESSION_ID = "factory-01"

const KNIP_MAX_RETRIES = 3;

function runKnip(): { clean: boolean; output: string } {
  const result = spawnSync('npx', ['knip'], { encoding: 'utf-8', shell: true });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  const clean = result.status === 0;
  return { clean, output };
}

// Set up tracing for Knip
const runKnipWithTrace = traceChain(runKnip, { attributes: { "session.id": CURRENT_SESSION_ID } })

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
    "OPENCODE_SPAN_ATTRIBUTES": `session.id=${CURRENT_SESSION_ID},user.id=gitaroktato`
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
let result = await oma.runTeam(team, goal, runTeamOptions)
console.log(`\nRouting decision - ${JSON.stringify(result.routingDecision, null, 2)}`)

try {
  // Knip feedback loop: re-run team until knip is clean or retry limit reached
  let knipRetries = 0;
  while (knipRetries < KNIP_MAX_RETRIES) {
    console.log(`\nRunning knip (attempt ${knipRetries + 1}/${KNIP_MAX_RETRIES})...`);
    let knip: { clean: boolean; output: string };
    try {
      knip = runKnipWithTrace();
    } catch (err) {
      console.error('knip: failed to run (binary missing or fatal error):', err);
      break;
    }
    if (knip.clean) {
      console.log('knip: no issues found, continuing.');
      break;
    }
    knipRetries++;
    if (knipRetries >= KNIP_MAX_RETRIES) {
      console.log(`knip: issues remain after ${KNIP_MAX_RETRIES} retries, giving up.`);
      break;
    }
    const followUpGoal = `knip reported the following issues that must be fixed:\n\n${knip.output}\n\nPlease fix all reported issues.`;
    console.log(`knip: issues found, feeding back to team (retry ${knipRetries}/${KNIP_MAX_RETRIES})...`);
    result = await oma.runTeam(team, followUpGoal, runTeamOptions);
    console.log(`\nRouting decision - ${JSON.stringify(result.routingDecision, null, 2)}`);
  }
} finally {
  // Flushing traces — runs even if the knip loop throws
  await sink.forceFlush({ timeoutMs: 5_000 }) // exporter → FileTraceStore
  const run: StoredRun | undefined = (await store.getRun(result.identity!.runId, { includeRecords: true })) ?? undefined

  writeFileSync('dashboard.html', renderRunViewer({ result, run }))
  console.log(`\nDAG dashboard → dashboard.html`)
}

