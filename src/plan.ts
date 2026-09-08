import { writeFileSync, readFileSync } from 'node:fs';
import type { PlanArtifact, PlanTaskArtifact } from '@open-multi-agent/core';

type RunMode = 'team' | 'plan-only' | 'replay';

export interface RunModeArgs {
  mode: RunMode;
  planFile?: string;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parsePlanTaskArtifact(value: unknown, index: number): PlanTaskArtifact {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Invalid plan artifact: task at index ${index} is not an object`);
  }
  const task = value as Record<string, unknown>;
  if (!nonEmptyString(task.id)) {
    throw new Error(`Invalid plan artifact: task at index ${index} is missing a non-empty "id"`);
  }
  if (!nonEmptyString(task.title)) {
    throw new Error(`Invalid plan artifact: task "${task.id}" is missing a non-empty "title"`);
  }
  if (!nonEmptyString(task.description)) {
    throw new Error(`Invalid plan artifact: task "${task.id}" is missing a non-empty "description"`);
  }
  return value as PlanTaskArtifact;
}

/**
 * Validates a parsed JSON value as a {@link PlanArtifact}.
 * Requires `version === 1`, a non-empty `tasks` array, and each task to have
 * non-empty `id`, `title`, and `description` fields.
 */
export function validatePlanArtifact(value: unknown): asserts value is PlanArtifact {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid plan artifact: root is not an object');
  }
  const artifact = value as Record<string, unknown>;
  if (artifact.version !== 1) {
    throw new Error(`Invalid plan artifact: unsupported version ${String(artifact.version)}, expected 1`);
  }
  if (!Array.isArray(artifact.tasks) || artifact.tasks.length === 0) {
    throw new Error('Invalid plan artifact: "tasks" must be a non-empty array');
  }
  for (const [index, task] of artifact.tasks.entries()) {
    parsePlanTaskArtifact(task, index);
  }
}

/**
 * Parses CLI arguments for run mode selection.
 *
 * Handles `--plan-only`, `--plan-file <path>`, and `--replay <path>`.
 * The `--goal=` argument is ignored (passthrough). Throws on conflicting
 * flags (`--plan-only` combined with `--replay`) or a missing path for
 * `--replay` / `--plan-file`.
 */
export function parseRunModeArgs(argv: readonly string[]): RunModeArgs {
  let mode: RunMode = 'team';
  let planFile: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--plan-only') {
      if (mode === 'replay') {
        throw new Error('Conflicting flags: --plan-only cannot be combined with --replay');
      }
      mode = 'plan-only';
    } else if (arg === '--replay') {
      if (mode === 'plan-only') {
        throw new Error('Conflicting flags: --replay cannot be combined with --plan-only');
      }
      const path = argv[++i];
      if (!path) {
        throw new Error('--replay requires a path argument, e.g. --replay plan.json');
      }
      mode = 'replay';
      planFile = path;
    } else if (arg === '--plan-file') {
      const path = argv[++i];
      if (!path) {
        throw new Error('--plan-file requires a path argument, e.g. --plan-file plan.json');
      }
      planFile = path;
    }
  }

  return planFile === undefined ? { mode } : { mode, planFile };
}

/**
 * Persists a plan artifact as pretty-printed JSON to the given path.
 */
export function savePlanArtifact(plan: PlanArtifact, path: string): void {
  writeFileSync(path, JSON.stringify(plan, null, 2) + '\n', 'utf-8');
}

/**
 * Loads and validates a plan artifact from the given JSON file path.
 */
export function loadPlanArtifact(path: string): PlanArtifact {
  const raw = readFileSync(path, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid plan artifact at ${path}: not valid JSON`, { cause: err });
  }
  validatePlanArtifact(parsed);
  return parsed;
}
