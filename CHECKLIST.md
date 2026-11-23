# What Void needs to do (all free), with dates (IST)

Deadline: **23 Dec 2026, 1:30 AM IST** (22 Dec 12:00 PM Pacific). Aim to submit by 20 Dec.

| By | Step |
| --- | --- |
| 23-24 Nov | Join the hackathon on Devpost (codegeist2026.devpost.com → Join hackathon). |
| 23-24 Nov | Create a free Atlassian account and a free cloud developer site (developer.atlassian.com → "Get a free cloud developer site" / go.atlassian.com/cloud-dev) with Jira. Check that Rovo is on for the site. |
| 23-24 Nov | Create an API token at id.atlassian.com/manage-profile/security/api-tokens. |
| 25 Nov | On a computer with Node 22+: `npm install -g @forge/cli`, `forge login` (email + API token). |
| 25 Nov | In the repo folder: `npm install`, `forge register` (replaces the placeholder app id), `forge deploy`, `forge install --product jira --site <yoursite>.atlassian.net`. |
| 25-27 Nov | Seed demo data (`scripts/seed-demo.mjs`), open the page, test the agent and the MCP tools, and report bugs back so they can be fixed. Note: Rovo skill and MCP are Preview, so they may need tweaks when deployed. |
| 28 Nov-12 Dec | Polish and fixes (stretch: Teamwork Graph signals). Redeploy with `forge deploy`. |
| 13 Dec | `forge deploy -e production`, then in developer console → your app → Distribution → enable sharing and copy the **installation link**. Install it on a second site to test. |
| 14-16 Dec | Record the video from `demo-script.md` (under 5 min), upload to YouTube as **Public**. |
| 17 Dec | Create a public GitHub repo (AlienLost08/gonogo-forge) and push. |
| 18-20 Dec | Paste `submission.md` into Devpost, add the install link, video and repo, select category + both bonus prizes, and **Submit**. |

Rules to remember: one submission can win at most one main prize and one bonus prize. The video must be
public on YouTube, and the app must install from the installation link and work as shown.
