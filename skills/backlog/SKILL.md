---
name: backlog
description: Cuts a finished blueprint (the product-design documents made by /blueprint) into a backlog of batches, tasks and subtasks that can be worked through one portion at a time — each batch leaves something working end to end. Keeps the backlog alive afterwards: next task, mark done, add manual tasks, re-plan, resync after the blueprint changes. Multi-session, resumable from the files it writes. Human-invoked only.
argument-hint: "[init [dir] | continue | status | next | detail <batch> | done <id> [note] | add [text] | plan <action> | resync]"
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Bash(ls:*), Bash(mkdir:*), Bash(mv:*), Bash(find:*), Bash(date:*), AskUserQuestion, Agent
---

# Backlog

You turn a blueprint — the product-design documents produced by the `blueprint` skill — into work:
an ordered list of **batches**, each made of **tasks**, each made of **subtasks**, that a developer
(or a developer with an agent) can pick up one at a time and finish. The blueprint says what the
product does; the backlog says what to build next, how much of it, and how to know it is done.

The backlog outlives the blueprint's writing phase. It is read every working day, its statuses
change constantly, tasks get added that no blueprint foresaw (a bug, a chore, a thing learned
while building). So this skill has two halves: cutting the backlog once (`init`, `detail`) and
keeping it true afterwards (`next`, `done`, `add`, `plan`, `resync`).

## How to read the arguments

`$ARGUMENTS` picks the mode. With no argument, look for an existing backlog: found with an
unfinished mode in `STATE.json.pending` → `continue`; found → `status` followed by what `next` would
show, computed and written nowhere; none → `init`. So `/backlog` starts the backlog the first time,
resumes it after a *Stop here*, and shows where things stand every time after.

| Argument | What to do |
|----------|------------|
| *(none)* | `continue` when a mode is pending, `status` + `next` when a backlog exists, `init` when none does |
| `init [dir]` | Find the blueprint, choose the backlog folder, see what is built already, agree the slicing strategy, outline every batch, detail the first two |
| `continue` | Resume the mode and step recorded in `STATE.json.pending` |
| `status` | Progress per batch, what is in progress, ready, blocked and by what, whether the blueprint moved; change nothing |
| `next` | The tasks ready to start now, and the next subtask of anything in progress; writes nothing but the closing of a complete batch, with the operator |
| `detail <batch>` | Write the tasks of one outlined batch out in full: scope, subtasks, acceptance criteria |
| `done <id> [note]` | Mark a subtask (`T-012.3`) or a task (`T-012`) done; show what it unblocked; close the batch when it is complete |
| `add [text]` | Add a task the blueprint did not produce — a bug, a chore, a spike, something learned on the way |
| `plan <action>` | Re-plan: move or drop a task, reorder a batch, add, move or rename a batch, set the current batch, lift an outside blocker |
| `resync` | The blueprint changed: find new, changed, moved and retired capabilities, opened and closed questions; propose changes |

To find an existing backlog, glob for `**/STATE.json` (skip `node_modules`, `.git`) and keep files
whose JSON has `"kind": "backlog"`. Several → ask which (header `Backlog`), each with its blueprint
and current batch. None — with no argument, say "no backlog here yet, starting one" and run `init`;
with an explicit mode other than `init`, say so and stop. The blueprint is found the same way with
`"kind": "blueprint"`; once chosen, its path is stored in the backlog's `STATE.json`.

The mechanics every mode shares — state, ids, statuses, views, gates, questions, subagents — are in
[references/mechanics.md](references/mechanics.md); the procedure per mode in
[references/modes.md](references/modes.md); the rules for cutting — stages, batches, tasks, subtasks,
criteria, priorities — in [references/slicing.md](references/slicing.md). Read `mechanics.md` at the
start of every session and the relevant sections of the other two before acting; do not slice from
memory.

## Three rules that never bend

**Everything you write is in English.** Same reason as the blueprint: these files are read by more
people over more time than any conversation. Talk to the operator in their language; write the
backlog in English.

**State lives on disk.** Every detailed task is a file and every status is in that file; an outline
task is a row of its batch's table until it is detailed; `STATE.json` holds the blueprint's
fingerprint, the strategy, the batch list and an unfinished mode. On any mode, read the files first
and trust them over what you remember. The operator edits task files by hand between sessions —
expected; every mode starts by listing what they changed, and shows what it changes in such a file.

**The blueprint is read, never written.** Dependency runs one way: backlog → blueprint. When slicing
exposes a hole in the blueprint (a flow step without a capability, a capability too vague to cut, a
contradiction), write it under *Feedback to the blueprint* in `PLANNING.md`, tell the operator, and
point them at `/blueprint feedback`. Fixing it yourself would make two documents disagree about the
product.

## What the blueprint must have

`init` needs a blueprint whose `STATE.json` shows at least the `capabilities` phase approved — tasks
are cut from capabilities, so without them there is nothing to cut. A blueprint that is `done` is
better: its consistency and adequacy reviews have run, and from then on it keeps a `CHANGELOG.md`
that `resync` reads. Otherwise say so and offer to continue anyway; `PLANNING.md` records what the
backlog was cut from.

The blueprint's **depth** decides how much there is to cut: a capability the depth only *lists* (a
heading, who, source and one line — no rules yet) becomes an outline row and waits until the blueprint
describes it in full; it is never treated as a gap. Capabilities are cited by their **ids**
(`ORG-C03`), which never change — not by headings, which do.

## The output folder

The default is the blueprint folder's sibling, `<blueprint parent>/backlog/` — `docs/backlog/` in
the ordinary case — and the operator always gets to change it. Look first: what exists there, and
whether it is under version control — `ls -d <path>/.git` from the candidate folder up to the project
root. When there is none and the project root holds repositories of its own (`ls -d */.git`), the
recommendation is a folder inside the repository that holds the blueprint (`initialDocs/backlog/`),
because a list that changes every working day needs history. Then ask (`AskUserQuestion`, header
`Folder`): the recommended folder first, with a note if something is already there, plus one or two
alternatives that fit the project; the operator can type any path as "Other". A directory passed in
the argument becomes the recommended option, checked the same way. Never scaffold into a non-empty
folder without the operator confirming that specific folder; a folder outside git is the operator's
call, named in Gate 1's summary.

Templates for every file are in `templates/` next to this file
(`${CLAUDE_PLUGIN_ROOT}/skills/backlog/templates/`); copy them, do not invent layouts.

```
<backlog dir>/
├── STATE.json             blueprint path + fingerprint, repositories, strategy, last task id, batches, pending mode
├── BACKLOG.md             the overview: progress per batch, ready now, in progress, blocked by what
├── PLANNING.md            P-NNN slicing decisions; standing criteria; feedback to the blueprint; resync reports
├── COVERAGE.md            every blueprint capability id → the task(s) that deliver it, or why none does
├── batches/NN-<slug>.md   goal, "what works after this batch", flow → capabilities, the task rows in order
└── tasks/T-NNN-<slug>.md  one task: frontmatter (data) + scope, subtasks, acceptance criteria, how to verify
```

## The three units

| Unit | Id | What it is | Done means |
|------|----|------------|------------|
| **Batch** | `01`, `02`… | a portion of work after which something new works end to end | every task done or dropped, and the operator confirmed the *What works after this batch* paragraph |
| **Task** | `T-012` | one reviewable change — one pull request per repository it touches | every subtask closed and every acceptance criterion holds |
| **Subtask** | `T-012.3` | one sitting of work, one commit | its *done when* line holds |

A batch is **vertical**: the thinnest version of a user flow across the modules it touches, not a
layer ("all the data first, all the screens later"). The test is the paragraph at the top of each
batch file — *What works after this batch*. If it cannot be written as something a user can do,
the batch is cut wrong.

Tasks come from blueprint capabilities, usually one to one; when to split and when to merge is in
`references/slicing.md`. Tasks that come from nowhere in the blueprint exist only when a batch cannot
work without them: the skeleton, the first shapes of the entities, the technical work a decision
mandates, an operational requirement (`type: foundation`), a concern no capability delivers
(`type: cross-cutting`) — all `source: planning`.

Subtasks are the executable list inside a task: 2–8 of them, in execution order, each with a
one-line *done when*. They name slices of work in product terms ("record an invitation with an
expiry"), not files or classes — choosing those is the job of whoever picks the task up.

## Surfaces become platforms

The blueprint says on which **surfaces** a capability lives — where the user is: the web
application, the mobile application. The backlog says on which **platforms** it gets built:
`web`, `ios`, `android`, a cross-platform `mobile`, or `web` again when "mobile" turns out to be
the same responsive page. The mapping is a strategy decision at `init` (a `P-` record: "mobile
surface delivered as …"), taken from the constraints the brief lists for each surface — store
distribution, offline, device features — never guessed from the word "mobile", and never asked when
the brief's *Decided outside this blueprint* already fixes it.

Every task carries `platforms:`, exactly one. A capability on surfaces that map to different
platforms becomes a task per platform; on surfaces that share one, a single task with per-surface
subtasks. A platform is not a repository: a `web` task may touch the backend and the frontend;
subtasks say what works, not where the code lives.

## Detailing is lazy, on purpose

At `init`, every batch is outlined (title, goal, numbered task rows with capabilities, module and
priority) but only the first two are detailed (scope, subtasks, acceptance criteria). After batch 1
is built, the team knows things it did not know at the start; batch 3 detailed then is better than
batch 3 detailed now. `detail <batch>` does it when the batch comes into view; `next` offers it when
the current batch is not detailed, and closing a batch offers it for the next one.

## Decisions with the operator

Slicing has forks of its own: how big a batch, which flow is batch 1, where cross-cutting concerns
go, whether a fat capability splits, whether an open question blocks a task. Use the same mechanism as
the blueprint — `AskUserQuestion`, 2–4 related questions per round, your recommendation first and
labelled, the operator's own answer always possible via "Other" — within the tool's limits
(`mechanics.md › Questions`). Record each outcome in `PLANNING.md` as `P-NNN` — decisions about
*work*, kept apart from the blueprint's `D-` decisions about the *product*.

Small choices (a task's title, the order of two independent tasks) you make yourself; the outline
gate and the detail gate are where the operator sees and corrects them.

## What this skill does not do

- **Edit the blueprint.** Feedback goes to `PLANNING.md` and to the operator.
- **Invent capabilities.** A task that delivers behaviour the blueprint does not describe is a
  blueprint gap, not a backlog item — except `manual` tasks the operator adds knowingly.
- **Prescribe implementation.** No files, classes, libraries, schemas or endpoints in a task cut from
  the blueprint — except the technology a cited decision already fixes. A `bug` or `chore` the
  operator adds may name what it is about.
- **Plan how to build.** It reads the code only to know what exists already.
- **Estimate hours.** Sizes are relative (S/M/L) and exist to shape batches, nothing else.
- **Mark anything done on its own.** Only `done <id>` changes a status to done; `ready` and `blocked`
  are computed, never written.
- **Detail far-ahead batches**, or reorder batches silently; both go through a question.
- **Write in any language but English** inside the backlog folder.

## Done when (`init`)

- `STATE.json` names the blueprint (path relative to the backlog folder) and its fingerprint, lists
  every batch with batches 01 and 02 `detailed`, and `pending` is `null`.
- Every capability whose effective stage is the first stage appears in `COVERAGE.md` by id, mapped to
  a task, marked as existing already, or with an explicit reason it is not; every other capability is
  at least listed with its outline batch.
- Every outline row has an id; batches 1 and 2 have task files with scope, 2–8 subtasks each with
  *done when*, acceptance criteria and *How to verify*; no task depends on a task in a later batch.
- `BACKLOG.md` shows the batches, the tasks ready now and the questions that block tasks.
- The operator knows the daily loop: `/backlog next` → work → `/backlog done T-NNN.n` after each
  subtask; the last one closes the task once its criteria hold.
