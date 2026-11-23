# GoNoGo: release confidence for Jira

**Can we ship?** GoNoGo answers that with a 0-100 confidence score, a GO / CAUTION / NO-GO verdict
and the exact Jira issues behind every risk, in Jira, in Rovo chat and in any MCP client
(Claude, Cursor and others).

Built on Atlassian Forge for **Codegeist 2026**, category *Apps for Software Teams*.

## What it does

| Surface | Module | What you get |
| --- | --- | --- |
| Jira project page | `jira:projectPage` (UI Kit) | Score, verdict, trend, risk table with evidence, next actions, "post report" button |
| Jira issue panel | `jira:issuePanel` (UI Kit) | Ship risk (LOW/MEDIUM/HIGH) for the issue you are looking at |
| Rovo agent | `rovo:agent` | *GoNoGo Release Captain*: "Is 2.4.0 ready to ship?", "What's blocking?", "Post the report on SHOP-100" |
| Rovo skill | `rovo:skill` | `release-go-no-go` playbook other agents can reuse |
| Actions | `action` x4 | `get-release-readiness`, `list-release-blockers`, `get-issue-ship-risk`, `post-go-no-go-report` |
| MCP server | `rovo:mcp` | The three read tools exposed to Rovo Studio and third-party MCP clients |
| Agent skill file | `agent-skills/gonogo-release-check/SKILL.md` | Drop into Claude Code / Cursor so your coding agent checks GoNoGo before tagging or deploying |

### How the score works

Start at 100, subtract capped penalties from real Jira signals (see
[`skills/release-go-no-go/references/scoring.md`](skills/release-go-no-go/references/scoring.md)):
open high-priority work, issues blocked by unfinished links, reopen churn (from the changelog),
stale in-progress work, unowned work, missing acceptance criteria, scope added after the version
start date, and a runway forecast (14-day throughput vs days to the release date).
Any high-priority or blocked issue caps the verdict at CAUTION. Each day's score is stored
(Forge KVS) so the page shows the trend toward GO.

No LLM calls are made by the app itself; Rovo does the language part for free, so the app costs
nothing to run. All Jira calls run `asUser()`, so users only ever see issues they can already see.

## Install (judges)

1. Open the installation link from the Devpost submission and pick your Jira Cloud site
   (Rovo must be enabled on the site for the agent and MCP parts).
2. Create or pick a project with a fix version that has issues in it. Optional: seed demo data with
   `JIRA_SITE=... JIRA_EMAIL=... JIRA_TOKEN=... PROJECT_KEY=SHOP node scripts/seed-demo.mjs`.
3. In the project sidebar open **Apps → GoNoGo Release Confidence**.
4. Open any issue in the release to see the **Ship risk** panel.
5. Open Rovo chat → Agents → **GoNoGo Release Captain** → "Is our next release ready to ship?"
6. MCP: in Rovo Studio add the **GoNoGo Release MCP** tools to a custom agent, or connect your MCP
   client to the Atlassian MCP server and enable them.

## Develop

```bash
npm install
npm test                 # 26 unit tests, no Atlassian account needed
npm run validate         # Forge manifest validator + client-side linters, offline
forge login              # needs a free Atlassian account + API token
forge register           # writes your real app id into manifest.yml
forge deploy && forge install --product jira
```

## Layout

```
manifest.yml                  Forge modules (UI, agent, skill, actions, MCP)
src/index.js                  UI resolvers + action handlers
src/lib/scoring.js            pure scoring engine (unit tested)
src/lib/service.js            orchestration shared by UI, agent and MCP
src/lib/jira.js               Jira REST v3 client (search/jql with pagination, versions, comments)
src/lib/adf.js                go/no-go report as an Atlassian Document Format comment
src/lib/history.js            daily confidence trend
src/frontend/*.jsx            UI Kit project page and issue panel
prompts/agent-prompt.txt      Rovo agent prompt
skills/release-go-no-go/      Rovo skill
agent-skills/                 SKILL.md for third-party agents using the MCP tools
scripts/seed-demo.mjs         demo data seeder
test/                         node:test unit tests
```

## License

MIT, see [LICENSE](LICENSE).
