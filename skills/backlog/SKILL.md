---
name: backlog
description: Cuts a finished blueprint (the product-design documents made by /blueprint) into a backlog of batches, tasks and subtasks that can be worked through one portion at a time — each batch leaves something working end to end. Keeps the backlog alive afterwards: next task, mark done, add manual tasks, resync after the blueprint changes. Human-invoked only.
argument-hint: "[init [dir] | status | next | detail <batch> | done <id> | add | resync]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(ls:*), Bash(mkdir:*), Bash(find:*), AskUserQuestion, Agent
---

# Backlog

You turn a blueprint — the product-design documents produced by the `blueprint` skill — into work:
an ordered list of **batches**, each made of **tasks**, each made of **subtasks**, that a developer
(or a developer with an agent) can pick up one at a time and finish. The blueprint says what the
product does; the backlog says what to build next, how much of it, and how to know it is done.

The backlog outlives the blueprint's writing phase. It is read every working day, its statuses
change constantly, tasks get added that no blueprint foresaw (a bug, a chore, a thing learned
while building). So this skill has two halves: cutting the backlog once (`init`, `detail`) and
keeping it true afterwards (`next`, `done`, `add`, `resync`).

## How to read the arguments

`$ARGUMENTS` picks the mode. With no argument, look for an existing backlog: found → `status`
followed by what `next` would show; none → `init`. So `/backlog` starts the backlog the first time
and shows where things stand every time after; `init` is only needed to name the folder up front.

| Argument | What to do |
|----------|------------|
| *(none)* | `status` + `next` when a backlog exists in the project, `init` when none does |
| `init [dir]` | Find the blueprint, choose the backlog folder, agree the slicing strategy, outline every batch, detail the first two |
| `status` | Progress per batch, what is in progress, what is blocked and by which blueprint question; change nothing |
| `next` | The tasks ready to start now (dependencies done, nothing blocking), and the next subtask of anything in progress |
| `detail <batch>` | Write the tasks of one outlined batch out in full: scope, subtasks, acceptance criteria |
| `done <id>` | Mark a task (`T-012`) or a subtask (`T-012.3`) done; record notes; show what it unblocked |
| `add` | Add a task the blueprint did not produce — a bug, a chore, something learned on the way |
| `resync` | The blueprint changed: find capabilities without tasks, tasks whose capability moved or vanished, questions that closed; propose changes |

To find an existing backlog, glob for `**/STATE.json` (skip `node_modules`, `.git`) and keep files
whose JSON has `"kind": "backlog"`. None — with no argument, say "no backlog here yet, starting
one" and run `init`; with an explicit mode other than `init`, say so and stop. The blueprint is
found the same way with `"kind": "blueprint"`; once chosen, its path is stored in the backlog's
`STATE.json` and not searched for again.

The procedures for every mode are in [references/modes.md](references/modes.md); the rules for
cutting — batches, tasks, subtasks, priorities, sizes — are in
[references/slicing.md](references/slicing.md). Read the relevant section before acting; do not
slice from memory.

## Three rules that never bend

**Everything you write is in English.** Same reason as the blueprint: these files are read by more
people over more time than any conversation. Talk to the operator in their language; write the
backlog in English.

**State lives on disk.** Every task is a file; every status is in that file; `STATE.json` holds
the batch list and the blueprint fingerprint. On any mode, read the files first and trust them
over what you remember. The operator edits task files by hand between sessions — expected. Show
what you change in a file they touched.

**The blueprint is read, never written.** Dependency runs one way: backlog → blueprint. When
slicing exposes a hole in the blueprint (a flow step without a capability, a capability too vague
to cut, a contradiction), write it under *Feedback to the blueprint* in `PLANNING.md`, tell the
operator, and point them at `/blueprint decide` or `/blueprint module <name>`. Fixing it yourself
would make two documents disagree about the product.

## What the blueprint must have

`init` needs a blueprint whose `STATE.json` shows at least the `capabilities` phase approved —
tasks are cut from capabilities, so without them there is nothing to cut. If `adequacy` is not
approved, say so and offer to continue anyway; record in `PLANNING.md` that the backlog was cut
from a blueprint whose adequacy review was pending, because `resync` will likely have work to do.

## The output folder

The default is `docs/backlog/`; the operator always gets to change it. Look at what exists, then
ask (`AskUserQuestion`, header `Folder`): **`docs/backlog/` (Recommended)** — with a note if
something is already there — plus one or two alternatives that fit the project (`backlog/`, a
sibling of the blueprint folder when the blueprint is not under `docs/`); the operator can type
any path as "Other". A directory passed in the argument becomes the recommended option. Never
scaffold into a non-empty folder without the operator confirming that specific folder.

Templates for every file are in `${CLAUDE_PLUGIN_ROOT}/templates/backlog/`; copy them, do not
invent layouts. The mode procedures and slicing rules live next to this file in
`${CLAUDE_PLUGIN_ROOT}/skills/backlog/references/`.

```
<backlog dir>/
├── STATE.json             blueprint path + fingerprint, strategy, batch list, current batch
├── BACKLOG.md             the overview: progress per batch, ready now, blocked by which question
├── PLANNING.md            P-NNN slicing decisions; feedback to the blueprint
├── COVERAGE.md            every blueprint capability → the task(s) that deliver it, or why not
├── batches/NN-<slug>.md   goal, "what works after this batch", the tasks in order
└── tasks/T-NNN-<slug>.md  one task: frontmatter (data) + scope, subtasks, acceptance criteria
```

## The three units

| Unit | Id | What it is | Done means |
|------|----|------------|------------|
| **Batch** | `01`, `02`… | a portion of work after which something new works end to end | every task done; the *What works after this batch* paragraph is true |
| **Task** | `T-012` | one reviewable change — the size of one pull request | all subtasks done and every acceptance criterion holds |
| **Subtask** | `T-012.3` | one sitting of work, one commit | its *done when* line holds |

A batch is **vertical**: the thinnest version of a user flow across the modules it touches, not a
layer ("all the data first, all the screens later"). The test is the paragraph at the top of each
batch file — *What works after this batch*. If it cannot be written as something a user can do,
the batch is cut wrong.

Tasks come from blueprint capabilities, usually one to one; the exact mapping rules, when to split
and when to merge, are in `references/slicing.md`. Tasks that come from nowhere in the blueprint —
the project skeleton, the first data model, cross-cutting plumbing — exist only when batch 1 cannot
work without them, and are marked `type: foundation`, `source: planning`.

Subtasks are the executable list inside a task: 2–8 of them, in execution order, each with a
one-line *done when*. They name slices of work in product terms ("record an invitation with an
expiry"), not files or classes — choosing those is the job of whoever picks the task up.

## Surfaces become platforms

The blueprint says on which **surfaces** a capability lives — where the user is: the web
application, the mobile application. The backlog says on which **platforms** it gets built:
`web`, `ios`, `android`, a cross-platform `mobile`, or `web` again when "mobile" turns out to be
the same responsive page. The mapping is a strategy decision at `init` (a `P-` record: "mobile
surface delivered as …"), taken from the constraints the brief lists for each surface — store
distribution, offline, device features — never guessed from the word "mobile".

Every task carries `platforms:`. A capability on two surfaces becomes two tasks when its surfaces
map to different platforms (different applications, different work) and one task with per-surface
subtasks when they map to the same one. A platform is not a repository: a `web` task may touch the
backend and the frontend; subtasks say what works, not where the code lives.

## Detailing is lazy, on purpose

At `init`, every batch is outlined (title, goal, task titles with module and priority) but only
the first two are detailed (scope, subtasks, acceptance criteria). After batch 1 is built, the
team knows things it did not know at the start; batch 3 detailed then is better than batch 3
detailed now. `detail <batch>` does it when the batch comes into view; `done` suggests it when a
batch completes.

## Decisions with the operator

Slicing has forks of its own: how big a batch, where cross-cutting concerns go, whether to split a
fat capability, which flow is batch 1. Use the same mechanism as the blueprint: `AskUserQuestion`,
2–4 related questions per round, your recommendation first and labelled, the operator's own
answer always possible via "Other". Record each outcome in `PLANNING.md` as `P-NNN` — these are
decisions about *work*, kept apart from the blueprint's `D-` decisions about the *product*.

Small choices (a task's title, the order of two independent tasks) you make yourself; the batch
outline gate and the detail gate are where the operator sees and corrects them.

## What this skill does not do

- **Edit the blueprint.** Feedback goes to `PLANNING.md` and to the operator.
- **Invent capabilities.** A task that delivers behaviour the blueprint does not describe is a
  blueprint gap, not a backlog item — except `manual` tasks the operator adds knowingly.
- **Prescribe implementation.** No files, classes, libraries, schemas or endpoints in a task or
  a subtask. Product terms only.
- **Estimate hours.** Sizes are relative (S/M/L) and exist to shape batches, nothing else.
- **Mark anything done on its own.** Only `done <id>` from the operator changes a status to done.
- **Detail far-ahead batches**, or reorder batches silently; both go through a question.
- **Write in any language but English** inside the backlog folder.

## Done when (`init`)

- `STATE.json` names the blueprint and its fingerprint; every batch is listed, the first two
  marked `detailed`.
- Every capability of an MVP module appears in `COVERAGE.md` mapped to a task, or with an explicit
  reason it is deferred; non-MVP capabilities are at least listed.
- Batches 1 and 2 have task files with scope, 2–8 subtasks each with *done when*, acceptance
  criteria and *How to verify*; no task depends on a task in a later batch.
- `BACKLOG.md` shows the batches, the tasks ready now and the blueprint questions that block tasks.
- The operator knows the daily loop: `/backlog next` → work → `/backlog done T-NNN.n`.
