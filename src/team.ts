import { ExternalAgentBackendConfig, TeamConfig } from '@open-multi-agent/core'
import { OPENCODE_MODEL_ID_MEDIUM, OTLP_ENDPOINT } from './constants'

export const TEAM_NAME = 'hybrid-dev'

const USER_ID = process.env.USER ?? 'unknown'

export function createAcpBackendConfig(sessionId: string, model_id: string = OPENCODE_MODEL_ID_MEDIUM): ExternalAgentBackendConfig {
  return {
    kind: 'acp',
    command: 'opencode',
    env: {
      "OPENCODE_MODEL": model_id,
      "OPENCODE_ENABLE_TELEMETRY": "1",
      "OPENCODE_OTLP_ENDPOINT": OTLP_ENDPOINT,
      "OPENCODE_OTLP_PROTOCOL": "grpc",
      "OPENCODE_OTLP_HEADERS": "x-project-name=default",
      // Example of controlling sessionID and userID for ACP delegated calls
      "OPENCODE_SPAN_ATTRIBUTES": `session.id=${sessionId},user.id=${USER_ID}`
    },
    args: ['acp', '--print-logs'],
    permission: 'auto-approve'
  }
}

export function createTeamConfig(backend: ExternalAgentBackendConfig): TeamConfig {
  return {
    name: TEAM_NAME,
    agents: [
      { name: 'planner', systemPrompt: 'Break the task into a short plan. Do not write code.', backend: backend },
      {
        name: 'coder',
        systemPrompt: 'Writes and edits code by running an external coding CLI.',
        backend: backend,
      },
      {
        name: 'typescript-reviewer',
        systemPrompt: 'You are a TypeScript-specialized review agent. Load the predefined typescript-pro skill (.agents/skills/typescript-pro/SKILL.md) and apply its constraints when reviewing TypeScript code: strict mode, no explicit any, type guards, discriminated unions, branded types. You are read-only: never edit files; only produce review recommendations.',
        backend: backend,
      },
    ],
    sharedMemory: true,
  }
}
