// Orchestration shared by UI resolvers, Rovo actions and MCP tools.
import { analyzeRelease, issueSignals, CHECKS, DEFAULT_SETTINGS } from './scoring.js';
import { pickVersion, resolveIssueKey, resolveProjectKey } from './inputs.js';
import { versionJql } from './jira.js';
import { appendPoint, historyKey, trendDelta } from './history.js';

export class UserError extends Error {}

export async function releaseReadiness({ jira, store, payload = {}, now = new Date(), settings = DEFAULT_SETTINGS }) {
  const projectKey = resolveProjectKey(payload);
  if (!projectKey) throw new UserError('Tell me which Jira project to check, for example "SHOP".');
  const versions = await jira.getVersions(projectKey);
  const version = pickVersion(versions, payload.versionName);
  if (!version) {
    throw new UserError(payload.versionName
      ? `No version named "${payload.versionName}" in ${projectKey}. Versions: ${versions.map((v) => v.name).join(', ') || 'none'}.`
      : `${projectKey} has no unreleased versions. Create a fix version in Jira and add issues to it.`);
  }
  const [issues, resolvedInWindow] = await Promise.all([
    jira.searchAll(versionJql(projectKey, version)),
    jira.countResolved(projectKey, settings.throughputWindowDays),
  ]);
  const result = analyzeRelease({ issues, version, resolvedInWindow, now, settings });

  let trend = [];
  if (store) {
    const key = historyKey(projectKey, version.id);
    trend = appendPoint((await store.get(key)) || [], { at: now.toISOString(), score: result.score, verdict: result.verdict });
    await store.set(key, trend);
  }
  return {
    projectKey,
    versions: versions.filter((v) => !v.archived && !v.released).map((v) => v.name),
    ...result,
    trend,
    trendDelta: trendDelta(trend),
  };
}

export async function issueShipRisk({ jira, payload = {}, now = new Date(), settings = DEFAULT_SETTINGS }) {
  const issueKey = resolveIssueKey(payload);
  if (!issueKey) throw new UserError('Tell me which issue to check, for example "SHOP-42".');
  const issue = await jira.getIssue(issueKey);
  const versions = issue.fields?.fixVersions || [];
  const s = issueSignals(issue, { now, settings, version: versions[0] });
  const riskPoints = s.signals.reduce((a, sig) => a + (CHECKS[sig.check].per || 5), 0);
  const level = riskPoints >= 12 ? 'HIGH' : riskPoints >= 5 ? 'MEDIUM' : 'LOW';
  return {
    ...s,
    level,
    riskPoints,
    release: versions[0]?.name || null,
    risks: s.signals.map((sig) => ({ label: CHECKS[sig.check].label, severity: CHECKS[sig.check].severity, detail: sig.detail })),
  };
}
