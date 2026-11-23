import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRelease, issueSignals, reopenCount, openBlockingLinks, hasAcceptanceCriteria, verdictFor, toPlainReport, adfToText } from '../src/lib/scoring.js';
import { issue, S, VERSION, NOW, daysAgo, adf } from './fixtures.js';

test('all done release is GO at 100', () => {
  const r = analyzeRelease({ issues: [issue('A-1'), issue('A-2')], version: VERSION, resolvedInWindow: 20, now: NOW });
  assert.equal(r.score, 100);
  assert.equal(r.verdict, 'GO');
  assert.equal(r.checks.length, 0);
});

test('empty release is NO-GO and flagged empty', () => {
  const r = analyzeRelease({ issues: [], version: VERSION, now: NOW });
  assert.equal(r.empty, true);
  assert.equal(r.verdict, 'NO-GO');
  assert.match(toPlainReport(r), /nothing to score/);
});

test('open highest-priority issue blocks GO even with a high score', () => {
  const issues = [issue('A-1', { status: S.wip, priority: 'Highest' }), ...Array.from({ length: 9 }, (_, i) => issue(`A-${i + 2}`))];
  const r = analyzeRelease({ issues, version: VERSION, resolvedInWindow: 30, now: NOW });
  assert.equal(r.score, 88);
  assert.equal(r.verdict, 'CAUTION');
  assert.equal(r.blockers[0].key, 'A-1');
});

test('penalties are capped per check', () => {
  const issues = Array.from({ length: 10 }, (_, i) => issue(`A-${i}`, { status: S.todo, assignee: null }));
  const r = analyzeRelease({ issues, version: VERSION, resolvedInWindow: 100, now: NOW });
  const unassigned = r.checks.find((c) => c.key === 'unassigned');
  assert.equal(unassigned.count, 10);
  assert.equal(unassigned.penalty, 12);
});

test('stale only counts in-progress work idle beyond threshold', () => {
  const stale = issue('A-1', { status: S.review, updated: daysAgo(9) });
  const fresh = issue('A-2', { status: S.review, updated: daysAgo(2) });
  const todoOld = issue('A-3', { status: S.todo, updated: daysAgo(30) });
  assert.ok(issueSignals(stale, { now: NOW }).signals.some((s) => s.check === 'stale'));
  assert.ok(!issueSignals(fresh, { now: NOW }).signals.some((s) => s.check === 'stale'));
  assert.ok(!issueSignals(todoOld, { now: NOW }).signals.some((s) => s.check === 'stale'));
  assert.ok(!issueSignals(stale, { now: NOW, settings: { staleDays: 10 } }).signals.some((s) => s.check === 'stale'));
});

test('blocked-by links only count when the blocker is unfinished', () => {
  const link = (k, cat) => ({ type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' }, inwardIssue: { key: k, fields: { status: { statusCategory: { key: cat } } } } });
  const i = issue('A-1', { status: S.todo, links: [link('B-1', 'indeterminate'), link('B-2', 'done'), { type: { name: 'Relates' }, inwardIssue: { key: 'C-1', fields: { status: { statusCategory: { key: 'new' } } } } }] });
  assert.deepEqual(openBlockingLinks(i), ['B-1']);
});

test('reopen churn is detected from changelog', () => {
  const histories = [
    { items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }] },
    { items: [{ field: 'status', fromString: 'Done', toString: 'In Progress' }] },
    { items: [{ field: 'assignee', fromString: 'Done', toString: 'x' }] },
  ];
  assert.equal(reopenCount(issue('A-1', { histories })), 1);
});

test('acceptance criteria detection handles ADF, checklists and Gherkin', () => {
  assert.ok(hasAcceptanceCriteria(issue('A', { description: adf('Acceptance Criteria\n- works') })));
  assert.ok(hasAcceptanceCriteria(issue('A', { description: adf('Given a user When they pay Then receipt') })));
  assert.ok(hasAcceptanceCriteria(issue('A', { description: adf('- [ ] login works') })));
  assert.ok(!hasAcceptanceCriteria(issue('A', { description: adf('make it nice') })));
  assert.ok(!hasAcceptanceCriteria(issue('A', { description: null })));
});

test('bugs are not required to have acceptance criteria', () => {
  const s = issueSignals(issue('A', { type: 'Bug', status: S.todo, description: null }), { now: NOW });
  assert.ok(!s.signals.some((x) => x.check === 'missingAc'));
});

test('scope creep uses created date vs version start', () => {
  const issues = [issue('A-1', { created: '2026-12-01T09:00:00.000+0000' }), issue('A-2'), issue('A-3'), issue('A-4')];
  const r = analyzeRelease({ issues, version: VERSION, resolvedInWindow: 10, now: NOW });
  const c = r.checks.find((x) => x.key === 'scopeCreep');
  assert.equal(c.count, 1);
  assert.equal(c.share, 25);
  assert.equal(c.penalty, 8);
});

test('schedule risk when remaining work exceeds runway', () => {
  const issues = Array.from({ length: 10 }, (_, i) => issue(`A-${i}`, { status: S.todo }));
  const r = analyzeRelease({ issues, version: VERSION, resolvedInWindow: 7, now: NOW }); // 0.5/day -> 20 days, ~5.5 left
  assert.equal(r.forecast.projectedDays, 20);
  assert.ok(r.checks.find((c) => c.key === 'schedule').penalty >= 5);
});

test('overdue release with open work gets the full schedule penalty', () => {
  const r = analyzeRelease({ issues: [issue('A-1', { status: S.todo })], version: { ...VERSION, releaseDate: '2026-12-01' }, resolvedInWindow: 10, now: NOW });
  assert.equal(r.checks.find((c) => c.key === 'schedule').penalty, 20);
});

test('verdict thresholds', () => {
  assert.equal(verdictFor(80, false), 'GO');
  assert.equal(verdictFor(79, false), 'CAUTION');
  assert.equal(verdictFor(90, true), 'CAUTION');
  assert.equal(verdictFor(59, false), 'NO-GO');
});

test('checks sorted by severity then penalty and report lists evidence', () => {
  const issues = [issue('A-1', { status: S.todo, priority: 'High', assignee: null }), issue('A-2', { status: S.todo, description: adf('vague') })];
  const r = analyzeRelease({ issues, version: VERSION, resolvedInWindow: 30, now: NOW });
  assert.equal(r.checks[0].key, 'blockers');
  const text = toPlainReport(r);
  assert.match(text, /A-1/);
  assert.match(text, /Next actions/);
});

test('adfToText flattens nested content', () => {
  assert.equal(adfToText({ content: [{ text: 'a' }, { content: [{ text: 'b' }] }] }), 'a b');
});
