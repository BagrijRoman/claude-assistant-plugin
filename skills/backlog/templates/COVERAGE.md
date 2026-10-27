# Coverage

Every capability in the blueprint, by id, and the task(s) that deliver it. The capability rows come
from the blueprint's inventory and are written by `init` and `resync`; the *Task(s)* and *Status*
cells of covered rows and the count line are regenerated from the task files. A capability with no
task has a reason; a task with no capability is listed at the end. `resync` compares this table with
the blueprint.

Blueprint {{YYYY-MM-DDTHH:MM}} · {{n}} capabilities: {{n}} planned · {{n}} covered · {{n}} done · {{n}} outline · {{n}} list-only · {{n}} exists · {{n}} partly · {{n}} deferred · {{n}} gaps · {{n}} dropped

Platform map ({{P-nnn}}): {{web → web · mobile → web (the same responsive page)}}. A capability on
several platforms has a task per platform; its *Status* is per platform when they differ, and it is
counted once, under its least advanced platform.

## Capabilities → tasks

| Id | Capability | Module › Sub-module | Surfaces | Stage | R/E/S | Q | Task(s) | Status |
|----|------------|---------------------|----------|-------|-------|---|---------|--------|
| {{ACC-C03}} | [{{Invite a team member}}]({{blueprint path}}/modules/{{accounts}}.md) | {{ACC › Team}} | web | MVP | 4/3/2 | — | {{prefix}}-012 · {{prefix}}-018 | covered |
| {{DAT-C05}} | {{Record a reading}} | {{DAT › Capture}} | web, mobile | MVP / next | 3/2/0 | Q-004 | web: {{prefix}}-021 · mobile: {{prefix}}-040 | web covered · mobile outline — batch 05 |
| {{…}} | {{…}} | | web | MVP | | | {{prefix}}-031 | planned — batch 03 |
| {{…}} | {{…}} | | web | MVP | | | — | exists — {{backend}} |
| {{…}} | {{…}} | | web | later | —/—/— | | {{prefix}}-077 | list-only — batch 08 |
| {{…}} | {{…}} | | web | MVP | | | — | deferred: {{reason}} ({{P-nnn}}) |
| {{…}} | {{…}} | | web | MVP | | | — | blueprint gap: {{one line, see PLANNING.md}} |

*R/E/S* — the number of rules, edge cases and state transitions the capability had at the last sync.
*Q* — the open questions marked inside it.

## Statuses

- `planned — batch NN` — an outline row with an id, no task file yet
- `covered` — a task file exists; whether it is done lives in the task
- `done` — every task citing the capability is done
- `outline — batch NN` — a later-stage capability, title only
- `list-only — batch NN` — the blueprint's depth only lists it; detailed once the blueprint describes it in full
- `exists — <repo>` — already built; no task
- `partly — <repo>: <what is missing>` — partly built; a task for the missing part, until it is done
- `deferred: <reason> (P-nnn)` — the operator chose not to build it now; `partly deferred: <rule>
  (P-nnn)` when only a rule of it was dropped from its task (counted as covered or done)
- `blueprint gap: <line>` — too vague to cut; a row in `PLANNING.md` waits for the blueprint
- `dropped: <reason>` — retired in the blueprint, or its task dropped and nothing replaces it
- `<CODE> — L2 only (depth)` — one row for a module the depth leaves without capabilities (counted as
  list-only)

## Tasks without a capability

| Task | Type | Source | Why it exists |
|------|------|--------|---------------|
| {{prefix}}-{{nnn}} | foundation | planning | {{batch 1 cannot run without it: …}} |
| {{prefix}}-{{nnn}} | bug | manual | {{added by the operator on YYYY-MM-DD}} |
