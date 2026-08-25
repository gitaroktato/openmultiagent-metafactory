import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAcpBackendConfig, createTeamConfig, TEAM_NAME } from './team.js';

const backend = createAcpBackendConfig('test-session');
const config = createTeamConfig(backend);

describe('hybrid-dev team definition', () => {
  it('contains exactly one review agent with a TypeScript keyword in its name', () => {
    const reviewAgents = config.agents.filter(agent => typeof agent.name === 'string' && /review/i.test(agent.name));
    assert.equal(reviewAgents.length, 1, `expected exactly one review agent, got: ${config.agents.map(a => a.name).join(', ')}`);
    assert.ok(reviewAgents[0], 'review agent must exist');
    assert.match(reviewAgents[0].name as string, /typescript/i, 'review agent name must carry TypeScript keywords');
  });

  it('does not contain the old generic reviewer agent', () => {
    const names = config.agents.map(agent => agent.name ?? '');
    assert.ok(!names.includes('reviewer'), `generic "reviewer" agent should be absent, got: ${names.join(', ')}`);
  });

  it('references the typescript-pro skill in the review agent prompt', () => {
    const reviewAgent = config.agents.find(agent => typeof agent.name === 'string' && /review/i.test(agent.name));
    assert.ok(reviewAgent, 'review agent must exist');
    assert.match(reviewAgent.systemPrompt as string, /typescript-pro/);
    assert.match(reviewAgent.systemPrompt as string, /\.agents\/skills\/typescript-pro\/SKILL\.md/);
  });

  it('applies typescript-pro constraints (strict mode, no any, type guards) in the review agent prompt', () => {
    const reviewAgent = config.agents.find(agent => typeof agent.name === 'string' && /review/i.test(agent.name));
    assert.ok(reviewAgent, 'review agent must exist');
    assert.match(reviewAgent.systemPrompt as string, /strict mode/i);
    assert.match(reviewAgent.systemPrompt as string, /no explicit any/i);
    assert.match(reviewAgent.systemPrompt as string, /type guards/i);
  });

  it('enforces read-only behavior in the review agent prompt', () => {
    const reviewAgent = config.agents.find(agent => typeof agent.name === 'string' && /review/i.test(agent.name));
    assert.ok(reviewAgent, 'review agent must exist');
    assert.match(reviewAgent.systemPrompt as string, /read-only/i);
    assert.match(reviewAgent.systemPrompt as string, /never edit files/i);
  });

  it('keeps the planner and coder agents intact', () => {
    const names = config.agents.map(agent => agent.name ?? '');
    assert.ok(names.includes('planner'), 'planner agent must exist');
    assert.ok(names.includes('coder'), 'coder agent must exist');
  });

  it('uses the shared ACP backend for all agents', () => {
    for (const agent of config.agents) {
      assert.equal(agent.backend, backend, `agent "${agent.name}" should use the shared backend`);
    }
  });

  it('is named hybrid-dev with shared memory enabled', () => {
    assert.equal(config.name, TEAM_NAME);
    assert.equal(TEAM_NAME, 'hybrid-dev');
    assert.equal(config.sharedMemory, true);
  });
});
