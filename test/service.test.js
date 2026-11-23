import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseReadiness, issueShipRisk, UserError } from '../src/lib/service.js';
import { createJiraClient } from '../src/lib/jira.js';
import { issue, S, VERSION, NOW } from './fixtures.js';

function fakeJira({ versions = [VERSION], issues = [], resolved = 14, single } = {}) {
  const calls = [];
  return {
    calls,
    getVersions: async (p) => { calls.push(['versions', p]); return versions; },
    searchAll: async (jql) => { calls.push(['search', jql]); return issues; },
    countResolved: async () => resolved,
    getIssue: async (k) => single || issue(k),
  };
}
const memStore = () => { const m = new Map(); return { get: async (k) => m.get(k), set: async (k, v) => m.set(k, v), m }; };

test('releaseReadiness resolves context, scores, and stores trend', async () => {
  const jira = fakeJira({ issues: [issue('SHOP-1'), issue('SHOP-2', { status: S.todo, priority: 'High' })] });
  const store = memStore();
  const r = await releaseReadiness({ jira, store, payload: { context: { jira: { projectKey: 'SHOP' } } }, now: NOW });
  assert.equal(r.projectKey, 'SHOP');
  assert.equal(r.version.name, '2.4.0');
  assert.match(jira.calls[1][1], /fixVersion = 10001/);
  assert.equal(r.trend.length, 1);
  assert.equal(store.m.size, 1);
});

test('releaseReadiness gives actionable errors', async () => {
  await assert.rejects(releaseReadiness({ jira: fakeJira(), payload: {} }), UserError);
  await assert.rejects(releaseReadiness({ jira: fakeJira({ versions: [] }), payload: { projectKey: 'SHOP' } }), /no unreleased versions/);
  await assert.rejects(releaseReadiness({ jira: fakeJira(), payload: { projectKey: 'SHOP', versionName: '9.9' } }), /Versions: 2.4.0/);
});

test('issueShipRisk levels', async () => {
  const hi = await issueShipRisk({ jira: fakeJira({ single: issue('SHOP-1', { status: S.wip, priority: 'Highest', assignee: null }) }), payload: { issueKey: 'SHOP-1' }, now: NOW });
  assert.equal(hi.level, 'HIGH');
  const lo = await issueShipRisk({ jira: fakeJira(), payload: { issueKey: 'SHOP-2' }, now: NOW });
  assert.equal(lo.level, 'LOW');
});

test('jira client paginates search with nextPageToken and stops at max', async () => {
  let n = 0;
  const route = (s, ...v) => s.reduce((a, p, i) => a + p + (v[i] ?? ''), '');
  const request = async (path, opts) => {
    n += 1;
    const body = JSON.parse(opts.body);
    assert.equal(body.expand, 'changelog');
    return { ok: true, json: async () => ({ issues: [issue(`X-${n}`)], nextPageToken: n < 5 ? `t${n}` : undefined }) };
  };
  const client = createJiraClient(request, route);
  assert.equal((await client.searchAll('project = X')).length, 5);
  n = 0;
  assert.equal((await client.searchAll('project = X', { max: 2 })).length, 2);
});

test('jira client surfaces HTTP errors', async () => {
  const route = (s, ...v) => s.reduce((a, p, i) => a + p + (v[i] ?? ''), '');
  const client = createJiraClient(async () => ({ ok: false, status: 403, text: async () => 'nope' }), route);
  await assert.rejects(client.getVersions('X'), /403/);
});
