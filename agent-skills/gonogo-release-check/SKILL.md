---
name: gonogo-release-check
description: Use the GoNoGo Release MCP tools (Atlassian Rovo MCP server) from Claude Code, Cursor or any MCP client to check whether a Jira release is ready to ship before you merge, tag or deploy.
license: MIT
---
# GoNoGo release check (for third-party agents)

Prerequisite: the GoNoGo Forge app is installed on your Atlassian site and your MCP client is connected
to the Atlassian MCP server with the "GoNoGo Release MCP" tools enabled.

When the user is about to tag, deploy or merge a release branch, or asks "is <version> ready?":

1. Call `get-release-readiness` with `projectKey` and `versionName` (for example the version in package.json or the git tag).
2. If `verdict` is `NO-GO`, stop and show the `report` field. Do not run the deploy or tag command unless the user overrides.
3. If `verdict` is `CAUTION`, show the risks and ask the user to confirm.
4. If `verdict` is `GO`, proceed and quote the score in the commit or release notes, e.g. `GoNoGo: GO 86/100`.
5. To dig into one issue mentioned in a commit message, call `get-issue-ship-risk` with its key.
