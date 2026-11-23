// Input/context resolution shared by actions and UI. Never trust LLM inputs blindly.
const ISSUE_KEY = /^[A-Z][A-Z0-9_]{0,9}-\d+$/;
const PROJECT_KEY = /^[A-Z][A-Z0-9_]{0,9}$/;

export function resolveIssueKey(payload = {}) {
  const fromInput = String(payload.issueKey || '').trim().toUpperCase();
  if (ISSUE_KEY.test(fromInput)) return fromInput;
  const ctx = payload.context?.jira?.issueKey;
  if (ctx && ISSUE_KEY.test(String(ctx))) return String(ctx);
  return null;
}

export function resolveProjectKey(payload = {}) {
  const fromInput = String(payload.projectKey || '').trim().toUpperCase();
  if (PROJECT_KEY.test(fromInput)) return fromInput;
  const ctx = payload.context?.jira?.projectKey;
  if (ctx && PROJECT_KEY.test(String(ctx))) return String(ctx);
  const issueKey = resolveIssueKey(payload);
  if (issueKey) return issueKey.split('-')[0];
  return null;
}

/** Pick the version by name (case-insensitive), else the next unreleased one by release date. */
export function pickVersion(versions = [], name) {
  const live = versions.filter((v) => !v.archived);
  if (name) {
    const wanted = String(name).trim().toLowerCase();
    return live.find((v) => v.name.toLowerCase() === wanted)
      || live.find((v) => v.name.toLowerCase().includes(wanted))
      || null;
  }
  const unreleased = live.filter((v) => !v.released);
  unreleased.sort((a, b) => (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999'));
  return unreleased[0] || null;
}

export function jqlEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
