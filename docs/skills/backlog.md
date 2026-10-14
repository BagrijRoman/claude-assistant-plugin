# backlog

| Command | Invoked by | Script | Since |
|---------|------------|--------|-------|
| `/backlog [init [dir] \| continue \| status \| next \| detail <batch> \| done <id> [note] \| add [text] \| plan <action> \| resync]` | a human only (`disable-model-invocation`) | none of its own yet — see [The script](#the-script); reads the blueprint's with `changed` | 0.8.0 |

Files: [skills/backlog/SKILL.md](../../skills/backlog/SKILL.md) (the entry point),
[skills/backlog/references/mechanics.md](../../skills/backlog/references/mechanics.md) (state, ids,
statuses, views, gates, questions, subagents),
[skills/backlog/references/slicing.md](../../skills/backlog/references/slicing.md) (how a blueprint is
cut), [skills/backlog/references/modes.md](../../skills/backlog/references/modes.md) (the procedure per
mode), [skills/backlog/templates/](../../skills/backlog/templates/).

## Why

A blueprint (see [blueprint](blueprint.md)) says what the product does. It does not say what to
build first, how much of it, or how to know a piece is finished — and a developer, or a developer
with an agent, needs exactly that: a list to work down, in portions after each of which something
new works end to end.

Cutting a blueprint into such a list is a procedure with its own forks (how big a portion, which flow
comes first, where the cross-cutting concerns go, whether a fat capability splits, whether an open
question blocks a task) and its own failure modes (the horizontal cut — "all the data first, all the
screens later" — that produces nothing usable for weeks). The skill encodes the rules that avoid them,
asks the operator at the forks, and then keeps the list true while the work happens: next task, mark
done, add what the blueprint did not foresee, re-plan, resync when the blueprint changes. It reads the
blueprint and never writes it, so the two never disagree about the product.

## What it does

### Modes

`$ARGUMENTS` picks the mode; with no argument the skill resumes an unfinished mode, or shows where the
backlog stands (`status` followed by what `next` would show, written nowhere), or starts one when the
project has none.

| Argument | Effect |
|----------|--------|
| *(none)* | `continue` when a mode is pending, `status` + `next` when a backlog exists, `init` when none does |
| `init [dir]` | find the blueprint, choose the folder, see what the code already does, agree the slicing strategy, outline and number every batch, detail the first two |
| `continue` | resume the mode and step recorded in `STATE.json.pending` after a *Stop here* or a lost session |
| `status` | progress per batch, tasks in progress with their next subtask, ready, blocked by which question, whether the blueprint moved; change nothing |
| `next` | tasks ready to start now and the next subtask of anything in progress; when only blocked tasks are left, what they wait for and ready tasks of the next detailed batch; writes nothing but the closing of a complete batch |
| `detail <batch>` | write the tasks of one outlined batch out in full |
| `done <id> [note]` | mark a subtask (`T-012.3`) or task (`T-012`) done, record a note or a pull request, show what it unblocked; close the batch with the operator when it is complete |
| `add [text]` | add a task the blueprint did not produce: a bug, a chore, a spike, a refinement |
| `plan <action>` | re-plan: `move` or `drop` a task, `order` a batch, `batch new / move / rename`, `current`, `unblock` an outside blocker |
| `resync` | compare the blueprint (its changelog, capabilities, stages, modules, questions) with the backlog; propose additions, moves, re-details, follow-ups, blocks, unblocks and drops |

### Input and output folder

`init` needs a blueprint whose `STATE.json` has the `capabilities` phase approved; a blueprint that is
done is better — its reviews have run and it keeps a `CHANGELOG.md` for `resync`. The output folder
defaults to the blueprint's sibling (`docs/backlog/`), checked for version control: when the project
root is not a repository but holds repositories, the recommendation moves into the one that holds the
blueprint (`initialDocs/backlog/` on a root of `backend/`, `frontend/`, `initialDocs/`). Any path may
be typed; a non-empty folder is never used without confirmation. The blueprint's path is stored
relative to the backlog folder. Whatever folder is chosen, it is the skill's working folder, and
writes stay in it: nothing is created outside it, not even for a moment — not in the project root,
`docs/` above it, the blueprint, `/tmp` or the session's scratchpad.

```
docs/backlog/
├── STATE.json             blueprint path and fingerprint, repositories, strategy, last task id, batches, pending mode
├── BACKLOG.md             overview: progress per batch, ready now, in progress, needs attention, blocked by what
├── PLANNING.md            P-NNN slicing decisions; standing criteria; feedback to the blueprint; resync reports
├── COVERAGE.md            every blueprint capability id → its task(s), or the reason there is none
├── batches/NN-<slug>.md   goal, "what works after this batch", flow → capabilities, the task rows in order
└── tasks/T-NNN-<slug>.md  one task: frontmatter + scope, subtasks, acceptance criteria, how to verify
```

### The three units

| Unit | Id | Size | Done means |
|------|----|------|------------|
| Batch | `01`, `02`… | a few tasks; after it something new works end to end | every task done or dropped, and the operator confirmed the *What works after this batch* paragraph |
| Task | `T-012` | one reviewable change — one pull request per repository it touches | every subtask closed and every acceptance criterion holds |
| Subtask | `T-012.3` | one sitting of work, one commit | its one-line *done when* holds |

### How it cuts

- **What it reads.** Capabilities by their ids (`ORG-C03`) from the module files the blueprint's
  `STATE.json` lists, with their surfaces, own stage, rules, edge cases, states, access row and open
  questions; the brief's surfaces, goals, non-functional requirements and *Decided outside this
  blueprint*; the architecture's flows, domain model and roles.
- **Stages.** A capability's effective stage is its own *Stage* line, else its module's roadmap row for
  that surface; "MVP" and "in scope" are both the first stage, and a roadmap that says *in scope* gets a
  *first release* question. A capability the blueprint's depth only lists becomes an outline row that
  waits for the blueprint to describe it in full — never a "blueprint gap".
- **What exists already.** At `init` the operator names the repositories that hold the product's code;
  a read-only agent per repository reports which capabilities are built, and those get no task.
- **Batches are vertical.** Batch 1 is the thinnest end-to-end version of one main flow from the
  architecture, plus only the foundation it cannot run without (a *walking skeleton*); the batch size
  applies from batch 2. The next batches *widen* — the rules, edge cases and transitions of what is
  built — before they *broaden* to the next flow. Later stages become outline batches at the end. No
  task depends on a task in a later batch. A batch that cuts a flow records which capability delivers
  each step.
- **Tasks come from capabilities**, one to one by default; a thin batch takes a capability's core path
  and leaves its rules to the widening batch; a capability with many rules splits; small capabilities
  on one entity merge; a *System:* behaviour is its own task; a capability spanning two modules gets a
  task per side; one on several platforms, a task per platform. An open question blocks a task only
  when its core path depends on it — otherwise the task is built on the question's provisional choice.
  Foundation tasks also carry technical work a decision mandates and operational requirements;
  cross-cutting concerns arrive with the first batch that touches them.
- **Subtasks are the executable list**: 2–8 per task, in execution order, thinnest path first, then
  rules, edge cases and transitions as their own subtasks; each with a one-line *done when* about the
  running product. They name slices of work in product terms — "record an invitation with an
  expiry", not "add a model and a migration".
- **Acceptance criteria** are the *done when* of every subtask, plus the capability's access row
  (who may not), the standing criteria of the cross-cutting concerns, and the non-functional
  requirements (`N-`) the task could violate. *How to verify* is three to five lines a reviewer who did
  not do the task can follow.
- **Priority** follows the effective stage (`P1` first stage, `P2` next, `P3` later), with `P0` for
  what a batch does not work without. **Size** is `S`/`M`/`L` by subtask count — never hours.
- **Task types**: `feature`, `foundation`, `cross-cutting`, `bug`, `chore`, `spike`, `polish`, each with
  its own meaning of done.
- **Detailing is lazy.** `init` outlines and numbers every batch but details only the first two;
  `detail` does the next one when it comes into view, because after batch 1 is built the team knows
  more.

### Surfaces become platforms

The blueprint says on which surfaces a capability lives; the backlog says on which platforms it is
built — `web`, `ios`, `android`, a cross-platform `mobile`, or `web` again when "mobile" is the same
responsive page. The mapping is a strategy decision at `init`, taken from the constraints the brief
lists per surface (store distribution, offline, device features a browser cannot reach) — or simply
recorded when the brief's *Decided outside this blueprint* already settles it — together with the
platform order. Every task carries exactly one platform; a capability on surfaces with different
platforms becomes a task per platform, on surfaces that share one a single task with per-surface
subtasks. Foundation skeletons are per platform and arrive with that platform's first flow. A platform
is not a repository: a `web` task may touch the backend and the frontend.

### The task file

Frontmatter holds the data other tools read (`id`, `title`, `module` (the module code), `submodule`,
`capabilities` (capability ids), `source_items`, `platforms`, `type`, `priority`, `size`, `batch`,
`status`, `depends`, `blocked_by`, `review`, `refs`, `source`); the body holds *What the user gets*
with a *Delivers* link per capability, *In scope*, *Out of scope → goes to* (so two tasks never both
assume the other handles a rule), *Subtasks* as a checklist with ids, *Acceptance criteria*, *How to
verify*, *Notes*. `status` is one of `todo`, `in-progress`, `done`, `dropped`; *ready* and *blocked*
are computed from `depends` and `blocked_by` wherever they are shown. `source` is `blueprint` for a
capability, `planning` for a foundation or cross-cutting task the skill derived, `manual` for one the
operator added.

### Keeping it true

`done` is the only way a status becomes `done`; it checks subtasks and acceptance criteria, records
the date and pull requests, lists the tasks that became ready, and when a batch completes asks the
operator to confirm its *what works* paragraph before closing it. `plan` moves, reorders, drops and
renumbers with the dependency checks a hand edit would skip. `resync` reads the blueprint's
`CHANGELOG.md` and re-inventories what moved, follows capabilities by id through renames, moves and
module restructures, compares stages, surfaces and open questions, and proposes — never applies
silently — new tasks, moves, re-details, follow-up tasks for work already done, blocks, unblocks and
drops. Holes the slicing finds in the blueprint go to `PLANNING.md › Feedback to the blueprint`, which
the operator takes to `/blueprint feedback`; `resync` closes each row when the blueprint answers it.
Every mode lists what the operator edited by hand since the last run before it changes anything, and an
interrupted `init`, `detail` or `resync` resumes where it stopped.

## Progress

The skill shows where it is at every step: a checklist of the mode's stages when it starts, at every
gate and at the end; a line `▸ /<command> · <n>/<N> <stage> · <step>` at every change; what it waits for
and how many; and, on `continue` or `status`, the checklist rebuilt from its state first
([rule 8](README.md#rules-every-skill-follows)). The stages per mode, as its `SKILL.md` lists them:

| Mode | Stages |
|------|--------|
| `init [dir]` | Find the blueprint → Folder → Read the blueprint → What exists already → Strategy → Outline → Gate 1 (outline) → Detail batches 1–2 → Gate 2 (detail) |
| `continue` | The stages of the mode in `STATE.json.pending`, from the step it records |
| `status` | Hand edits → Blueprint checks → Report |
| `next` | Hand edits → Blueprint checks → What to work on |
| `detail <batch>` | Check → Write → Merge → Questions → Gate |
| `done <id>` | Mark → Acceptance criteria → What it unblocked → Views |
| `add [text]` | Title and kind → Blueprint or manual → Placement → Views |
| `plan <action>` | The change → Confirm → Apply → Views |
| `resync` | What moved → Report → Questions → Gate → Apply |

## What it will not do

- Edit the blueprint.
- Invent capabilities: behaviour the blueprint does not describe is a blueprint gap, not a task
  (except `manual` tasks the operator adds knowingly).
- Prescribe implementation: no files, classes, libraries, schemas or endpoints in a task cut from the
  blueprint — except the technology a cited decision fixes.
- Plan how to build: it reads the code only to know what exists.
- Estimate hours.
- Mark anything done on its own, detail far-ahead batches, or reorder batches silently.
- Write anything but English inside the backlog folder.

## The script

None of its own yet; it calls the blueprint's `bin/blueprint.mjs changed` to see unrecorded edits in
the blueprint. The mechanical parts the skill currently does by hand — scaffolding, the next `T-`/`P-`
id from `lastTask`, regenerating the views, ticking a subtask, validating that `depends` has no cycles
and no forward-batch edges — are what `bin/backlog.mjs` should take over once the procedure has been
run on a real project (task T18 in [TASKS.md](../TASKS.md)). Its `render` follows
`mechanics.md › Views`: the batch tables keep their stored rows and order (outline rows have no file),
`COVERAGE.md` keeps its capability rows, and only the parts listed there as regenerated are rebuilt.
The views are the first candidate: regenerating them by hand after every `done` is where a model is
slowest and least reliable.

## Limitations

- **Guidance, not enforcement.** Until the script exists, a wrong id or a stale view is possible;
  the operator should glance at `BACKLOG.md` after `done`.
- **The views are only as fresh as the last regeneration.** Editing a task file by hand is welcome;
  the next mode lists the edit and the tables follow then.
- **Vertical slicing is a judgement.** The rules steer it; a blueprint with weak main flows gives
  the skill little to slice along, and the batch-1 paragraph will show it.
- **Subtasks in product terms** leave the technical breakdown to whoever picks the task up; a
  task is an input to that work, not a substitute for it.
- **Depth limits detail.** Capabilities the blueprint only lists cannot be detailed until the
  blueprint describes them in full; the blueprint has no one-step way to deepen a single module yet.
- **One blueprint per backlog.** A product described by several blueprints is not supported.

## Tests

- [tests/structure.test.mjs](../../tests/structure.test.mjs) — the skill directory, `SKILL.md`
  frontmatter, this page and the index rows, the files and headings the skill names.
- [tests/backlogContract.test.mjs](../../tests/backlogContract.test.mjs) — the templates parse, every
  mode of the argument hint has its procedure, and the blueprint still has the fields and phases the
  backlog reads.
- Script tests arrive with the script.
