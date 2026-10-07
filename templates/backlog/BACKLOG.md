# {{project name}} — Backlog

Work cut from the blueprint at [{{blueprint path}}]({{blueprint path}}/README.md), in batches that
each leave something working end to end. Generated view — change a task file and regenerate, do
not edit this table. Updated {{YYYY-MM-DD}} · current batch **{{NN}}**.

## The loop

`/backlog next` → pick a task → work down its subtasks → `/backlog done T-NNN.n` after each →
`/backlog done T-NNN` when the acceptance criteria hold. `/backlog add` for anything the blueprint
did not foresee. `/backlog resync` when the blueprint changes.

## Batches

| # | Batch | Stage | Tasks | Done | In progress | Blocked | Detailed |
|---|-------|-------|-------|------|-------------|---------|----------|
| 01 | [{{slug}}](batches/01-{{slug}}.md) | MVP | {{n}} | {{n}} | {{n}} | {{n}} | yes |
| 02 | [{{slug}}](batches/02-{{slug}}.md) | MVP | {{n}} | | | | yes |
| 03 | [{{slug}}](batches/03-{{slug}}.md) | MVP | {{n}} (outline) | | | | no |

## Ready now

| Task | Title | Module | Platforms | Size | First subtask |
|------|-------|--------|-----------|------|---------------|
| [T-{{nnn}}](tasks/T-{{nnn}}-{{slug}}.md) | {{title}} | {{module}} | {{web}} | {{S/M}} | {{T-nnn.1 title}} |

## In progress

| Task | Title | Next subtask |
|------|-------|--------------|
| [T-{{nnn}}](tasks/T-{{nnn}}-{{slug}}.md) | {{title}} | {{T-nnn.k — title}} |

## Blocked by blueprint questions

Run `/blueprint decide` to close these; `/backlog resync` lifts the blocks.

| Question | Holds up | Batch |
|----------|----------|-------|
| {{Q-nnn}} — {{one line}} | {{T-nnn, T-nnn}} | {{NN}} |

## Legend

`P0` the batch does not work without it · `P1` MVP · `P2` next · `P3` later ·
`S/M/L` relative size by subtask count · `platforms` what the task is built on, per the platform
map in `PLANNING.md` · `source: planning` a foundation or cross-cutting task the
blueprint does not describe · `source: manual` added by the operator during the work.
