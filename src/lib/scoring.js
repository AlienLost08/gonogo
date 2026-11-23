// GoNoGo scoring engine. Pure functions only: no Forge imports, so it is fully unit-testable.
// Input issues are plain Jira REST v3 issue objects (fields + optional changelog).

export const DEFAULT_SETTINGS = Object.freeze({
  staleDays: 5,
  throughputWindowDays: 14,
  goThreshold: 80,
  cautionThreshold: 60,
});

const DAY = 24 * 60 * 60 * 1000;
const HIGH_PRIORITIES = new Set(['highest', 'high', 'blocker', 'critical', 'p0', 'p1']);
const DONE_FALLBACK_NAMES = new Set(['done', 'closed', 'resolved', 'released', 'shipped']);
const AC_PATTERN = /(acceptance criteria|definition of done|\bAC\b|given\b[\s\S]*\bwhen\b[\s\S]*\bthen\b|- \[ \])/i;

export const CHECKS = Object.freeze({
  blockers: { label: 'Open high-priority work', per: 12, cap: 36, severity: 'high' },
  blockedLinks: { label: 'Blocked by unfinished issues', per: 8, cap: 24, severity: 'high' },
  reopened: { label: 'Reopened after done (churn)', per: 4, cap: 12, severity: 'medium' },
  stale: { label: 'In progress but stale', per: 4, cap: 16, severity: 'medium' },
  unassigned: { label: 'Open work with no owner', per: 3, cap: 12, severity: 'medium' },
  missingAc: { label: 'No acceptance criteria', per: 2, cap: 10, severity: 'low' },
  scopeCreep: { label: 'Scope added after release start', cap: 15, severity: 'medium' },
  schedule: { label: 'Not enough runway before release date', cap: 20, severity: 'high' },
});

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

export function adfToText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(adfToText).join(' ');
  let out = node.text || '';
  if (node.content) out += ' ' + adfToText(node.content);
  return out.trim();
}

export function statusCategory(issue) {
  return issue?.fields?.status?.statusCategory?.key || 'new'; // new | indeterminate | done
}

export function isDone(issue) {
  return statusCategory(issue) === 'done';
}

export function isHighPriority(issue) {
  const name = (issue?.fields?.priority?.name || '').toLowerCase();
  return HIGH_PRIORITIES.has(name);
}

export function hasAcceptanceCriteria(issue) {
  const text = adfToText(issue?.fields?.description);
  return AC_PATTERN.test(text);
}

export function daysBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / DAY;
}

/** Inward "is blocked by" links whose other side is not done. */
export function openBlockingLinks(issue) {
  const links = issue?.fields?.issuelinks || [];
  return links
    .filter((l) => {
      const type = l.type || {};
      const isBlockType = /block/i.test(type.name || '') || /blocked by/i.test(type.inward || '');
      return isBlockType && l.inwardIssue && l.inwardIssue.fields?.status?.statusCategory?.key !== 'done';
    })
    .map((l) => l.inwardIssue.key);
}

/** Number of times the issue moved out of a done status. */
export function reopenCount(issue, doneNames = DONE_FALLBACK_NAMES) {
  const histories = issue?.changelog?.histories || [];
  let count = 0;
  for (const h of histories) {
    for (const item of h.items || []) {
      if (item.field === 'status' && doneNames.has(String(item.fromString || '').toLowerCase())
        && !doneNames.has(String(item.toString || '').toLowerCase())) {
        count += 1;
      }
    }
  }
  return count;
}

export function collectDoneNames(issues) {
  const names = new Set(DONE_FALLBACK_NAMES);
  for (const i of issues) {
    if (isDone(i) && i.fields?.status?.name) names.add(i.fields.status.name.toLowerCase());
  }
  return names;
}

function summaryOf(issue) {
  return {
    key: issue.key,
    summary: issue.fields?.summary || '',
    status: issue.fields?.status?.name || 'Unknown',
    priority: issue.fields?.priority?.name || 'None',
    assignee: issue.fields?.assignee?.displayName || null,
  };
}

/** Per-issue risk signals, shared by the release score and the single-issue view. */
export function issueSignals(issue, { now = new Date(), settings = DEFAULT_SETTINGS, doneNames, version } = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const done = isDone(issue);
  const signals = [];
  const blockedBy = openBlockingLinks(issue);
  const reopened = reopenCount(issue, doneNames || collectDoneNames([issue]));
  const idleDays = issue.fields?.updated ? daysBetween(issue.fields.updated, now) : 0;
  const type = (issue.fields?.issuetype?.name || '').toLowerCase();

  if (!done && isHighPriority(issue)) signals.push({ check: 'blockers', detail: `${issue.fields.priority.name} priority and still ${issue.fields.status?.name || 'open'}` });
  if (!done && blockedBy.length) signals.push({ check: 'blockedLinks', detail: `blocked by ${blockedBy.join(', ')}` });
  if (reopened > 0) signals.push({ check: 'reopened', detail: `reopened ${reopened}x after being done` });
  if (statusCategory(issue) === 'indeterminate' && idleDays > s.staleDays) signals.push({ check: 'stale', detail: `no update for ${Math.floor(idleDays)} days` });
  if (!done && !issue.fields?.assignee) signals.push({ check: 'unassigned', detail: 'no assignee' });
  if (!done && !['bug', 'sub-task', 'subtask', 'epic'].includes(type) && !hasAcceptanceCriteria(issue)) signals.push({ check: 'missingAc', detail: 'description has no acceptance criteria' });
  if (version?.startDate && issue.fields?.created && new Date(issue.fields.created) > new Date(version.startDate + 'T23:59:59Z')) {
    signals.push({ check: 'scopeCreep', detail: `added ${String(issue.fields.created).slice(0, 10)}, after release start ${version.startDate}` });
  }
  return { ...summaryOf(issue), done, signals, blockedBy, reopened, idleDays: Math.floor(idleDays) };
}

export function verdictFor(score, hasHardBlocker, settings = DEFAULT_SETTINGS) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  if (score >= s.goThreshold && !hasHardBlocker) return 'GO';
  if (score >= s.cautionThreshold) return 'CAUTION';
  return 'NO-GO';
}

/**
 * Score a release.
 * @param {object} args
 * @param {object[]} args.issues  issues in the fix version
 * @param {object} [args.version] Jira version {name, startDate, releaseDate, released}
 * @param {number} [args.resolvedInWindow] issues the project resolved in the throughput window
 */
export function analyzeRelease({ issues = [], version = null, resolvedInWindow = null, now = new Date(), settings = {} }) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const doneNames = collectDoneNames(issues);
  const perIssue = issues.map((i) => issueSignals(i, { now, settings: s, doneNames, version }));
  const open = perIssue.filter((i) => !i.done);

  const checks = {};
  for (const key of Object.keys(CHECKS)) checks[key] = { key, ...CHECKS[key], issues: [], penalty: 0 };
  for (const i of perIssue) {
    for (const sig of i.signals) checks[sig.check].issues.push({ key: i.key, summary: i.summary, detail: sig.detail });
  }
  for (const c of Object.values(checks)) {
    if (c.per) c.penalty = Math.min(c.cap, c.per * c.issues.length);
  }

  // Scope creep: share of issues added after the release started.
  if (issues.length) {
    const share = checks.scopeCreep.issues.length / issues.length;
    checks.scopeCreep.penalty = Math.min(CHECKS.scopeCreep.cap, Math.round(share * 30));
    checks.scopeCreep.share = Math.round(share * 100);
  }

  // Schedule: can the team close the remaining work before the release date at its recent pace?
  const forecast = { openCount: open.length, daysLeft: null, perDay: null, projectedDays: null };
  if (version?.releaseDate && open.length) {
    const daysLeft = daysBetween(now, version.releaseDate + 'T23:59:59Z');
    forecast.daysLeft = Math.round(daysLeft * 10) / 10;
    if (resolvedInWindow != null) {
      const perDay = Math.max(resolvedInWindow / s.throughputWindowDays, 0.1);
      forecast.perDay = Math.round(perDay * 100) / 100;
      forecast.projectedDays = Math.round((open.length / perDay) * 10) / 10;
    }
    if (daysLeft < 0) {
      checks.schedule.penalty = CHECKS.schedule.cap;
      checks.schedule.issues.push({ key: '-', summary: version.name, detail: `release date ${version.releaseDate} passed with ${open.length} open issues` });
    } else if (forecast.projectedDays != null && forecast.projectedDays > daysLeft) {
      const overrun = (forecast.projectedDays - daysLeft) / Math.max(forecast.projectedDays, 1);
      checks.schedule.penalty = Math.min(CHECKS.schedule.cap, Math.max(5, Math.round(overrun * CHECKS.schedule.cap)));
      checks.schedule.issues.push({ key: '-', summary: version.name, detail: `${open.length} open issues need ~${forecast.projectedDays} days at ${forecast.perDay}/day, only ${forecast.daysLeft} days left` });
    }
  }

  const totalPenalty = Object.values(checks).reduce((a, c) => a + c.penalty, 0);
  const score = issues.length ? Math.max(0, Math.min(100, 100 - totalPenalty)) : 0;
  const hardBlocker = checks.blockers.issues.length > 0 || checks.blockedLinks.issues.length > 0;
  const verdict = issues.length ? verdictFor(score, hardBlocker, s) : 'NO-GO';

  const failed = Object.values(checks)
    .filter((c) => c.penalty > 0)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.penalty - a.penalty);

  const blockers = perIssue
    .filter((i) => i.signals.some((sig) => ['blockers', 'blockedLinks', 'reopened'].includes(sig.check)) && !i.done)
    .map((i) => ({ ...i, weight: i.signals.reduce((a, sig) => a + (CHECKS[sig.check].per || 0), 0) }))
    .sort((a, b) => b.weight - a.weight);

  return {
    version: version ? { name: version.name, startDate: version.startDate || null, releaseDate: version.releaseDate || null } : null,
    score,
    verdict,
    totals: { issues: issues.length, open: open.length, done: issues.length - open.length },
    forecast,
    checks: failed.map(({ key, label, severity, penalty, issues: list, share }) => ({ key, label, severity, penalty, count: list.length, share, issues: list.slice(0, 10) })),
    blockers: blockers.slice(0, 15),
    nextActions: nextActions(failed, forecast),
    empty: issues.length === 0,
  };
}

export function nextActions(failedChecks, forecast) {
  const tips = {
    blockers: 'Swarm on the open high-priority issues first, or explicitly move them out of this release.',
    blockedLinks: 'Chase the upstream issues that block release work, or cut the dependent scope.',
    reopened: 'Add a regression test for each reopened issue before re-closing it.',
    stale: 'Ask owners of stale in-progress issues for a status today; reassign if they are stuck.',
    unassigned: 'Give every open issue an owner, or move it out of the release.',
    missingAc: 'Add acceptance criteria so QA knows what "done" means.',
    scopeCreep: 'Freeze scope: anything added after the start should justify its place or move to the next version.',
    schedule: forecast?.projectedDays != null
      ? `At the current pace you need ~${forecast.projectedDays} days; cut scope or move the release date.`
      : 'The release date has passed; agree a new date or ship what is done.',
  };
  return failedChecks.slice(0, 4).map((c) => tips[c.key]);
}

/** Markdown-ish plain text report for agents and MCP clients. */
export function toPlainReport(result) {
  if (result.empty) return `No issues found in ${result.version?.name || 'this release'}, so there is nothing to score yet.`;
  const lines = [];
  lines.push(`GoNoGo for ${result.version?.name || 'release'}: ${result.verdict} (confidence ${result.score}/100)`);
  lines.push(`${result.totals.done}/${result.totals.issues} issues done, ${result.totals.open} open.`);
  if (result.forecast.daysLeft != null) lines.push(`Days to release date: ${result.forecast.daysLeft}.`);
  if (result.checks.length) {
    lines.push('Risks:');
    for (const c of result.checks) {
      lines.push(`- [${c.severity}] ${c.label} (-${c.penalty}): ${c.issues.map((i) => (i.key === '-' ? i.detail : `${i.key} ${i.detail}`)).join('; ')}`);
    }
  } else {
    lines.push('No risks found.');
  }
  if (result.nextActions.length) {
    lines.push('Next actions:');
    result.nextActions.forEach((a, n) => lines.push(`${n + 1}. ${a}`));
  }
  return lines.join('\n');
}
