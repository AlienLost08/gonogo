import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveIssueKey, resolveProjectKey, pickVersion, jqlEscape } from '../src/lib/inputs.js';
import { appendPoint, trendDelta } from '../src/lib/history.js';
import { reportToAdf } from '../src/lib/adf.js';
import { analyzeRelease } from '../src/lib/scoring.js';
import { issue, S, VERSION, NOW } from './fixtures.js';

test('issue key: valid input wins, falls back to context, rejects junk', () => {
  assert.equal(resolveIssueKey({ issueKey: 'shop-12' }), 'SHOP-12');
  assert.equal(resolveIssueKey({ issueKey: 'drop table', context: { jira: { issueKey: 'SHOP-9' } } }), 'SHOP-9');
  assert.equal(resolveIssueKey({}), null);
});

test('project key from input, context or issue key', () => {
  assert.equal(resolveProjectKey({ projectKey: 'shop' }), 'SHOP');
  assert.equal(resolveProjectKey({ context: { jira: { projectKey: 'OPS' } } }), 'OPS');
  assert.equal(resolveProjectKey({ issueKey: 'WEB-3' }), 'WEB');
  assert.equal(resolveProjectKey({ projectKey: 'a b"' }), null);
});

test('pickVersion: by name, partial name, else next unreleased by date', () => {
  const vs = [
    { id: '1', name: '2.3.0', released: true, releaseDate: '2026-11-01' },
    { id: '2', name: '2.5.0', released: false, releaseDate: '2027-01-10' },
    { id: '3', name: '2.4.0', released: false, releaseDate: '2026-12-15' },
    { id: '4', name: 'Backlog', released: false },
    { id: '5', name: 'old', archived: true },
  ];
  assert.equal(pickVersion(vs).id, '3');
  assert.equal(pickVersion(vs, '2.5.0').id, '2');
  assert.equal(pickVersion(vs, '2.3').id, '1');
  assert.equal(pickVersion(vs, 'old'), null);
  assert.equal(pickVersion([], undefined), null);
});

test('jqlEscape escapes quotes and backslashes', () => {
  assert.equal(jqlEscape('a"b\\c'), 'a\\"b\\\\c');
});

test('trend keeps one point per day and computes delta', () => {
  let pts = appendPoint([], { at: '2026-12-01T10:00:00Z', score: 50 });
  pts = appendPoint(pts, { at: '2026-12-01T15:00:00Z', score: 55 });
  pts = appendPoint(pts, { at: '2026-12-02T09:00:00Z', score: 70 });
  assert.equal(pts.length, 2);
  assert.equal(trendDelta(pts), 15);
  assert.equal(trendDelta(pts.slice(0, 1)), null);
  const many = Array.from({ length: 40 }, (_, i) => ({ at: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`, score: i }));
  assert.ok(many.reduce((a, p) => appendPoint(a, p), []).length <= 30);
});

test('ADF report is a valid doc with verdict panel', () => {
  const r = analyzeRelease({ issues: [issue('A-1', { status: S.todo, priority: 'Highest' })], version: VERSION, resolvedInWindow: 5, now: NOW });
  const doc = reportToAdf(r, { generatedAt: NOW });
  assert.equal(doc.type, 'doc');
  assert.equal(doc.content[0].type, 'panel');
  assert.equal(doc.content[0].attrs.panelType, 'warning'); // one blocker caps verdict at CAUTION
  assert.match(JSON.stringify(doc), /A-1/);
});
