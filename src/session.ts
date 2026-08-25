import { randomInt } from 'node:crypto';

const BACKLOG_ID_PATTERN = /\b(oma-\d+)\b/i;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const TOKEN_LENGTH = 26;

/**
 * Generates a random alphanumeric token of fixed length.
 * Uses only A-Z, a-z, and 0-9 so the token never contains '_',
 * keeping the `<backlogId>_<token>` format unambiguous.
 */
function randomToken(): string {
  return Array.from({ length: TOKEN_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

/**
 * Creates a session ID for a run.
 *
 * @param backlogId - Optional backlog task ID (e.g. "oma-0003"). When provided,
 *   the returned ID is prefixed with `<backlogId>_`, e.g. `oma-0003_<token>`.
 *   When omitted the returned ID is the random token alone.
 */
export function createSessionId(backlogId?: string): string {
  const token = randomToken();
  return backlogId ? `${backlogId}_${token}` : token;
}

/**
 * Extracts the first backlog ID (e.g. "oma-0003") from an arbitrary goal string.
 * Returns `undefined` when no backlog ID is found.
 */
export function extractBacklogId(goal: string): string | undefined {
  const match = goal.match(BACKLOG_ID_PATTERN);
  return match?.[1]?.toLowerCase();
}
