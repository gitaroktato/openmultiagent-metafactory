import type { AgentBackend, LLMAdapter, LLMChatOptions, LLMMessage, LLMResponse, LLMStreamOptions, RunResult, StreamEvent } from '@open-multi-agent/core'

/**
 * Adapts an {@link AgentBackend} (e.g. an ACP subprocess) to the provider-agnostic
 * {@link LLMAdapter} contract so it can serve as a coordinator.
 */
export class AcpBackendAdapter implements LLMAdapter {
  readonly name = 'AcpBackendAdapter';

  constructor(private readonly backend: AgentBackend) {}

  chat(messages: LLMMessage[], options: LLMChatOptions): Promise<LLMResponse> {
    return this.backend.run(messages, options).then((runResult: RunResult) => ({
      id: runResult.identity?.runId ?? '',
      content: runResult.messages.flatMap(record => record.content),
      usage: runResult.tokenUsage,
      model: 'dummy-model',
      stop_reason: runResult.aborted ? 'aborted' : 'completed',
    }));
  }

  stream(messages: LLMMessage[], options: LLMStreamOptions): AsyncIterable<StreamEvent> {
    return this.backend.stream(messages, options);
  }
}
