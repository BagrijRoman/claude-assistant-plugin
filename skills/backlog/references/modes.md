# Backlog modes — the procedures

One section per mode. Read [mechanics.md](mechanics.md) first — state, ids, statuses, views, gates,
questions and subagents are defined there once — and the slicing rules in [slicing.md](slicing.md)
that the step names. Templates live in the skill's own folder,
`${CLAUDE_PLUGIN_ROOT}/skills/backlog/templates/`; a path like `templates/STATE.json` below is
relative to the skill's folder.

Every mode starts with the hand-edit check (`mechanics.md › Hand edits`). Every mode that writes ends
by regenerating the views (`mechanics.md › Views`), recomputing `currentBatch`, stamping `updated` and
writing `STATE.json` last.

## Contents

- [`init`](#init-dir)
- [`continue`](#continue)
- [`status`](#status)
- [`next`](#next)
- [`detail <batch>`](#detail-batch)
- [`done <id>`](#done-id-note)
- [`add`](#add-text)
- [`plan`](#plan)
- [`resync`](#resync)

---

## `init [dir]`

1. **Find the blueprint.** Glob for `STATE.json` with `"kind": "blueprint"`. None → stop; the
   operator needs `/blueprint` first. Several → ask which. Read its `STATE.json`: `phases.capabilities`
   must be `approved`. When `consistency` or `adequacy` is not approved, or `phase` is not `done`, say
   what that costs — the blueprint will still change, and its `CHANGELOG.md` only starts when it is
   done, so the first `resync` has to compare everything — and ask whether to continue. When the
   first-stage capabilities are list-only by the blueprint's depth (`slicing.md › Stages`), batches 1
   and 2 cannot be detailed: ask (header `Depth`) **Deepen the blueprint first** (Recommended — the
   operator runs `/blueprint module <name> full` for each module whose first-stage capabilities are
   list-only) / **Cut them as an outline only** (a `P-` record
   later; batches 1 and 2 then stay outline-only until the blueprint is deeper).
2. **Choose the folder** — `SKILL.md › The output folder`. When the chosen folder already holds a
   backlog, ask: **Open it** (Recommended — run `/backlog` on it) / **Start another in a different
   folder**; never scaffold over it. Scaffold from `templates/`: copy each file, fill the placeholders
   you can (project, dates, the blueprint path relative to the backlog folder, the fingerprint), and
   leave out the example rows and sections — every table starts empty and the first decision is
   `P-001`. `STATE.json` starts with `strategy: {}`, `batches: []`, `lastTask: 0`, `currentBatch:
   null`, `pending: { "mode": "init", "step": "read", … }`. Record the answer of step 1 in
   `PLANNING.md`'s header and in `blueprint.adequacyApprovedAtInit`. Create `batches/` and `tasks/`.
3. **Read the blueprint** (`slicing.md › What to read in the blueprint`). Yourself: the brief, the
   architecture, the roadmap, `OPEN-QUESTIONS.md`, `GLOSSARY.md`. Then the inventory: one reader per
   module entry without `removed` — tell the operator how many first. Merge into `COVERAGE.md`, one row
   per capability id, the *Task(s)* column empty.
4. **What exists already.** List the repositories: `ls -d .git */.git` at the project root. When there
   are any, ask (header `Code`, multiSelect) which hold the product's code — each listed, plus **None
   yet — nothing is built**. For each chosen repository, one code reader (`Explore`) gets the
   first-stage capabilities (id, verb phrase, What) and the foundation batch 1 would need, reads the
   README, a WORKLOG or CHANGELOG and the feature folders, and returns per capability id `exists` /
   `partly — <what is missing>` / `no`, with the evidence (paths), plus the foundation already in
   place (runs locally, sign-in, CI). It reads code only to know what exists — never to plan how to
   build. Write `repositories` to `STATE.json`, and `exists — <repo>` or `partly — <repo>: <what is
   missing>` to `COVERAGE.md`.
5. **Strategy rounds** — `slicing.md › Strategy questions`; each answer a `P-` record, copied to
   `STATE.json.strategy`. Then write `PLANNING.md › Standing criteria`: one criterion per cross-cutting
   concern of the architecture and per `N-` that applies to most tasks, each with the batch it applies
   from (`slicing.md › Foundation and cross-cutting tasks`).
6. **Outline every batch** yourself (`slicing.md › Batches`): for each a file from
   `templates/batches/BATCH.md` with id, slug, goal, the *What works after this batch* paragraph, the
   *Flow → capabilities* table for a batch that cuts a flow, and the task rows — title, capability ids,
   module, platforms, type, priority, size guess, depends (by title for now), in execution order. **No
   task files yet.** Later-stage batches: titles and goal, the paragraph one line. Write the batch list
   to `STATE.json.batches` (`detailed: false`). Fill `COVERAGE.md`'s status: `planned — batch NN`,
   `outline — batch NN`, `list-only — batch NN`, `deferred`, `blueprint gap`.
7. **Gate 1 — outline.** Summary: the number of batches and of tasks in batch 1, batch 1's paragraph,
   the foundation tasks and why each is needed, what was taken as already existing, the tasks that hang
   on open questions, capabilities left uncovered and why, feedback to the blueprint so far. The
   operator reorders, merges, splits; apply and gate again. **On approval, number every row** in batch
   order from `lastTask` + 1, rewrite the depends and *goes to* references as ids, and write the ids
   into `COVERAGE.md`.
8. **Detail batches 1 and 2** — steps 1–4 of `detail` for each, one detailer per batch in parallel,
   each brief also listing the other batch's ids and titles.
9. **Gate 2 — detail.** Summary: the tasks per batch with sizes, any task that had to be split, the
   tasks that are blocked or built on a provisional choice and their questions, the first three tasks
   `next` would offer. On approval `detailed: true` for 01 and 02, `pending: null`.
10. Regenerate the views; `currentBatch = "01"`. Tell the operator the daily loop: `/backlog next` →
    work → `/backlog done T-NNN.n` after each subtask.

## `continue`

Read `STATE.json.pending`. Set → say which mode stopped at which step (and since when), run the
hand-edit check, and resume that mode at that step — the files of the steps before it are on disk and
are not written again. Not set → say there is nothing to resume and run what a bare `/backlog` runs.

## `status`

Read `STATE.json`, the batch tables and every task file's frontmatter and subtask checklist, and run
the blueprint checks (`mechanics.md › The blueprint's state`). Report, in the operator's language:

- a `pending` mode first, if any;
- the current batch and its *What works* paragraph;
- per batch: its state and the tasks done / in progress / ready / todo / blocked / dropped;
- the tasks in progress with their next unchecked subtask;
- the blocked tasks grouped by `Q-` (and `ext:`), and the tasks that need attention;
- the batches not yet detailed;
- whether the blueprint moved since the last sync — and its `CHANGELOG.md` rows newer than the
  fingerprint, as "what moved" — whether it has unrecorded edits, and the questions opened or closed
  since the fingerprint was taken;
- what the hand-edit check found and what it broke.

Write nothing.

## `next`

1. Read as in `status`. While `pending.mode` is `init`, stop (`mechanics.md › Gates and resuming`).
2. **The current batch is not detailed** → offer `detail <it>`, after the blueprint checks.
3. **In progress first:** every `in-progress` task — show its next unchecked subtask with its *done
   when*. Usually that is the whole answer.
4. **Ready tasks** of the current batch (`mechanics.md › Statuses`), ordered by priority, then by their
   row in the batch table: up to five, with title, size, module, and the first subtask.
5. **Nothing ready, nothing in progress, tasks left** → say what they wait for (a dependency, a
   question, an `ext:` blocker) — that is the operator's next move — and then show up to three ready
   tasks of the next detailed batch, labelled "ahead of batch NN — waiting on Q-…". This is safe: a
   batch never depends forward.
6. **The current batch is complete but not closed** → the closing question (`mechanics.md › Batches`).
7. Tasks with `review` set, and what the hand-edit check broke, are listed under *Needs attention*,
   never as ready, with the mode that handles each: `detail <batch>` for `needs-detail`, `resync` for
   `needs-review`.

`next` writes nothing — the closing question in step 6 is the one exception, and it runs the closing
routine of `done`.

## `detail <batch>`

`<batch>` is the batch's number (`3` or `03`) or its slug.

1. **Check.** The batch exists. Run the blueprint checks; when the blueprint moved, ask (header
   `Blueprint`): **Resync first** (Recommended) / **Detail anyway**. `pending` names this batch →
   resume at its step. A capability on its rows that is list-only (`slicing.md › Stages`) cannot be
   detailed: say so and point the operator at the blueprint — `/blueprint module <name> full` when the
   module was left as a list, or the capability's stage through `/blueprint feedback` when its own
   later stage keeps it one — and detail the rest; the batch cannot complete until that row is detailed too. The batch
   is far ahead (more than one beyond the next undetailed batch) → ask **Detail it now** / **Wait until
   it comes into view** (Recommended). The batch is already detailed → detail only the tasks with
   `review: needs-detail`, without asking; re-detailing a whole batch is a question, keeps every id and
   status and every ticked subtask verbatim with its number, and new subtasks continue the numbering.
   Write `pending` (`mode: detail`) — or, inside `init`, leave `init`'s record and set its step to
   `detail`.
2. **Write.** One detailer for the batch — two for a large one, split by module; tell the operator.
   The brief:
   - read `slicing.md`, `PLANNING.md` (decisions and *Standing criteria*), the batch file, the
     blueprint's `01-brief.md` (actors, goals `G-`, non-functional requirements `N-`, out of scope,
     *Decided outside this blueprint*), `02-architecture.md` (flows, domain model, *Roles and access*,
     cross-cutting concerns), `GLOSSARY.md`, and the module files of the rows — naming each capability
     id and the module's `## Access` table;
   - per row: its id, title and capability ids, its `COVERAGE.md` row, the `OPEN-QUESTIONS.md` records
     of the questions those capabilities carry (their provisional choice goes into *Notes*), the task
     files of earlier batches that cite the same capabilities (what they left over is this row's
     work), and a `partly` note from `init` step 4 if there is one;
   - write `tasks/<id>-<slug>.md` from `templates/tasks/TASK.md` for each row, and nothing else; a row
     that already has a task file (a manual task from `add`, a task moved in by `plan move`) is read as
     context and left alone unless it has `review: needs-detail`; clear `review` on every file written;
   - follow `slicing.md` for subtasks, criteria and *How to verify*; forks go to *Notes* as
     `[?pending]` and to the reply;
   - return per task: the file, the capability ids, the subtask count, a split or merge proposal, the
     rules / edge cases / transitions it could not place, and `QUESTIONS FOR OPERATOR`. A task it
     thinks is missing comes back as `NEW-n` text.
3. **Merge.** Number any `NEW-n` and write it. Apply splits (a new id, both cite the capability) and
   merges (the lower id survives; the other is `dropped` — "merged into T-0xx" — and every `depends`
   and *goes to* that named it is repointed). Rewrite the *goes to* lines of earlier batches that point
   at this batch. Check every capability's Rules, Edge cases and States are traceable to a subtask or a
   *goes to* line.
4. **Questions** from the detailers' forks and your own review — typical ones: where a rule goes,
   whether a fat task splits, whether a question blocks a task or it is built on the provisional
   choice. Remove each `[?pending]` as it is answered.
5. **Gate** — Gate 2's summary, for this batch. On approval: `detailed: true` on the entry whose `id`
   is this batch, `pending: null`; add "detailed from blueprint <updated>" to the batch's *Notes*.

## `done <id> [note]`

`done` is the only way a status becomes `done`. If the operator says "I finished T-012 and T-013" in
conversation, run `done` for each; do not edit statuses in passing. A note given with the command goes
to *Notes*; otherwise ask for none.

**Subtask (`T-012.3`):** read the task file; tick the box; a `todo` task becomes `in-progress`. When
every subtask is now closed, show the acceptance criteria and ask whether they hold: yes → *A task
becomes done* below; no → it stays `in-progress`, and what is left goes to *Notes*.

**Task (`T-012`):** already `done` → say so and show what it unblocked. Otherwise, for each subtask not
closed, ask: **Done after all** / **Move to another task** / **Drop it**. Moved → strike it through
with `moved → T-0xx.n`, strike its acceptance criterion the same way and add a *goes to* line; the
target task gets it with its next number, marked "(from T-012.5)", its criterion, and the capability
in its `capabilities`; "a new task" runs `add` with the moved subtasks prefilled, in the same batch,
depending on this one — the same path splits a task mid-work. Dropped → strike it through with
`dropped: <reason>`; when it carried a capability rule, ask whether to defer the rule (`COVERAGE.md`:
`partly deferred: <rule> (P-nnn)`) or write a *Feedback* row. Then confirm the acceptance criteria and
run *A task becomes done*.

**A task becomes done:** tick each criterion the operator confirmed; `status: done`; "done
<YYYY-MM-DD>" in *Notes*, with the pull request link(s) when given; list the tasks that became ready;
when the batch is now complete, the closing question (`mechanics.md › Batches`); regenerate the views.

## `add [text]`

For work the blueprint did not produce: a bug, a chore, a spike, a refinement, a thing learned while
building.

1. Take the title and what it fixes or adds from the argument, or ask for them in one plain sentence.
   Then one `AskUserQuestion` round of at most four: **type** — the five (`bug`, `chore`, `spike`,
   `polish`, `feature`; `slicing.md › Task types`) listed in the question text, the two likeliest from
   the description as options, Other for the rest — **batch** (the current one, Recommended, or another),
   **platforms** (when there are several), **priority** (by the rule in
   `slicing.md › Priority, size, dependencies, blocking`). Derive the module from the text and name it
   in the summary; a chore may have `module: —`. Dependencies when obvious.
2. **Behaviour the blueprint lacks** (a `feature`) → ask whether it should be a blueprint capability
   first. Yes → no task: write a *Feedback to the blueprint* row and point at `/blueprint feedback`;
   the task arrives through `resync`. No → a `manual` feature task whose *Notes* say "not in the
   blueprint".
3. **Placement.** Never into a closed batch. A manual task always gets its file — no blueprint holds
   its description — with `source: manual`, its subtasks if the operator can name them now, otherwise
   one placeholder subtask and `review: needs-detail`; in a batch not yet detailed it waits there for
   `detail`. A regression in a done task is a new `bug` task that cites it.
4. Add the row to the batch table; regenerate the views. No gate.

## `plan`

Re-planning, the operator's way to change the shape without hand-editing around the checks. Every
action ends by regenerating the views; one that moves a task or a batch adds a line to the *Notes* of
the batches it touches.

| Action | What it does |
|--------|--------------|
| `plan move T-NNN <batch>` | moves a task (its row, its `batch`); checks `depends` both ways against the no-forward rule and offers to move the tasks that would break it too; into a batch not yet detailed only when no subtask is ticked — then its file stays and it waits there |
| `plan order <batch> T-a T-b …` | rewrites the order of the batch's rows |
| `plan batch new <after NN> <slug>` | a new batch at that position: the batches after it are renumbered — their files renamed (`mv`), their `STATE.json` entries (`id`, and `flow` when it says "widening of NN"), `currentBatch`, the `batch` of their tasks, the `— batch NN` statuses in `COVERAGE.md` and the "→ batch NN" lines of every batch's *Not in this batch* rewritten |
| `plan batch move <NN> <after MM>` · `plan batch rename <NN> <slug>` | the same renumbering, or a new slug and file name; a move is refused when it would make a dependency point forward |
| `plan current <NN>` | asks, then sets `currentPinned` — the current batch until that one closes, for working on a batch out of order |
| `plan drop T-NNN <reason>` | `status: dropped`, the reason in *Notes*; in the same question, every task depending on it: repoint to another task / remove the dependency / drop it too; `COVERAGE.md` `dropped: <reason>` when no other task covers the capability |
| `plan unblock T-NNN` | lifts an `ext:` blocker the operator says is gone |

A request in plain words ("move the export task to batch 4") is mapped to the action and confirmed
before it runs.

## `resync`

Run when the blueprint changed — the operator says so, or `status` showed it. Write `pending`
(`mode: resync`).

1. **What moved.** Run the blueprint checks; unrecorded edits → stop and send the operator to
   `/blueprint` first. Read the blueprint's `STATE.json`, `OPEN-QUESTIONS.md`, `DECISIONS.md`,
   `03-roadmap.md`, `02-architecture.md › Main flows` and the brief's *Surfaces*.
   - When the blueprint is `done` and its `CHANGELOG.md` has rows later than `fingerprint.updated`,
     their *Ids* and *Modules* are the change list: re-inventory only those modules, plus any whose
     fingerprint entry differs. Run the full inventory when the blueprint was not done at the last
     sync, when a row says `hand edit` or `restructure`, or when in doubt.
   - Compare with `COVERAGE.md` and the fingerprint. Resolve every capability id a task or a row
     cites:
     - **unchanged** — same module file and sub-module, same verb phrase, same `R/E/S`;
     - **renamed** — same id, new verb phrase → retitle the `COVERAGE.md` row; offer to retitle the task;
     - **regrouped** — same module file, another sub-module → update the tasks' `submodule`;
     - **moved** — same id in another module file → update the tasks' `module` and `submodule`; never
       a drop;
     - **retired** — the id is in no current module file → confirm it with the module entry's
       `removed` or a `CHANGELOG.md` row, then propose a drop;
     - **new** — an id with no row → a task to add;
     - **changed** — its `R/E/S` differs, or a Rule, Edge case or transition of it cannot be traced to
       a subtask or a *goes to* line of its detailed task(s) (a reworded rule) → the task may be stale.
   - **Stages**: an effective stage that differs from `COVERAGE.md`'s → re-prioritise, and move the
     task between detailed and outline batches.
   - **Surfaces**: a capability's surfaces differ from `COVERAGE.md`'s → a task to add for a platform
     that gained it, or one to drop; a change in the brief's surfaces table re-asks the platform map
     first.
   - **Modules**: renamed, added or now `removed` in the fingerprint → update `module` / `submodule` in
     the tasks (show the diff) and in `COVERAGE.md`; tasks of a removed module follow their
     capabilities (moved → kept, retired → the drop question); list the batch paragraphs that name the
     old module for the operator to edit.
   - **Flows**: a flow a batch cuts changed or vanished → name the batch.
   - **Questions**: for every task, compare the `Q-` part of `blocked_by` with its capabilities' open
     markers. An open question not there → propose blocking it, or marking the part provisional
     (`slicing.md › Priority, size, dependencies, blocking`) — on a done task, a `needs-review` flag
     instead, and a follow-up once the question closes differently; a question no longer open →
     unblock, with the decision's outcome next to the provisional choice the task was built on.
   - **Feedback**: for each open *Feedback to the blueprint* row, the decision, changelog row or
     capability change that answers it → close the row, and cut the task through the paths above.
   - **New decisions** → the tasks in the modules the decision names, for review.
   - **Outline batches** whose capabilities changed → propose re-cutting them.
2. **Write the report** to `PLANNING.md › Resync <YYYY-MM-DDTHH:MM>`: each change, the task(s) it
   touches, the proposed change — add task to batch NN / move to batch NN / re-prioritise / update
   module / re-detail / follow-up task / unblock / block / drop / re-cut outline batch / no change.
   Before proposing a task for a new capability, match it against open `manual` feature tasks and open
   *Feedback* rows: on the operator's confirmation, the existing task gets the capability
   (`capabilities: [id]`, `source: blueprint`) instead of a second task being added.
3. **Question rounds**, grouped by batch: accept the proposal (Recommended) / do differently / leave as
   is. Dropping a task asks about its dependents in the same question.
4. **Gate** on the report with the answers. Then **apply**:
   - a **done task is never re-detailed or dropped**: a changed capability whose task is done gets a
     follow-up task "Change <capability>: <what changed>", citing the capability and depending on the
     done task; a retired capability with a done task gets a "Remove <capability>" task, if the operator
     wants one;
   - new tasks, `source: blueprint`, never go into a closed batch: a capability that widens a flow
     already built goes to the first batch not started, one that adds a step to a flow not yet built to
     that flow's batch, a later-stage one to the outline batch of its stage; the report says why. In a
     batch not yet detailed a new task is an outline row (an id, no file); in a detailed batch a
     detailer writes its file in full (`detail`, step 2, for those rows only);
   - stale tasks get `review: needs-review`, and with the operator's agreement are re-detailed
     (`detail`, the re-detail rules of step 1);
   - unblock removes the closed id from `blocked_by` and leaves the status; when the decision differs
     from the provisional choice, the provisional subtasks are re-detailed;
   - retired → `dropped` with the reason.

   Fill each row's *Outcome* the moment its change is applied; a resumed `apply` skips the rows that
   have one.
5. Update the fingerprint, `pending: null`, regenerate the views; `STATE.json` last.
