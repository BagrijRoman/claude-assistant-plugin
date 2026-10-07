# Coverage

Every capability in the blueprint and the task(s) that deliver it. Generated view. A capability
with no task has a reason; a task with no capability is `source: planning` or `source: manual`
and is listed at the end. `resync` diffs this table against the blueprint.

Blueprint fingerprint: {{updated}} · {{n}} capabilities · {{n}} covered · {{n}} outline · {{n}} deferred · {{n}} gaps.

## Capabilities → tasks

Platform map (P-nnn): {{web → web · mobile → ios, android}}. A capability on several surfaces has a
task per platform; the Status column is per platform when they differ.

| Module | Sub-module | Capability | Surfaces | Stage | Task(s) | Status |
|--------|------------|------------|----------|-------|---------|--------|
| {{Accounts}} | {{Team}} | [{{Invite a team member}}]({{blueprint path}}/modules/accounts.md#capability-invite-a-team-member) | web | MVP | T-012 (core) · T-018 (rules & edge cases) | covered |
| {{Readings}} | {{Capture}} | {{Record a reading}} | web, mobile | MVP / next | web: T-021 · ios, android: T-? | web covered · mobile outline — batch 05 |
| | | {{…}} | web | MVP | T-? | planned — batch 03 |
| | | {{…}} | web | next | — | outline — batch 06 |
| | | {{…}} | web | MVP | — | deferred: {{reason, P-nnn}} |
| | | {{…}} | web | MVP | — | blueprint gap: {{one line, see PLANNING.md}} |

## Tasks without a capability

| Task | Type | Source | Why it exists |
|------|------|--------|---------------|
| T-{{nnn}} | foundation | planning | {{batch 1 cannot run without it: …}} |
| T-{{nnn}} | polish | manual | {{added by the operator on YYYY-MM-DD}} |
