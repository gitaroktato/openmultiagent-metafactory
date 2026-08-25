import { argv } from 'process';
import { spawnSync } from 'node:child_process';
import { BatchingTraceSink, CoordinatorConfig, InMemoryTraceStore, LLMAdapter, LLMChatOptions, LLMMessage, LLMResponse, LLMStreamOptions, OpenMultiAgent, OrchestratorConfig, renderRunViewer, RunResult, RunTeamOptions, StoredRun, StreamEvent, TraceStoreExporter } from '@open-multi-agent/core'
import { writeFileSync } from 'node:fs'
import { handleProgress } from './logger'
import { createAcpBackend } from '@open-multi-agent/core/acp'
import { register, traceChain } from '@arizeai/phoenix-otel';
import { createSessionId, extractBacklogId } from './session'
import { createAcpBackendConfig, createTeamConfig, TEAM_NAME } from './team'

// Phoenix OTEL configuration
register({ projectName: "default", url: "http://localhost:6006" });

function getGoalFromArgs() {
  const goalArg = argv.find(arg => arg.startsWith('--goal='));
  const goal = goalArg ? goalArg.split('=')[1] : undefined;
  if (!goal) { throw new Error("Goal parameter is required. Please provide one using --goal=<your goal>."); }
  return goal;
}

// Parse goal and derive session ID before anything else uses them
const goal = getGoalFromArgs();
const CURRENT_SESSION_ID = createSessionId(extractBacklogId(goal));

const KNIP_MAX_RETRIES = 3;

function runKnip(): { clean: boolean; output: string } {
  const result = spawnSync('npx', ['knip'], { encoding: 'utf-8', shell: true });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  const clean = result.status === 0;
  return { clean, output };
}

// Set up tracing for Knip
const runKnipWithTrace = traceChain(runKnip, { attributes: { "session.id": CURRENT_SESSION_ID } })

// Required to have trace on dashboards
const store = new InMemoryTraceStore()
const sink = new BatchingTraceSink(new TraceStoreExporter(store))
// FIXME: Create a separate constant for consistency!
const config: OrchestratorConfig = {
  defaultModel: 'Qwen3.8-27B-GGUF#medium',
  defaultProvider: 'unsloth-studio',
  onProgress: handleProgress,
  observability: { sinks: [sink] },
  // Use deterministic strategy if no model available as router
  // executionRouting: { strategy: 'deterministic' },
}

const oma = new OpenMultiAgent(config)
const backend = createAcpBackendConfig(CURRENT_SESSION_ID)
const team = oma.createTeam(TEAM_NAME, createTeamConfig(backend))

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
