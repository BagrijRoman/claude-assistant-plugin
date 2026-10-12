# Backlog — common mechanics

Read this file at the start of every session, then the section of [modes.md](modes.md) for the mode
you run and the parts of [slicing.md](slicing.md) it points to. Templates live in the skill's own
folder, `${CLAUDE_PLUGIN_ROOT}/skills/backlog/templates/`; a path like `templates/STATE.json` is
relative to the skill's folder. A reference such as `mechanics.md › Views` names a file of this skill
and a heading in it.

## Contents

- [STATE.json](#statejson)
- [Paths](#paths)
- [The blueprint's state](#the-blueprints-state)
- [Ids](#ids)
- [Statuses](#statuses)
- [Batches](#batches)
- [Views](#views)
- [Hand edits](#hand-edits)
- [Gates and resuming](#gates-and-resuming)
- [Questions](#questions)
- [Subagents](#subagents)

---

## STATE.json

Shape in `templates/STATE.json`. It holds what no single task file holds: where the blueprint is and
what it looked like at the last sync (`blueprint`), the repositories that hold the product's code
(`repositories`), the strategy decisions (`strategy`, a copy of the `P-` records in `PLANNING.md`,
which stay the record), the last task id issued (`lastTask`), the batch list (`batches`), the current
batch (`currentBatch`, and `currentPinned` when the operator chose one) and an unfinished mode
(`pending`).

- `updated` is a full timestamp, `YYYY-MM-DDTHH:MM`, taken from `date +%Y-%m-%dT%H:%M` — never
  estimated. Every mode that writes anything stamps it, and **`STATE.json` is the last file written**
  in every operation, so `mechanics.md › Hand edits` finds only what the operator changed.
- `batches[]` is `{ "id", "slug", "stage", "flow", "detailed", "closed" }`. Find an entry by its `id`
  (`"03"`), never by its position in the array. `closed` is the date the operator confirmed the
  batch's *What works* paragraph (`mechanics.md › Batches`), `null` before.
- Statuses of tasks and subtasks live only in the task files; `STATE.json` never copies them, and a
  batch's state is derived (`mechanics.md › Batches`), not stored.
- Write it with two-space indentation. If it is missing or does not parse, stop and tell the operator:
  rebuilding it from the files is their call.

## Paths

`blueprint.path` is the blueprint folder **relative to the backlog folder** (`../blueprint` when both
sit in `docs/`). Resolve it against the backlog folder to read the blueprint. `BACKLOG.md`,
`COVERAGE.md` and `PLANNING.md` link with it as written; files in `tasks/` and `batches/` prefix
`../`. A capability is linked as its module file — `<blueprint path>/modules/<slug>.md`, the file
from the blueprint's `STATE.json.modules[].file` — with the capability id in the link text, never as
a heading anchor: anchors change when a capability is renamed, ids never do.

`repositories` are folders relative to the project root — the folder the skill was started from.

When `blueprint.path` no longer holds a `STATE.json` of kind `blueprint`, the blueprint moved: glob
for it again. One match with the same `project` → propose it, and on confirmation update the path and
the links in `BACKLOG.md`, `COVERAGE.md` and `PLANNING.md`. No match → stop and say so.

## The blueprint's state

`blueprint.fingerprint` mirrors the blueprint's `STATE.json` at the last `init` or `resync`: its
`updated` and `counts` copied verbatim, its `phase` and `depth`, the ids of its open questions, and per
module `{ "code", "slug", "file", "stage", "surfaces", "lastCapability", "l3", "removed" }`. Never
shorten the timestamp: a date alone misses two changes on one day.

**The blueprint moved** when its `updated` differs from the fingerprint's; the counts and module
entries say what kind of move it was, and the blueprint's `CHANGELOG.md` (written after the blueprint
is done) says what exactly. **The blueprint has unrecorded edits** when its helper script lists files
changed since its `STATE.json` was last written:

```
node "${CLAUDE_PLUGIN_ROOT}/bin/blueprint.mjs" changed <blueprint dir> --root <project root>
```

The script only lists files and writes nothing. Files listed under the blueprint folder mean the
operator edited the blueprint by hand; changed document sources mean its input moved on. Either way
no `/blueprint` mode has taken it in yet: tell the operator to run `/blueprint` first (it records the
edits in its changelog, re-reads the sources and stamps), then `/backlog resync`. Sources listed as
*not found* usually mean a wrong `--root` — the project root is the folder the blueprint's source
locations are relative to; try it before alarming the operator. When node cannot run, use
`find <blueprint dir> -newer <blueprint dir>/STATE.json -type f -not -path '*/.*' -not -path '*/export/*'`.

`status`, `next` (when it offers `detail`), `detail` and `resync` run both checks before anything else.

## Ids

- **Tasks** — `T-NNN`, global and sequential: the next id is `lastTask` + 1, or the highest id in
  `tasks/` and in the batch tables + 1 when that is higher (a session lost before `STATE.json` was
  written). Raise `lastTask` with every id issued; never lower it, never reuse an id — not after a
  merge, a drop or a deleted file. A task keeps its id when it moves between batches.
- **Outline tasks are numbered too.** Every row of every batch gets its id when the outline is
  approved (Gate 1), so dependencies, *goes to* lines and `COVERAGE.md` can cite it long before the
  task has a file.
- **Subtasks** — `T-NNN.n`, numbered in order when the task is detailed and never renumbered; one
  added later takes the next number even when it belongs earlier in the order (say so in its line).
- **Planning decisions** — `P-NNN` in `PLANNING.md`: the highest existing + 1, in the order the
  questions are answered; a question not asked gets no record.
- **Subagents never assign ids.** They write the rows they were given, under the ids they were given;
  a task they think is missing comes back as text labelled `NEW-1`, `NEW-2`, and you number and write
  it.

A task file is `tasks/<id>-<slug>.md`, the slug the kebab-case title in at most six words. It keeps its
name when its title changes later: the id is what everything links to.

## Statuses

A task stores one of four statuses; everything else is computed from its frontmatter when it is shown.

| Stored `status` | Meaning | Set by |
|-----------------|---------|--------|
| `todo` | not started | `detail`, `add`, `resync` |
| `in-progress` | at least one subtask ticked | `done` of its first subtask |
| `done` | every subtask closed and every acceptance criterion confirmed | `done` only |
| `dropped` | will not be built; the reason is in *Notes* | `plan drop`, `resync`, a merge in `detail` |

| Computed | When |
|----------|------|
| **blocked** | `blocked_by` is not empty — whatever the stored status |
| **ready** | `todo`, not blocked, `review` empty, every id in `depends` is `done` |
| **needs attention** | `review` is set (`needs-review`, `needs-detail`), or the files contradict each other (a ticked subtask on a `todo` task, a `batch` with no row) |

`ready` and `blocked` are never written into `status`: they change whenever another file changes, and
a stored copy would go stale. `review` is cleared by `detail` on every file it writes or re-details,
and by `resync` when the operator answers "leave as is" for a flagged task. `depends` never names a dropped task — dropping one asks about every task
that depends on it (`modes.md › plan`). Only `done` writes `done`, and a done task is never reopened: a
later problem in it is a new `bug` task that cites it.

## Batches

- A batch is **complete** when it is detailed, every row of its task table has a task file, and every
  task whose `batch` is its id is `done` or `dropped`. An outline-only batch is never complete, and
  neither is a detailed batch that still holds a row nobody could detail (a list-only capability).
- When a batch becomes complete, ask (header `Batch`): **It works — close the batch** (Recommended) /
  **Not yet — add what is missing** (runs `add` into this batch) / **Close anyway** (the reason goes to
  the batch's *Notes*). Closing writes `batches[].closed` and "Closed <date> — what works confirmed"
  in the batch's *Notes*, then offers `detail` for the next undetailed batch. The *What works* paragraph
  is the demo: suggest running it before answering.
- `currentBatch` is the lowest-numbered batch that is not closed — or `currentPinned`, a batch the
  operator chose with `plan current`, until that batch closes (then `currentPinned` goes back to
  `null`). Every mode that writes recomputes it. When it is not detailed yet, `next` offers
  `detail <it>` before anything else.
- A batch's state, shown in the views, is derived: `outline` (not detailed), `todo`, `in progress`
  (some task in progress or done), `complete`, `closed <date>`.

## Views

Some files are rebuilt from others after every mode that changed anything; some hold data nothing else
holds. Never edit a computed part by hand to reflect a status: change the task file, then regenerate.
Until a script takes this over, be systematic — list the files with `Glob`, read each frontmatter and
subtask checklist, rebuild the parts below, and nothing else.

| File | Stored | Regenerated |
|------|--------|-------------|
| `batches/NN-<slug>.md` | goal, *What works*, *Flow → capabilities*, *Not in this batch*, *Notes*, and the **rows** of the task table — their order (agreed at Gate 1; `next` breaks ties by it) and, for a row with no task file yet, its whole content. Rows are added by `init`, `detail` (a split, a `NEW-n`), `add` and `resync`, moved by `plan move` and `resync`, reordered by `plan order` | the state line under the title; every cell of a row whose task has a file, from that file |
| `COVERAGE.md` | the capability rows — one per capability id, from the inventory (`init`, `resync`) — and every *Status* that no task file can tell: `planned`, `outline`, `list-only` (until a file exists), `exists`, `partly`, `deferred`, `blueprint gap`, `dropped`, `L2 only` | the *Task(s)* cell — the tasks whose file lists the id in `capabilities`, and the outline rows whose *Capabilities* cell lists it; the *Status* `covered` / `done` of a row whose tasks all have files; the count line |
| `BACKLOG.md` | nothing | everything — from `STATE.json`, the batch tables, the task files and the titles of the blueprint's open questions |

A row is never removed: a dropped task keeps its row, struck through, and a moved one moves. A task
file whose `batch` has no row in that batch's table is a hand-edit break (`mechanics.md › Hand edits`):
with the operator's agreement its row is appended after its last dependency.

## Hand edits

The operator edits task files, batch files and `PLANNING.md` between sessions — expected and welcome.
Every mode starts with:

```
find <backlog dir> -newer <backlog dir>/STATE.json -type f -not -name .DS_Store
```

Read the files it lists before anything else and say which they are. When a mode then changes one of
them, show the operator what it changed. Reading modes report what the edits broke — a ticked subtask
on a `todo` task, a task whose `batch` has no row, a dependency on a later batch, a cycle, a dependency
on a dropped task — and writing modes fix it once the operator agrees.

## Gates and resuming

`init` has two gates (outline, detail), `detail` one, `resync` one before it applies anything. A
gate is: a summary of at most ~20 lines in the operator's language, the files to look at, then
`AskUserQuestion` (header `Gate`): **Approve** (Recommended when nothing is pending) / **Revise** (the
operator says what; apply, then gate again) / **Stop here** (everything so far is on disk; the next
`/backlog` resumes at this gate).

`pending` makes that promise true. A mode with more than one step — `init`, `detail`, `resync` —
writes it when it starts and at every step boundary, and sets it back to `null` only when its last
gate is approved:

```json
{ "mode": "init", "step": "gate-outline", "batches": ["01", "02"], "since": "2026-10-09T14:05" }
```

Steps: `init` — `folder`, `read`, `code`, `strategy`, `outline`, `gate-outline`, `detail`,
`gate-detail`; `detail` — `write`, `merge`, `questions`, `gate`; `resync` — `diff`, `report`,
`questions`, `gate`, `apply`. A run that finds `pending` set says which mode stopped at which step and
continues from there (`modes.md › continue`); it never writes a step's files a second time. There is
one `pending`: a multi-step mode does not start while it names another mode — say which, and offer
`/backlog continue`. A mode run inside another (`detail` inside `init`) keeps the outer mode's record
and only moves its step. While `pending.mode` is `init`, `next`, `done`, `add` and `plan` stop with
"the backlog is not cut yet — `/backlog continue`"; `next` never offers a task of a batch whose detail
gate is pending.

## Questions

Slicing has forks of its own. Ask them with `AskUserQuestion`, 2–4 related questions per round, your
recommendation first and labelled `(Recommended)` with a one-line reason, the real alternatives with
their trade-offs. The tool has hard limits, and a question that breaks one fails: **at most 4
questions per call, 2–4 options per question, a header of at most 12 characters**, and a free-text
"Other" that the tool always adds — never spend an option on it.

- A choice wider than four (seven main flows, thirteen modules) goes into the question text as a
  numbered list; the options are ways of answering it (the recommended item, the runner-up), and Other
  takes any number from the list.
- When one step raises more than four forks, ask first how to take them: **Go through them**
  (Recommended when they change a batch) / **Accept all your recommendations** — each listed in the
  question text with its one-line reason — / **Leave them open** (each becomes a line in the batch's
  *Notes* and is asked at the next gate).
- Every answer to a strategy or slicing fork is a `P-` record in `PLANNING.md` the moment it is given.
  Small choices — a task's title, the order of two independent tasks — you make yourself; the gates
  are where the operator sees and corrects them.

## Subagents

Noisy or parallel work goes to subagents; you keep the merge, the ids and every question.

| Role | Agent type | Does |
|------|------------|------|
| inventory reader | `general-purpose`, told to write nothing | reads one module file and returns its capability inventory (`slicing.md › What to read in the blueprint`) |
| code reader | `Explore` (else `general-purpose`, told to write nothing) | reads one repository and reports which capabilities exist already (`modes.md › init`, step 4) |
| detailer | `general-purpose` | writes the task files of one batch — or of the rows it is given — and nothing else (`modes.md › detail`) |

Every brief names the goal; the files to read by absolute path (the agent reads them — do not paste
them), including `${CLAUDE_PLUGIN_ROOT}/skills/backlog/references/slicing.md` for a detailer; the
rules every role shares — output in English, the blueprint's glossary terms, product terms rather than
implementation, no ids of its own (`mechanics.md › Ids`), no decisions on forks; and what to return. A
fork the agent cannot decide is returned under `QUESTIONS FOR OPERATOR`, each naming file › section; a
detailer also writes it into the task's *Notes* as `[?pending] <fork>`, because a note on disk survives
a summarised context and a reply does not. You turn each into a question and remove the marker.

**Before a wave**, tell the operator how many agents will run, of which role, for what — a backlog over
thirteen modules is thirteen inventory readers. **When an agent fails** (an error, a usage limit, an
empty or cut-off reply), do not redo its work yourself and do not drop it: finish the rest of the wave,
name the failed unit, and run it again before the gate; if it fails twice, say so in the gate summary.
