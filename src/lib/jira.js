// Thin Jira REST client. `request` is injected (api.asUser().requestJira or a test double).
import { jqlEscape } from './inputs.js';

const FIELDS = ['summary', 'status', 'priority', 'issuetype', 'assignee', 'updated', 'created', 'issuelinks', 'description', 'fixVersions'];

async function json(res, what) {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Jira ${what} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

export function createJiraClient(request, route) {
  return {
    async getVersions(projectKey) {
      const res = await request(route`/rest/api/3/project/${projectKey}/versions`);
      return json(res, 'versions');
    },
    async searchAll(jql, { max = 300 } = {}) {
      const issues = [];
      let nextPageToken;
      do {
        const res = await request(route`/rest/api/3/search/jql`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ jql, fields: FIELDS, expand: 'changelog', maxResults: 100, nextPageToken }),
        });
        const page = await json(res, 'search');
        issues.push(...(page.issues || []));
        nextPageToken = page.nextPageToken;
      } while (nextPageToken && issues.length < max);
      return issues.slice(0, max);
    },
    async countResolved(projectKey, days) {
      const res = await request(route`/rest/api/3/search/approximate-count`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql: `project = "${jqlEscape(projectKey)}" AND statusCategory = Done AND resolved >= -${Number(days)}d` }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.count === 'number' ? data.count : null;
    },
    async getIssue(issueKey) {
      const res = await request(route`/rest/api/3/issue/${issueKey}?fields=${FIELDS.join(',')}&expand=changelog`);
      return json(res, 'issue');
    },
    async addComment(issueKey, adfBody) {
      const res = await request(route`/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: adfBody }),
      });
      return json(res, 'comment');
    },
  };
}

export function versionJql(projectKey, version) {
  return `project = "${jqlEscape(projectKey)}" AND fixVersion = ${version.id} ORDER BY priority DESC, updated ASC`;
}
