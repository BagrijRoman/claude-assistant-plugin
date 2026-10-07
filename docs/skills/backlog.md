# backlog

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/backlog [init [dir] \| status \| next \| detail <batch> \| done <id> \| add \| resync]` | a human only (`disable-model-invocation`) | none yet — see [The script](#the-script) | 0.8.0 |

Files: [skills/backlog/SKILL.md](../../skills/backlog/SKILL.md) (the entry point),
[skills/backlog/references/slicing.md](../../skills/backlog/references/slicing.md) (how a
blueprint is cut), [skills/backlog/references/modes.md](../../skills/backlog/references/modes.md)
(the procedure per mode), [templates/backlog/](../../templates/backlog/).

## Why

A blueprint (see [blueprint](blueprint.md)) says what the product does. It does not say what to
build first, how much of it, or how to know a piece is finished — and a developer, or a developer
with an agent, needs exactly that: a list to work down, in portions after each of which something
new works end to end.

Cutting a blueprint into such a list is a procedure with its own forks (how big a portion, where
the cross-cutting concerns go, whether a fat capability splits) and its own failure modes (the
horizontal cut — "all the data first, all the screens later" — that produces nothing usable for
weeks). The skill encodes the rules that avoid them, asks the operator at the forks, and then keeps
the list true while the work happens: next task, mark done, add what the blueprint did not foresee,
resync when the blueprint changes. It reads the blueprint and never writes it, so the two never
disagree about the product.

## What it does

### Modes

`$ARGUMENTS` picks the mode; with no argument the skill shows where the backlog stands (`status`
followed by what `next` would show), or starts one when the project has none.

| Argument | Effect |
|----------|--------|
| *(none)* | `status` + `next` when a backlog exists, `init` when none does |
| `init [dir]` | find the blueprint, choose the folder, agree the slicing strategy, outline every batch, detail the first two |
| `status` | progress per batch, tasks in progress with their next subtask, tasks blocked by which blueprint question; change nothing |
| `next` | tasks ready to start now (dependencies done, nothing blocking) and the next subtask of anything in progress |
| `detail <batch>` | write the tasks of one outlined batch out in full |
| `done <id>` | mark a task (`T-012`) or subtask (`T-012.3`) done, record a note, show what it unblocked |
| `add` | add a task the blueprint did not produce: a bug, a chore, a thing learned while building |
| `resync` | diff the blueprint against the backlog; propose additions, drops, re-details and unblocks |

### Input and output folder

`init` needs a blueprint whose `STATE.json` has the `capabilities` phase approved; if the adequacy
review is not approved it warns and asks whether to continue. The output folder defaults to
`docs/backlog/`, proposed in a dialog as the recommended option with alternatives; any path may be
typed; a non-empty folder is never used without confirmation.

```
docs/backlog/
├── STATE.json             blueprint path and fingerprint, strategy, batch list, current batch
├── BACKLOG.md             overview: progress per batch, ready now, in progress, blocked by which Q-
├── PLANNING.md            P-NNN slicing decisions; feedback to the blueprint; resync reports
├── COVERAGE.md            every blueprint capability → its task(s), or the reason there is none
├── batches/NN-<slug>.md   goal, "what works after this batch", the tasks in order
└── tasks/T-NNN-<slug>.md  one task: frontmatter + scope, subtasks, acceptance criteria, how to verify
```

### The three units

| Unit | Id | Size | Done means |
|------|----|------|------------|
| Batch | `01`, `02`… | a few tasks; after it something new works end to end | every task done and the *What works after this batch* paragraph is true |
| Task | `T-012` | one reviewable change, the size of one pull request | every subtask done and every acceptance criterion holds |
| Subtask | `T-012.3` | one sitting of work, one commit | its one-line *done when* holds |

### How it cuts

- **Batches are vertical.** Batch 1 is the thinnest end-to-end version of one main flow from the
  architecture, plus only the foundation tasks it cannot run without (a *walking skeleton*). The
  next batches *widen* — the rules and edge cases of batch-1 capabilities — before they *broaden*
  to the next flow. Non-MVP stages become outline-only batches at the end. No task depends on a
  task in a later batch.
- **Tasks come from capabilities**, one to one by default. A capability with many rules splits
  into a core-path task and a rules-and-edge-cases task; several small capabilities on one entity
  merge into one task; a *System:* behaviour is its own task; a capability spanning two modules
  gets a task per side. A capability that carries an open blueprint question still becomes a task,
  but `blocked`.
- **Subtasks are the executable list**: 2–8 per task, in execution order, thinnest path first,
  then rules, then edge cases as their own subtasks; each with a one-line *done when* about the
  running product. Nine or more means the task is `L` and splits. They name slices of work in
  product terms — "record an invitation with an expiry", not "add a model and a migration".
- **Acceptance criteria** are the *done when* of every subtask, plus the cross-cutting criteria
  that apply, plus the non-functional requirements the task could violate. *How to verify* is
  three to five lines a reviewer who did not do the task can follow.
- **Priority** follows the roadmap stage of the module (`P1` MVP, `P2` next, `P3` later), with
  `P0` for what a batch does not work without. **Size** is `S`/`M`/`L` by subtask count — never
  hours.
- **Detailing is lazy.** `init` outlines every batch but details only the first two; `detail`
  does the next one when it comes into view, because after batch 1 is built the team knows more.

### Surfaces become platforms

The blueprint says on which surfaces a capability lives; the backlog says on which platforms it is
built — `web`, `ios`, `android`, a cross-platform `mobile`, or `web` again when "mobile" is the
same responsive page. The mapping is a strategy decision at `init`, taken from the constraints the
brief lists per surface (store distribution, offline, device features) and recorded as a `P-`
record, together with the platform order: one platform through its MVP flows first, or both from
batch 1 when the first flow itself crosses surfaces. Every task carries `platforms:`; a capability
on surfaces with different platforms becomes a task per platform, on surfaces that share one a
single task with per-surface subtasks. Foundation skeletons are per platform and arrive with that
platform's first flow. A platform is not a repository: a `web` task may touch the backend and the
frontend. `resync` notices when a capability's surfaces change and proposes the task to add or
drop.

### The task file

Frontmatter holds the data other tools read (`id`, `module`, `type`, `priority`, `size`, `batch`,
`status`, `depends`, `blocked_by`, `refs`, `capabilities`, `source`); the body holds *What the
user gets*, *In scope*, *Out of scope → goes to* (so two tasks never both assume the other handles
a rule), *Subtasks* as a checklist with ids, *Acceptance criteria*, *How to verify*, *Notes*.
`source` is `blueprint` for a capability, `planning` for a foundation or cross-cutting task the
skill derived, `manual` for one the operator added.

### Keeping it true

`done` is the only way a status becomes `done`; it checks subtasks and acceptance criteria, lists
the tasks that became ready, and when a batch completes suggests checking its *what works*
paragraph and detailing the next batch. `resync` re-reads the blueprint's capabilities, decisions
and questions, compares them with `COVERAGE.md` and the stored fingerprint, and proposes — never
applies silently — new tasks, drops, re-details and unblocks. Holes the slicing finds in the
blueprint go to `PLANNING.md › Feedback to the blueprint` and to the operator, who fixes them with
`/blueprint decide` or `/blueprint module <name>`.

## What it will not do

- Edit the blueprint.
- Invent capabilities: behaviour the blueprint does not describe is a blueprint gap, not a task
  (except `manual` tasks the operator adds knowingly).
- Prescribe implementation: no files, classes, libraries, schemas or endpoints in a task or
  subtask.
- Estimate hours.
- Mark anything done on its own, detail far-ahead batches, or reorder batches silently.
- Write anything but English inside the backlog folder.

## The script

None yet. The mechanical parts the skill currently does by hand — scaffolding, the next `T-`/`P-`
id, regenerating the views (`BACKLOG.md`, `COVERAGE.md`, the task tables in `batches/*.md`) from
the task files' frontmatter and checklists, ticking a subtask, validating that `depends` has no
cycles and no forward-batch edges — are exactly what `bin/backlog.mjs` should take over once the
procedure has been run on a real project (task T18 in [TASKS.md](../TASKS.md)). The views are the
first candidate: regenerating three tables by hand after every `done` is where a model is slowest
and least reliable.

## Limitations

- **Guidance, not enforcement.** Until the script exists, a wrong id or a stale view is possible;
  the operator should glance at `BACKLOG.md` after `done`.
- **The views are only as fresh as the last regeneration.** Editing a task file by hand is
  welcome, but the tables do not follow until the next mode runs.
- **Vertical slicing is a judgement.** The rules steer it; a blueprint with weak main flows gives
  the skill little to slice along, and the batch-1 paragraph will show it.
- **Subtasks in product terms** leave the technical breakdown to whoever picks the task up; a
  task is an input to that work, not a substitute for it.
- **One blueprint per backlog.** A product described by several blueprints is not supported.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows.
- Script tests arrive with the script.
