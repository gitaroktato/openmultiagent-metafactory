import { ExternalAgentBackendConfig, TeamConfig } from '@open-multi-agent/core'

export const TEAM_NAME = 'hybrid-dev'

export function createAcpBackendConfig(sessionId: string): ExternalAgentBackendConfig {
  return {
    kind: 'acp',
    command: 'opencode',
    env: {
      "OPENCODE_MODEL": "unsloth-studio/unsloth/Qwen3.8-27B-GGUF#medium",
      "OPENCODE_ENABLE_TELEMETRY": "1",
      "OPENCODE_OTLP_ENDPOINT": "http://localhost:4317",
      "OPENCODE_OTLP_PROTOCOL": "grpc",
      "OPENCODE_OTLP_HEADERS": "x-project-name=default",
      // Example of controlling sessionID and userID for ACP delegated calls
      "OPENCODE_SPAN_ATTRIBUTES": `session.id=${sessionId},user.id=gitaroktato`
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
