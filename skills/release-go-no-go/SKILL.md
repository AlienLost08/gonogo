---
name: release-go-no-go
description: Decide whether a Jira release (fix version) is ready to ship. Use when someone asks "can we ship", "is the release ready", "what blocks v2.4", or wants a go/no-go recommendation with evidence from Jira issues.
allowed-tools: get-release-readiness list-release-blockers get-issue-ship-risk
license: MIT
---
# Release go/no-go

Follow this playbook to give a defensible ship decision.

1. Call `get-release-readiness` for the release. If the user did not name a project or version, omit them; the tool uses the current project and the next unreleased version.
2. If the result has an `error` field, relay it and stop.
3. Read `verdict` and `score`:
   - `GO` (80+ and no hard blockers): say it is safe to ship and list any low-severity leftovers.
   - `CAUTION` (60-79, or 80+ with a blocker): say what must be fixed before shipping.
   - `NO-GO` (under 60): say it should not ship and give the fastest path back to GO.
4. If the verdict is not `GO`, call `list-release-blockers` and show every blocker with its owner.
5. For the single riskiest blocker, call `get-issue-ship-risk` and explain the fix in one sentence.
6. Finish with the `nextActions` from step 1, in order.

See `references/scoring.md` for how the score is calculated, so you can explain it when asked.
