import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionId, extractBacklogId } from './session.js';

describe('extractBacklogId', () => {
  it('extracts a backlog ID from a goal string', () => {
    assert.equal(extractBacklogId('Implement oma-0003'), 'oma-0003');
  });

  it('is case-insensitive and normalises to lowercase', () => {
    assert.equal(extractBacklogId('Fix OMA-0012 regression'), 'oma-0012');
  });

  it('returns undefined when no backlog ID is present', () => {
    assert.equal(extractBacklogId('Add dark mode toggle'), undefined);
  });

  it('returns undefined for an empty string', () => {
    assert.equal(extractBacklogId(''), undefined);
  });
});

describe('createSessionId', () => {
  it('returns a non-empty string', () => {
    const id = createSessionId();
    assert.ok(id.length > 0, 'session ID should be non-empty');
  });

  it('prefixes the ID with the backlog ID when provided', () => {
    const id = createSessionId('oma-0003');
    assert.ok(id.startsWith('oma-0003_'), `expected prefix "oma-0003_", got "${id}"`);
  });

  it('does not contain an underscore when backlogId is omitted', () => {
    for (let i = 0; i < 10; i++) {
      const id = createSessionId();
      assert.ok(!id.includes('_'), `expected no underscore in plain token, got "${id}"`);
    }
  });

  it('produces unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createSessionId()));
    assert.equal(ids.size, 20, 'all 20 generated IDs should be unique');
  });

  it('token part is at least 20 characters long', () => {
    const id = createSessionId('oma-0003');
    const prefix = 'oma-0003_';
    const token = id.slice(prefix.length);
    assert.ok(token.length >= 20, `token too short: "${token}"`);
  });

  it('token part contains only alphanumeric characters', () => {
    for (let i = 0; i < 10; i++) {
      const id = createSessionId('oma-0003');
      const token = id.slice('oma-0003_'.length);
      assert.match(token, /^[A-Za-z0-9]+$/, `token "${token}" contains non-alphanumeric chars`);
    }
  });

  it('ID without prefix contains only alphanumeric characters', () => {
    for (let i = 0; i < 10; i++) {
      const id = createSessionId();
      assert.match(id, /^[A-Za-z0-9]+$/, `ID "${id}" contains non-alphanumeric chars`);
    }
  });
});
