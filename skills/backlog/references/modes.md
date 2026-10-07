# Backlog modes — the procedures

One section per mode. The slicing rules the procedures rely on are in [slicing.md](slicing.md);
templates in `templates/backlog/` under the plugin root (`${CLAUDE_PLUGIN_ROOT}`) — a path like
`templates/STATE.json` below means `<plugin root>/templates/backlog/STATE.json`.

## Contents

- [Common mechanics](#common-mechanics)
- [`init`](#init)
- [`status`](#status)
- [`next`](#next)
- [`detail <batch>`](#detail-batch)
- [`done <id>`](#done-id)
- [`add`](#add)
- [`resync`](#resync)

---

## Common mechanics

### STATE.json

Shape in `templates/STATE.json`. It holds what is not in any single task file: the blueprint path
and **fingerprint** (its `updated` date, module list, counts of decisions and open questions, the
capability count), the strategy decisions, the batch list with `detailed` and `status`, and
`currentBatch`. Update it whenever a batch is added, detailed or completed, and after `resync`.
Statuses of tasks and subtasks live only in the task files; `STATE.json` never duplicates them.

### Regenerating views

`BACKLOG.md`, `COVERAGE.md` and the task tables inside `batches/*.md` are **views** over the task
files. Regenerate them at the end of every mode that changed anything: read every `tasks/*.md`
frontmatter and subtask checklist, then rewrite the tables. Never edit a view by hand to reflect a
status; change the task file and regenerate. Until a script takes this over, be systematic: list
the task files with `Glob`, read each frontmatter, build the tables.

### Ids

`T-NNN` is global and sequential; take the highest existing number in `tasks/` + 1. A task keeps
its id when it moves between batches. Subtasks are `T-NNN.n`. `P-NNN` in `PLANNING.md` the same
way. Subagents never assign ids; they return proposed tasks with placeholder ids `T-?` and you
number them on merge.

### Gates

`init` has two gates (outline, detail) and `detail` has one; `resync` has one. A gate is: a summary
of ≤20 lines in the operator's language, the files to look at, then `AskUserQuestion` (header
`Gate`): **Approve** (Recommended when nothing is pending) / **Revise** (the operator says what) /
**Stop here** (state saved; the next run resumes at the gate). `STATE.json.pending` records an
unfinished gate so a resumed session knows where it is.

### Subagents

Use `Agent` (`general-purpose`) for reading module files (capability inventory) and for detailing
a batch. A brief always gives: the files to read by path (blueprint files, `PLANNING.md`, the
batch file, `slicing.md` from this skill), the rule that output is English in product terms, the
rule that it does not decide forks but returns them under `QUESTIONS FOR OPERATOR`, and the exact
shape to return. For detailing, the agent writes the task files directly from
`templates/tasks/TASK.md` with `T-?` ids and returns a summary plus questions; you number, merge,
ask, fix.

---

## `init`

1. **Find the blueprint.** Glob for `STATE.json` with `"kind": "blueprint"`. None → stop; the
   operator needs `/blueprint` first. Several → ask which. Read its `STATE.json`: `capabilities`
   must be `approved`; if `adequacy` is not, warn and ask whether to continue (record the answer
   in `PLANNING.md`).
2. **Choose the folder** — the procedure in `SKILL.md › The output folder`. Scaffold from
   `templates/`: `STATE.json` with the blueprint path and fingerprint, empty `BACKLOG.md`,
   `PLANNING.md`, `COVERAGE.md`, `batches/`, `tasks/`.
3. **Read the blueprint.** Yourself: `01-brief.md` (including its `## Surfaces` table and default
   rule), `02-architecture.md`, `03-roadmap.md`, `OPEN-QUESTIONS.md` (open ids), `GLOSSARY.md`.
   Subagents, one per module: the capability inventory (shape in `slicing.md › What to read`),
   surfaces included. Merge into `COVERAGE.md` with the task column empty.
4. **Strategy round(s)** — the table in `slicing.md › Strategy questions`; 2–4 questions per round;
   each answer a `P-` record. With several surfaces the round includes the **platform map** and the
   **platform order**; write them to `STATE.json.strategy.platformMap` / `platformOrder` as well as
   to `PLANNING.md`. Write `STATE.json.strategy`.
5. **Outline every batch** yourself: for each batch a file from `templates/batches/BATCH.md` with
   id, slug, goal, the *What works after this batch* paragraph, and the task table filled with
   title, module, priority, size guess, dependencies — **no task files yet**. Fill the task column
   of `COVERAGE.md` with the planned task titles (ids come at detail time; write `batch NN` for
   now). Non-MVP batches: titles and goal only, paragraph one line.
6. **Gate 1 — outline.** Summary: number of batches, batch 1's paragraph, foundation tasks and
   why each is needed, capabilities left uncovered and why, feedback to the blueprint so far.
   The operator reorders, merges, splits; you apply and gate again.
7. **Detail batches 1 and 2** — the `detail` procedure below, for both, one subagent per batch
   in parallel.
8. **Gate 2 — detail.** Summary: tasks per batch with sizes, any task that had to be split,
   blocked tasks and their questions, the first three tasks `next` would offer.
9. Regenerate views; `STATE.json.currentBatch = "01"`. Tell the operator the daily loop.

## `status`

Read `STATE.json`, every task file's frontmatter and subtask checklist. Report, in the operator's
language: current batch and its *what works* paragraph; per batch — tasks done / in progress /
todo / blocked; tasks in progress with their next unchecked subtask; blocked tasks grouped by
`Q-`; batches not yet detailed; blueprint fingerprint vs the blueprint's current `STATE.json`
(`updated` differs → "the blueprint changed since the last resync"). Write nothing.

## `next`

1. Read as in `status`.
2. **In progress first:** every task with `status: in-progress` — show its next unchecked subtask
   with its *done when*. Usually that is the whole answer.
3. **Ready tasks:** in the current batch, `status: todo` or `ready`, every id in `depends` is
   `done`, `blocked_by` empty. Order: priority, then position in the batch file. Show up to five
   with title, size, module, and the first subtask. Set their status to `ready` in the files (this
   is the one status change `next` makes; it only reflects what is already true).
4. If the current batch has nothing ready and nothing in progress but undone tasks remain, say
   what they wait for (a dependency, a question) — that is the operator's next move.
5. If the current batch is complete, say so, move `currentBatch`, and offer `detail` for the next
   batch if it is not detailed.

## `detail <batch>`

1. Confirm the batch exists and is not already detailed (if it is, ask: re-detail keeps task ids
   and statuses, rewrites scope and subtasks only where the operator agrees).
2. **One subagent for the batch** (two for a large one, split by module). Brief: read
   `slicing.md`, `PLANNING.md`, the batch file, the blueprint's architecture, glossary and the
   module files its tasks touch; for each row in the task table write `tasks/T-?-<slug>.md` from
   the template: frontmatter, *What the user gets*, *In scope*, *Out of scope → goes to*,
   *Subtasks* (2–8, with *done when*), *Acceptance criteria*, *How to verify*. Return per task:
   title, subtask count, whether it should be split or merged, and questions.
3. **Merge:** assign `T-` ids in batch order; rename the files; fix cross-references between
   tasks (*goes to*, `depends`); apply splits (two files, both cite the capability) and merges;
   fill `COVERAGE.md` ids.
4. **Question round(s)** from the agents' questions and your own review — typical forks: where a
   rule goes, whether a fat task splits, whether a cross-cutting criterion applies.
5. Gate. On approval: `STATE.json.batches[NN].detailed = true`; regenerate views.

## `done <id>`

**Subtask (`T-012.3`):** read the task file; tick the box; if the task is `todo`/`ready`, set
`in-progress`; ask for a one-line note if the operator wants one (`Notes`); if every subtask is
now ticked, show the acceptance criteria and ask whether they all hold — yes → task `done`;
no → stay `in-progress` and note what is left.

**Task (`T-012`):** read the file. Unticked subtasks → ask per subtask: done after all / move to
another task (which) / drop with a reason. Acceptance criteria → confirm they hold. Set `done`,
date in `Notes`. Then:

- list tasks that became ready (their `depends` now all done);
- if the batch is complete: say the batch's *what works* paragraph should now be true and suggest
  checking it; move `currentBatch`; offer `detail` for the next undetailed batch;
- regenerate views.

`done` is the only way a status becomes `done`. If the operator says "I finished T-012 and T-013"
in conversation, run `done` for each; do not edit statuses in passing.

## `add`

For work the blueprint did not produce: a bug, a chore, a thing learned while building.

1. Ask what it is, in one round: title and what it fixes or adds; type (`feature` only if it is
   behaviour — then ask whether it should be a blueprint capability first; `polish`, `spike`,
   `foundation`, `cross-cutting` otherwise); module; which batch (current, Recommended, or
   another); dependencies if obvious.
2. Create `tasks/T-NNN-<slug>.md` with `source: manual`, `priority` as the operator says (default
   the batch's stage), subtasks if the operator can name them now, otherwise one placeholder
   subtask and a note that it needs detailing.
3. Add the row to the batch file; regenerate views. No gate.

## `resync`

Run when the blueprint changed — the operator says so, or `status` showed the fingerprint differs.

1. **Diff the fingerprint.** Read the blueprint's `STATE.json`, `DECISIONS.md`, `OPEN-QUESTIONS.md`
   and re-run the capability inventory (subagents per module). Compare with `COVERAGE.md` and the
   stored fingerprint:
   - **new capabilities** → no task yet;
   - **vanished or renamed capabilities** → tasks whose anchor no longer resolves;
   - **changed capabilities** (rule or edge-case count changed) → tasks that may be stale;
   - **changed surfaces** (a capability's *Surfaces* line differs from the Surfaces column in
     `COVERAGE.md`) → a task to add for the platform that gained the capability, or one to drop; a
     change in the brief's surfaces table itself means the platform map is re-asked first;
   - **closed questions** → blocked tasks that can be unblocked, with the decision's outcome;
   - **new decisions** → tasks in the modules the decision names, for review.
2. **Write the report** to `PLANNING.md › Resync <date>`: each item, the task(s) it touches, the
   proposed change (add task to batch NN / drop task with reason / re-detail task / unblock / no
   change).
3. **Question rounds** grouped by batch: accept the proposal (Recommended) / do differently /
   leave as is. Dropping a task that has done subtasks is always a question, never automatic.
4. **Apply**: new tasks via the `add` shape but with `source: blueprint`; stale tasks → mark
   `needs-review` in `Notes` and, if the operator agrees, re-detail them with a subagent; unblock
   by clearing `blocked_by` and setting `todo`; vanished → `status: dropped` with the reason.
5. Update the fingerprint in `STATE.json`; regenerate views. Gate: show the report with outcomes.
