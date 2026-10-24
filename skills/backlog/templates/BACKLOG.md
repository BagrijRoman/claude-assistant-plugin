# {{project name}} — Backlog

Work cut from the blueprint at [{{blueprint path}}]({{blueprint path}}/README.md), in batches that
each leave something working end to end. Generated view — change a task file and regenerate, do not
edit these tables. Updated {{YYYY-MM-DDTHH:MM}} · current batch **{{NN}}**.

## The loop

`/backlog next` → pick a task → work down its subtasks → `/backlog done T-NNN.n` after each; the last
one closes the task once its acceptance criteria hold (`/backlog done T-NNN` closes a task without
ticking every subtask). `/backlog add` for anything the blueprint did not foresee, `/backlog plan` to
move or drop things, `/backlog resync` when the blueprint changes.

## Batches

| # | Batch | Stage | Tasks | Done | In progress | Ready | Blocked | Dropped | Detailed | State |
|---|-------|-------|-------|------|-------------|-------|---------|---------|----------|-------|
| 01 | [{{slug}}](batches/01-{{slug}}.md) | MVP | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | {{n}} | yes | in progress |
| 02 | [{{slug}}](batches/02-{{slug}}.md) | MVP | {{n}} | 0 | 0 | {{n}} | {{n}} | 0 | yes | todo |
| 03 | [{{slug}}](batches/03-{{slug}}.md) | MVP | {{n}} (outline) |  |  |  |  |  | no | outline |

## Ready now

| Task | Title | Module | Platforms | Size | First subtask |
|------|-------|--------|-----------|------|---------------|
| [T-{{nnn}}](tasks/T-{{nnn}}-{{slug}}.md) | {{title}} | {{ORG}} | {{web}} | {{S/M}} | {{T-nnn.1 title}} |

## In progress

| Task | Title | Next subtask |
|------|-------|--------------|
| [T-{{nnn}}](tasks/T-{{nnn}}-{{slug}}.md) | {{title}} | {{T-nnn.k — title}} |

## Needs attention

Tasks flagged by `resync` or `add` (`review`), and what a hand edit left inconsistent.

| Task | Why |
|------|-----|
| [T-{{nnn}}](tasks/T-{{nnn}}-{{slug}}.md) | {{needs-review: ACC-C03's rules changed / needs-detail / a subtask is ticked but the task is todo}} |

## Blocked by blueprint questions

Run `/blueprint decide` to close these; `/backlog resync` lifts the blocks.

| Question | Holds up | Built on its provisional choice | Batch |
|----------|----------|---------------------------------|-------|
| {{Q-nnn}} — {{one line}} | {{T-nnn, T-nnn}} | {{T-nnn}} | {{NN}} |

## Blocked outside the blueprint

`/backlog plan unblock T-NNN` when the blocker is gone.

| Task | Waits for | Since |
|------|-----------|-------|
| [T-{{nnn}}](tasks/T-{{nnn}}-{{slug}}.md) | {{credentials for the payment sandbox}} | {{YYYY-MM-DD}} |

## Legend

`P0` the batch does not work without it · `P1` first stage (MVP or in scope) · `P2` next · `P3` later ·
`S/M/L` relative size by subtask count · `platforms` what the task is built on, per the platform map
in `PLANNING.md` · ready = not started, not blocked, every dependency done · `source: planning` a
foundation or cross-cutting task the blueprint does not describe · `source: manual` added by the
operator during the work.
