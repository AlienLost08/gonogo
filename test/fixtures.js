export const NOW = new Date('2026-12-10T12:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * 86400000).toISOString();
const status = (name, key) => ({ name, statusCategory: { key } });
const adf = (t) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });

export function issue(key, o = {}) {
  return {
    key,
    fields: {
      summary: o.summary || `Issue ${key}`,
      status: o.status || status('Done', 'done'),
      priority: { name: o.priority || 'Medium' },
      issuetype: { name: o.type || 'Story' },
      assignee: o.assignee === null ? null : { displayName: o.assignee || 'Kabir' },
      updated: o.updated || daysAgo(1),
      created: o.created || '2026-11-20T10:00:00.000+0000',
      issuelinks: o.links || [],
      description: o.description === undefined ? adf('Acceptance criteria: works') : o.description,
    },
    changelog: { histories: o.histories || [] },
  };
}

export const S = { done: status('Done', 'done'), todo: status('To Do', 'new'), wip: status('In Progress', 'indeterminate'), review: status('In Review', 'indeterminate') };
export const VERSION = { id: '10001', name: '2.4.0', startDate: '2026-11-25', releaseDate: '2026-12-15', released: false };
export { daysAgo, adf };
