# GoNoGo demo video script (target 3:30, hard limit under 5:00)

Record at 1080p. Use a free screen recorder (OBS Studio). Upload to YouTube as **Public**.
No copyrighted music; silence or YouTube Audio Library tracks only. Speak slowly; English.
Setup: run `scripts/seed-demo.mjs` at least a day before recording (see its header), so that adding an
issue on camera counts as scope creep.

| Time | Screen | Voice-over |
| --- | --- | --- |
| 0:00-0:20 | Title card "GoNoGo: can we ship?" then a long Jira filter being scrolled | "Every release ends with the same meeting: scroll a Jira filter, argue, decide on gut feel. The answer is already in Jira. GoNoGo reads it for you." |
| 0:20-0:50 | Project sidebar → Apps → GoNoGo Release Confidence. Release 2.4.0 shows 🔴 NO-GO with a score | "This is release 2.4.0. GoNoGo gives it a confidence score out of 100 and a verdict. Right now it's NO-GO, and it shows why." |
| 0:50-1:30 | Hover over the risk table: high-priority bug, blocked link, missing acceptance criteria, runway | "Every point lost comes with evidence. The payment webhook bug is Highest priority and still open. The receipts migration is blocked by it. Two stories have no acceptance criteria. And at our real pace of the last 14 days, we need more days than we have left." |
| 1:30-1:50 | "Do this next" box | "It tells you what to do next, in order." |
| 1:50-2:15 | Create a new issue in 2.4.0 live, click Re-score: the scope-creep row appears | "Watch what happens when marketing sneaks in one more story. GoNoGo flags it as scope creep, added after the release started." |
| 2:15-2:35 | Open the webhook bug → Ship risk panel shows HIGH | "On every issue, the Ship risk panel shows how much this one ticket threatens the release." |
| 2:35-3:05 | Rovo chat → GoNoGo Release Captain → "Is 2.4.0 ready to ship?" → "What's blocking it?" | "In Rovo chat, my GoNoGo Release Captain agent answers with the same numbers, because it calls the same actions. No made-up data." |
| 3:05-3:15 | "Post the report on SHOP-100" → show the comment | "And it can leave a written go/no-go record on the release ticket." |
| 3:15-3:40 | Rovo Studio: custom agent with GoNoGo Release MCP tools; then Cursor/Claude with the SKILL.md checking before a deploy | "The same tools are an MCP server. Add them to any Rovo Studio agent, or to your coding agent with the included SKILL.md, so it checks GoNoGo before you tag a release." |
| 3:40-4:00 | Fix the bug (mark Done), Re-score: trend rises, verdict moves toward GO | "Close the blocker, re-score, and the trend climbs. That's shipping with confidence." |
| 4:00-4:15 | End card: GoNoGo · Forge · Jira · Rovo agent · Rovo skill · MCP · github link | "GoNoGo, built on Forge for Codegeist 2026. Thanks for watching." |

Checklist before upload: show the app actually running (not slides), say both bonus prizes by name,
keep it under 5:00, set the video to Public, and paste the link in Devpost.
