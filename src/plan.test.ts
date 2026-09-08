import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PlanArtifact } from '@open-multi-agent/core';
import { loadPlanArtifact, parseRunModeArgs, savePlanArtifact, validatePlanArtifact } from './plan.js';

const samplePlan: PlanArtifact = {
  version: 1,
  goal: 'build a thing',
  tasks: [
    { id: 'task-1', title: 'First task', description: 'Do the first thing' },
    { id: 'task-2', title: 'Second task', description: 'Do the second thing', dependsOn: ['task-1'] },
  ],
};

describe('parseRunModeArgs', () => {
  it('defaults to team mode with no flags', () => {
    assert.deepEqual(parseRunModeArgs([]), { mode: 'team' });
  });

  it('passes through --goal= without affecting the mode', () => {
    const parsed = parseRunModeArgs(['--goal=implement oma-0014']);
    assert.equal(parsed.mode, 'team');
    assert.equal(parsed.planFile, undefined);
  });

  it('parses --plan-only', () => {
    const parsed = parseRunModeArgs(['--goal=x', '--plan-only']);
    assert.deepEqual(parsed, { mode: 'plan-only' });
  });

  it('parses --plan-file <path>', () => {
    const parsed = parseRunModeArgs(['--plan-file', 'custom-plan.json']);
    assert.deepEqual(parsed, { mode: 'team', planFile: 'custom-plan.json' });
  });

  it('parses --plan-only with --plan-file <path>', () => {
    const parsed = parseRunModeArgs(['--plan-only', '--plan-file', 'preview.json']);
    assert.deepEqual(parsed, { mode: 'plan-only', planFile: 'preview.json' });
  });

  it('parses --replay <path>', () => {
    const parsed = parseRunModeArgs(['--goal=x', '--replay', 'frozen-plan.json']);
    assert.deepEqual(parsed, { mode: 'replay', planFile: 'frozen-plan.json' });
  });

  it('throws when --replay has no path', () => {
    assert.throws(() => parseRunModeArgs(['--replay']), /--replay requires a path/);
  });

  it('throws when --plan-file has no path', () => {
    assert.throws(() => parseRunModeArgs(['--plan-file']), /--plan-file requires a path/);
  });

  it('throws on conflicting --plan-only and --replay flags', () => {
    assert.throws(() => parseRunModeArgs(['--plan-only', '--replay', 'p.json']), /Conflicting flags/);
    assert.throws(() => parseRunModeArgs(['--replay', 'p.json', '--plan-only']), /Conflicting flags/);
  });
});

describe('validatePlanArtifact', () => {
  it('accepts a valid artifact', () => {
    assert.doesNotThrow(() => validatePlanArtifact(samplePlan));
  });

  it('rejects a non-object root', () => {
    assert.throws(() => validatePlanArtifact(null), /root is not an object/);
    assert.throws(() => validatePlanArtifact('nope'), /root is not an object/);
  });

  it('rejects an unsupported version', () => {
    assert.throws(
      () => validatePlanArtifact({ version: 2, tasks: samplePlan.tasks }),
      /unsupported version 2/,
    );
  });

  it('rejects missing or empty tasks', () => {
    assert.throws(() => validatePlanArtifact({ version: 1 }), /non-empty array/);
    assert.throws(() => validatePlanArtifact({ version: 1, tasks: [] }), /non-empty array/);
    assert.throws(() => validatePlanArtifact({ version: 1, tasks: 'nope' }), /non-empty array/);
  });

  it('rejects a task missing its id', () => {
    assert.throws(
      () => validatePlanArtifact({ version: 1, tasks: [{ title: 't', description: 'd' }] }),
      /missing a non-empty "id"/,
    );
  });

  it('rejects a task missing its title', () => {
    assert.throws(
      () => validatePlanArtifact({ version: 1, tasks: [{ id: 'a', description: 'd' }] }),
      /missing a non-empty "title"/,
    );
  });

  it('rejects a task missing its description', () => {
    assert.throws(
      () => validatePlanArtifact({ version: 1, tasks: [{ id: 'a', title: 't' }] }),
      /missing a non-empty "description"/,
    );
  });

  it('rejects an empty-string task field', () => {
    assert.throws(
      () => validatePlanArtifact({ version: 1, tasks: [{ id: '', title: 't', description: 'd' }] }),
      /missing a non-empty "id"/,
    );
  });

  it('rejects a non-object task entry', () => {
    assert.throws(
      () => validatePlanArtifact({ version: 1, tasks: ['not-an-object'] }),
      /task at index 0 is not an object/,
    );
  });
});

describe('savePlanArtifact / loadPlanArtifact', () => {
  let dir: string;

  it('round-trips a plan artifact through JSON on disk', () => {
    dir = mkdtempSync(join(tmpdir(), 'oma-plan-'));
    const path = join(dir, 'plan.json');
    savePlanArtifact(samplePlan, path);
    const loaded = loadPlanArtifact(path);
    assert.deepEqual(loaded, samplePlan);
  });

  it('throws a descriptive error for malformed JSON', () => {
    dir = mkdtempSync(join(tmpdir(), 'oma-plan-'));
    const path = join(dir, 'bad.json');
    writeFileSync(path, '{ not json', 'utf-8');
    assert.throws(() => loadPlanArtifact(path), /not valid JSON/);
  });

  it('throws validation errors for invalid artifacts on disk', () => {
    dir = mkdtempSync(join(tmpdir(), 'oma-plan-'));
    const path = join(dir, 'invalid.json');
    writeFileSync(path, JSON.stringify({ version: 1, tasks: [] }), 'utf-8');
    assert.throws(() => loadPlanArtifact(path), /non-empty array/);
  });

  it('throws for a missing file', () => {
    dir = mkdtempSync(join(tmpdir(), 'oma-plan-'));
    assert.throws(() => loadPlanArtifact(join(dir, 'does-not-exist.json')), /ENOENT/);
  });
});
