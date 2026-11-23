# How GoNoGo scores a release

Start at 100 and subtract penalties (each capped):

| Check | Per issue | Cap | Severity |
| --- | --- | --- | --- |
| Open high-priority work (Highest/High/Blocker/Critical) | 12 | 36 | high |
| Blocked by an unfinished linked issue | 8 | 24 | high |
| Reopened after done | 4 | 12 | medium |
| In progress with no update for more than 5 days | 4 | 16 | medium |
| Open issue with no assignee | 3 | 12 | medium |
| Story/task without acceptance criteria | 2 | 10 | low |
| Scope added after the version start date | share x 30 | 15 | medium |
| Remaining work exceeds runway (14-day throughput vs days to release date) | scaled | 20 | high |

Verdict: GO at 80+ with no high-priority or blocked-link issues; CAUTION at 60+; otherwise NO-GO.
