# Devpost submission draft: GoNoGo

> Fill the `[[...]]` placeholders before submitting. Everything else can be pasted as is.

**Project name:** GoNoGo: release confidence for Jira

**Tagline (elevator pitch):** Ask "can we ship?" and get a 0-100 confidence score, a GO / CAUTION / NO-GO verdict and the exact Jira issues behind every risk, in Jira, in Rovo chat, or from your coding agent over MCP.

**Category:** Apps for Software Teams

**Bonus prizes:** Best Agents (Rovo/Assignable agents) and Best app with Atlassian MCP

**Installation link:** [[paste the link from developer.atlassian.com → your app → Distribution]]

**Demo video (YouTube, public, under 5 min):** [[YouTube link]]

**Source code:** [[https://github.com/AlienLost08/gonogo-forge]]

---

## Inspiration
Every release I have watched ends with the same meeting: someone shares a Jira filter, everyone scrolls,
and the decision is made on gut feel. The context needed to decide already lives in Jira (priorities,
blocking links, reopen history, who owns what, when scope was added, how fast the team actually closes
work), but nobody has time to read it all before the deadline. Codegeist's theme is "build with context,
ship with confidence", so I built the thing that turns that context into a ship decision.

## What it does
GoNoGo scores a Jira release (fix version) from 0 to 100 and gives a verdict:

- 🟢 **GO**: 80+ and nothing high-priority or blocked
- 🟡 **CAUTION**: 60-79, or any open high-priority / blocked issue
- 🔴 **NO-GO**: under 60

Every point lost is explained with evidence (issue keys), and the app tells you what to do next.
Signals it reads from Jira:

1. Open high-priority work (Highest / High / Blocker / Critical)
2. Issues blocked by unfinished linked issues
3. Reopen churn, read from each issue's changelog
4. In-progress work with no update for more than 5 days
5. Open work with no owner
6. Stories and tasks without acceptance criteria (text, checklists or Given/When/Then)
7. Scope creep: issues created after the version's start date
8. Runway: remaining work vs the team's real 14-day throughput and days left to the release date

It's available in five places:
- A **Jira project page** with the score, a daily trend ("52 → 67 → 81"), a table of risks with evidence, next actions, and a button that posts a go/no-go record on the release ticket.
- A **Jira issue panel** showing the ship risk of the issue you are viewing.
- **GoNoGo Release Captain**, a **Rovo agent**: "Is 2.4.0 ready to ship?", "What's blocking?", "Post the report on SHOP-100".
- A reusable **Rovo skill** (`release-go-no-go`) that any agent can load, backed by the app's actions.
- An **MCP server** (`rovo:mcp`) exposing the read tools to Rovo Studio custom agents and third-party MCP clients, plus an open-source `SKILL.md` so Claude Code or Cursor checks GoNoGo before you tag or deploy.

## How we built it
- **Forge** app (Node.js 24 runtime) with `jira:projectPage` and `jira:issuePanel` in **UI Kit**, `rovo:agent`, `rovo:skill`, four `action` modules and `rovo:mcp`.
- Jira REST v3: `search/jql` with token pagination and `expand=changelog`, `search/approximate-count` for throughput, project versions, and comments in Atlassian Document Format.
- **Forge KVS** stores one score per release per day for the trend.
- All Jira calls run `asUser()`, so the app never shows anything the user can't already see.
- The scoring engine is pure JavaScript with 26 unit tests (`node --test`). The app makes **no LLM calls of its own**; Rovo handles language, so it costs nothing to run.
- One service layer feeds the UI, the agent and the MCP tools, so all three always give the same answer.

## How it meets the main technology requirement
It's a Forge app (`manifest.yml` with Forge modules) integrated with **Jira** (project page, issue panel, REST APIs) and **Rovo** (`rovo:agent`, `rovo:skill`, `action`, `rovo:mcp`). It installs through a Forge installation link.

## Bonus prize write-ups
**Best Agents:** `rovo:agent` "GoNoGo Release Captain" with four actions (three GET, one CREATE that only runs when the user explicitly asks to post), plus the reusable `rovo:skill` `release-go-no-go` declaring its tool dependencies, so other agents can invoke the same playbook. The agent prompt forbids inventing data and relays action errors honestly. GET actions also work in Automation (for example "every morning, ask the Release Captain for the go/no-go and post it in the release ticket").

**Best app with Atlassian MCP:** the `rovo:mcp` module "GoNoGo Release MCP" exposes `get-release-readiness`, `list-release-blockers` and `get-issue-ship-risk` as tools. The repo ships an open-source `agent-skills/gonogo-release-check/SKILL.md` that tells third-party coding agents to check the verdict before running a deploy or tag, so the release gate follows the developer into their editor.

## Challenges we ran into
- Making the score **explainable**: every penalty is capped and tied to issue keys, so a team can argue with the evidence instead of the number.
- Inputs from an LLM can be wrong, so issue and project keys are validated with a regex and fall back to the deterministic Jira context Rovo passes in.
- Jira's new `search/jql` endpoint uses token pagination, so the client pages with `nextPageToken` and caps results to keep within action payload limits.

## Accomplishments that we're proud of
One engine, three surfaces (Jira UI, Rovo agent, MCP) that always agree. It runs at zero cost, and the logic is fully unit tested.

## What we learned
Rovo skills and MCP tools make a Forge app's actions reusable far beyond its own UI. The best agent experience comes from deterministic tools that return evidence, with the LLM doing the explaining.

## What's next for GoNoGo
- Teamwork Graph: pull linked Confluence decisions, deployments and pull requests into the score.
- Bitbucket / deployment signals (failing pipelines on release branches).
- Per-project weight settings, and a Marketplace listing.

## Testing instructions for judges
1. Install with the installation link on a Jira Cloud site with Rovo enabled.
2. Use any project with an unreleased fix version that has issues, or run `scripts/seed-demo.mjs` (see README) to create a realistic "2.4.0" release.
3. Project sidebar → **Apps → GoNoGo Release Confidence**. Switch releases with the selector, click **Re-score**, and type an issue key and click **Post report** to add a go/no-go comment.
4. Open any issue in the release and look for the **Ship risk** panel.
5. Rovo chat → **GoNoGo Release Captain** → "Is our next release ready to ship?" then "What's blocking it?"
6. Rovo Studio → create an agent → add tools from **GoNoGo Release MCP**.

## Built with
forge, jira, rovo, rovo-mcp, ui-kit, javascript, node.js, react, atlassian-document-format
