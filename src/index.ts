import { argv } from 'process';
import { spawnSync } from 'node:child_process';
import { BatchingTraceSink, CoordinatorConfig, InMemoryTraceStore, OpenMultiAgent, OrchestratorConfig, renderRunViewer, RunTeamOptions, StoredRun, TraceStoreExporter } from '@open-multi-agent/core'
import { writeFileSync } from 'node:fs'
import { handleProgress } from './logger'
import { createAcpBackend } from '@open-multi-agent/core/acp'
import { register, traceChain } from '@arizeai/phoenix-otel';
import { AcpBackendAdapter } from './adapter'
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PHOENIX_URL } from './constants'
import { createSessionId, extractBacklogId } from './session'
import { createAcpBackendConfig, createTeamConfig, TEAM_NAME } from './team'

// Phoenix OTEL configuration
register({ projectName: "default", url: PHOENIX_URL });

function getGoalFromArgs() {
  const goalArg = argv.find(arg => arg.startsWith('--goal='));
  const goal = goalArg?.slice('--goal='.length) || undefined;
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
const config: OrchestratorConfig = {
  defaultModel: DEFAULT_MODEL,
  defaultProvider: DEFAULT_PROVIDER,
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
const coordinatorConfig: CoordinatorConfig = {
  adapter: new AcpBackendAdapter(acpBackendInstance)
}

// Configuring team
const runTeamOptions: RunTeamOptions = { revealCoordinator: true, mode: 'team', coordinator: coordinatorConfig }

console.log(`Executing goal - ${goal}`)
let result = await oma.runTeam(team, goal, runTeamOptions)
console.log(`\nRouting decision - ${JSON.stringify(result.routingDecision, null, 2)}`)

try {
  // Knip feedback loop: up to KNIP_MAX_RETRIES knip runs; re-run the team only
  // when issues remain and a retry budget is still available.
  for (let attempt = 1; attempt <= KNIP_MAX_RETRIES; attempt++) {
    console.log(`\nRunning knip (attempt ${attempt}/${KNIP_MAX_RETRIES})...`);
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
    if (attempt === KNIP_MAX_RETRIES) {
      console.log(`knip: issues remain after ${KNIP_MAX_RETRIES} retries, giving up.`);
      break;
    }
    const followUpGoal = `knip reported the following issues that must be fixed:\n\n${knip.output}\n\nPlease fix all reported issues.`;
    console.log(`knip: issues found, feeding back to team (retry ${attempt}/${KNIP_MAX_RETRIES})...`);
    result = await oma.runTeam(team, followUpGoal, runTeamOptions);
    console.log(`\nRouting decision - ${JSON.stringify(result.routingDecision, null, 2)}`);
  }
} finally {
  // Flushing traces — runs even if the knip loop throws
  await sink.forceFlush({ timeoutMs: 5_000 }) // exporter → FileTraceStore
  const runId = result.identity?.runId;
  let run: StoredRun | undefined;
  if (runId) {
    run = (await store.getRun(runId, { includeRecords: true })) ?? undefined;
  } else {
    console.warn('knip loop finished without a run ID; dashboard will have no stored run records.');
  }

  writeFileSync('dashboard.html', renderRunViewer({ result, run }))
  console.log(`\nDAG dashboard → dashboard.html`)
}
