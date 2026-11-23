import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs } from '@forge/kvs';
import { createJiraClient } from './lib/jira.js';
import { releaseReadiness, issueShipRisk, UserError } from './lib/service.js';
import { toPlainReport } from './lib/scoring.js';
import { reportToAdf } from './lib/adf.js';
import { resolveIssueKey } from './lib/inputs.js';

// Act as the calling user so GoNoGo only ever sees issues that user can see.
const jira = () => createJiraClient((...args) => api.asUser().requestJira(...args), route);
const store = { get: (k) => kvs.get(k), set: (k, v) => kvs.set(k, v) };

function friendly(err) {
  if (err instanceof UserError) return { error: err.message };
  console.error(err);
  return { error: 'GoNoGo could not read Jira just now. Check the project and version, then try again.' };
}

// ---------- UI Kit resolvers ----------
const resolver = new Resolver();

resolver.define('getReadiness', async ({ payload, context }) => {
  try {
    const projectKey = payload.projectKey || context.extension?.project?.key;
    return await releaseReadiness({ jira: jira(), store, payload: { ...payload, projectKey } });
  } catch (e) {
    return friendly(e);
  }
});

resolver.define('getIssueRisk', async ({ context }) => {
  try {
    return await issueShipRisk({ jira: jira(), payload: { issueKey: context.extension?.issue?.key } });
  } catch (e) {
    return friendly(e);
  }
});

resolver.define('postReport', async ({ payload, context }) => {
  try {
    const projectKey = payload.projectKey || context.extension?.project?.key;
    const result = await releaseReadiness({ jira: jira(), store, payload: { ...payload, projectKey } });
    await jira().addComment(payload.issueKey, reportToAdf(result));
    return { ok: true, verdict: result.verdict, score: result.score };
  } catch (e) {
    return friendly(e);
  }
});

export const uiHandler = resolver.getDefinitions();

// ---------- Rovo actions (also exposed as MCP tools) ----------
export async function getReleaseReadiness(payload) {
  try {
    const r = await releaseReadiness({ jira: jira(), store, payload });
    return { report: toPlainReport(r), verdict: r.verdict, score: r.score, version: r.version, totals: r.totals, forecast: r.forecast, checks: r.checks, nextActions: r.nextActions };
  } catch (e) {
    return friendly(e);
  }
}

export async function listReleaseBlockers(payload) {
  try {
    const r = await releaseReadiness({ jira: jira(), store, payload });
    return {
      version: r.version?.name,
      verdict: r.verdict,
      blockerCount: r.blockers.length,
      blockers: r.blockers.map((b) => ({ key: b.key, summary: b.summary, status: b.status, priority: b.priority, assignee: b.assignee, why: b.signals.map((s) => s.detail) })),
    };
  } catch (e) {
    return friendly(e);
  }
}

export async function getIssueShipRisk(payload) {
  try {
    return await issueShipRisk({ jira: jira(), payload });
  } catch (e) {
    return friendly(e);
  }
}

export async function postGoNoGoReport(payload) {
  try {
    const issueKey = resolveIssueKey(payload);
    if (!issueKey) throw new UserError('Tell me which issue to post the report on, for example the release ticket "SHOP-100".');
    const r = await releaseReadiness({ jira: jira(), store, payload });
    await jira().addComment(issueKey, reportToAdf(r));
    return `Posted the ${r.verdict} report (confidence ${r.score}/100) for ${r.version?.name} on ${issueKey}.`;
  } catch (e) {
    return friendly(e);
  }
}
