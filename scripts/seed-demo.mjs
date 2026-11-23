#!/usr/bin/env node
// Seeds a Jira Cloud project with a realistic "2.4.0" release so GoNoGo has something to score.
// Tip: record the demo at least one day after seeding, then add one new issue to 2.4.0 live on camera:
// it is created after the version start date, so GoNoGo flags it as scope creep.
// Usage (your own free dev site; nothing is sent anywhere else):
//   JIRA_SITE=https://you.atlassian.net JIRA_EMAIL=you@example.com JIRA_TOKEN=xxxx PROJECT_KEY=SHOP node scripts/seed-demo.mjs
const { JIRA_SITE, JIRA_EMAIL, JIRA_TOKEN, PROJECT_KEY } = process.env;
if (!JIRA_SITE || !JIRA_EMAIL || !JIRA_TOKEN || !PROJECT_KEY) {
  console.error('Set JIRA_SITE, JIRA_EMAIL, JIRA_TOKEN and PROJECT_KEY.');
  process.exit(1);
}
const auth = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64');
async function call(method, path, body) {
  const res = await fetch(JIRA_SITE.replace(/\/$/, '') + path, {
    method, headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}
const day = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const adf = (t) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });

const project = await call('GET', `/rest/api/3/project/${PROJECT_KEY}`);
const version = await call('POST', '/rest/api/3/version', { name: '2.4.0', projectId: Number(project.id), startDate: day(0), releaseDate: day(5) });
const types = Object.fromEntries((project.issueTypes || []).map((t) => [t.name.toLowerCase(), t.id]));
const typeId = (n) => types[n] || types.task || Object.values(types)[0];

const specs = [
  { summary: 'Checkout: Apple Pay button', type: 'story', priority: 'High', desc: 'Acceptance criteria: user can pay with Apple Pay on Safari.' },
  { summary: 'Payment webhook retries drop events', type: 'bug', priority: 'Highest', desc: 'Seen in prod logs.' },
  { summary: 'Order history pagination', type: 'story', priority: 'Medium', desc: 'Make it faster.' },
  { summary: 'Migrate receipts to new PDF service', type: 'task', priority: 'Medium', desc: 'Given an order When paid Then a PDF receipt is emailed.' },
  { summary: 'Coupon codes for Diwali sale', type: 'story', priority: 'Medium', desc: 'Marketing asked for this last week.' },
  { summary: 'Update privacy policy link in footer', type: 'task', priority: 'Low', desc: 'Acceptance criteria: link opens new policy.', done: true },
  { summary: 'Cart badge count off by one', type: 'bug', priority: 'Medium', desc: 'Repro on mobile.', done: true },
  { summary: 'Add order tracking email', type: 'story', priority: 'Medium', desc: 'Acceptance criteria: email sent on ship.', done: true },
];
const keys = [];
for (const s of specs) {
  const created = await call('POST', '/rest/api/3/issue', {
    fields: { project: { id: project.id }, summary: s.summary, issuetype: { id: typeId(s.type) }, description: adf(s.desc), fixVersions: [{ id: version.id }], priority: { name: s.priority } },
  }).catch(async () => call('POST', '/rest/api/3/issue', { fields: { project: { id: project.id }, summary: s.summary, issuetype: { id: typeId(s.type) }, description: adf(s.desc), fixVersions: [{ id: version.id }] } }));
  keys.push(created.key);
  if (s.done) {
    const { transitions } = await call('GET', `/rest/api/3/issue/${created.key}/transitions`);
    const done = transitions.find((t) => t.to?.statusCategory?.key === 'done');
    if (done) await call('POST', `/rest/api/3/issue/${created.key}/transitions`, { transition: { id: done.id } });
  }
  console.log('created', created.key, s.summary);
}
// "Migrate receipts" is blocked by the webhook bug.
await call('POST', '/rest/api/3/issueLink', { type: { name: 'Blocks' }, inwardIssue: { key: keys[1] }, outwardIssue: { key: keys[3] } }).catch((e) => console.warn('link skipped:', e.message));
console.log(`Done. Open the "GoNoGo Release Confidence" page in ${PROJECT_KEY} and score 2.4.0.`);
