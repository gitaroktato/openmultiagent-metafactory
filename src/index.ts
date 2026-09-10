import { argv } from 'process';
import { spawnSync } from 'node:child_process';
import { BatchingTraceSink, CoordinatorConfig, InMemoryTraceStore, OpenMultiAgent, OrchestratorConfig, renderRunViewer, RunTeamOptions, StoredRun, TeamRunResult, TraceStoreExporter } from '@open-multi-agent/core'
import { writeFileSync } from 'node:fs'
import { handleProgress } from './logger'
import { createAcpBackend } from '@open-multi-agent/core/acp'
import { register, traceChain } from '@arizeai/phoenix-otel';
import { AcpBackendAdapter } from './adapter'
import { DEFAULT_MODEL, DEFAULT_PROVIDER, OPENCODE_MODEL_ID_LOW, OPENCODE_MODEL_ID_MEDIUM, OPENCODE_MODEL_ID_XHIGH, PHOENIX_URL } from './constants'
import { createSessionId, extractBacklogId } from './session'
import { createAcpBackendConfig, createTeamConfig, TEAM_NAME } from './team'
import { loadPlanArtifact, parseRunModeArgs, savePlanArtifact } from './plan'

// Phoenix OTEL configuration
register({ projectName: "default", url: PHOENIX_URL });

const runMode = parseRunModeArgs(argv);

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
const backend = createAcpBackendConfig(CURRENT_SESSION_ID, OPENCODE_MODEL_ID_LOW)
console.log(`\nUsing backend for team: ${JSON.stringify(backend, null, 2)}`)
const team = oma.createTeam(TEAM_NAME, createTeamConfig(backend))

const coordinator_backend = createAcpBackendConfig(CURRENT_SESSION_ID, OPENCODE_MODEL_ID_XHIGH)
console.log(`\nUsing backend for coordinator: ${JSON.stringify(coordinator_backend, null, 2)}`)
// Create custom LLMAdapter as a coordinator
const acpBackendInstance = createAcpBackend({ command: coordinator_backend.command, args: coordinator_backend.args, env: coordinator_backend.env })
const coordinatorConfig: CoordinatorConfig = {
  adapter: new AcpBackendAdapter(acpBackendInstance)
}

// Configuring team
const runTeamOptions: RunTeamOptions = { revealCoordinator: true, mode: 'team', coordinator: coordinatorConfig }

function printPlanSummary(planArtifact: ReturnType<typeof oma.createPlanArtifact>): void {
  console.log(`\nPlan preview — ${planArtifact.tasks.length} task(s): `)
  for (const task of planArtifact.tasks) {
    const deps = task.dependsOn?.length ? ` (depends on: ${task.dependsOn.join(', ')})` : '';
    console.log(`  - [${task.id}] ${task.title}${deps}`);
  }
}

async function renderDashboard(result: TeamRunResult): Promise<void> {
  const runId = result.identity?.runId;
  let run: StoredRun | undefined;
  if (runId) {
    run = (await store.getRun(runId, { includeRecords: true })) ?? undefined;
  } else {
    console.warn('Run finished without a run ID; dashboard will have no stored run records.');
  }

  writeFileSync('dashboard.html', renderRunViewer({ result, run }))
  console.log(`\nDAG dashboard → dashboard.html`)
}

if (runMode.mode === 'plan-only') {
  // Plan-only mode: coordinator decomposes the goal, no task agents execute.
  console.log(`Previewing plan for goal - ${goal}`)
  const preview = await oma.runTeam(team, goal, { ...runTeamOptions, planOnly: true })
  console.log(`\nRouting decision - ${JSON.stringify(preview.routingDecision, null, 2)} `)

  try {
    const planArtifact = oma.createPlanArtifact(preview)
    printPlanSummary(planArtifact)

    const planPath = runMode.planFile ?? 'plan.json'
    savePlanArtifact(planArtifact, planPath)
    console.log(`\nPlan artifact saved → ${planPath} `)
    console.log(`Replay later with: npm run dev-- --goal='${goal}' --replay ${planPath} `)
  } finally {
    // Flushing traces — runs even if artifact creation fails
    await sink.forceFlush({ timeoutMs: 5_000 })
    await renderDashboard(preview)
  }
} else if (runMode.mode === 'replay') {
  // Replay mode: execute a frozen plan without invoking the coordinator.
  const planPath = runMode.planFile;
  if (!planPath) { throw new Error('--replay requires a path argument, e.g. --replay plan.json'); }
  const planArtifact = loadPlanArtifact(planPath)
  console.log(`Replaying plan from ${planPath} — ${planArtifact.tasks.length} task(s)`)

  const result = await oma.runFromPlan(team, planArtifact)

  // Flushing traces and rendering the dashboard for the replayed run
  await sink.forceFlush({ timeoutMs: 5_000 })
  await renderDashboard(result)

  // Knip on replay: report only, no retry loop.
  console.log('\nRunning knip (report only)...');
  try {
    const knip = runKnipWithTrace();
    if (knip.clean) {
      console.log('knip: no issues found.');
    } else {
      console.log('knip: issues found (no retry on replay):');
      console.log(knip.output);
    }
  } catch (err) {
    console.error('knip: failed to run (binary missing or fatal error):', err);
  }
} else {
  // Default mode: full team run with the knip feedback loop.
  console.log(`Executing goal - ${goal} `)
  let result = await oma.runTeam(team, goal, runTeamOptions)
  console.log(`\nRouting decision - ${JSON.stringify(result.routingDecision, null, 2)} `)

  try {
    // Knip feedback loop: up to KNIP_MAX_RETRIES knip runs; re-run the team only
    // when issues remain and a retry budget is still available.
    for (let attempt = 1; attempt <= KNIP_MAX_RETRIES; attempt++) {
      console.log(`\nRunning knip(attempt ${attempt} / ${KNIP_MAX_RETRIES})...`);
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
      const followUpGoal = `knip reported the following issues that must be fixed: \n\n${knip.output} \n\nPlease fix all reported issues.`;
      console.log(`knip: issues found, feeding back to team(retry ${attempt} / ${KNIP_MAX_RETRIES})...`);
      result = await oma.runTeam(team, followUpGoal, runTeamOptions);
      console.log(`\nRouting decision - ${JSON.stringify(result.routingDecision, null, 2)} `);
    }
  } finally {
    // Flushing traces — runs even if the knip loop throws
    await sink.forceFlush({ timeoutMs: 5_000 }) // exporter → FileTraceStore
    await renderDashboard(result)
  }
}
